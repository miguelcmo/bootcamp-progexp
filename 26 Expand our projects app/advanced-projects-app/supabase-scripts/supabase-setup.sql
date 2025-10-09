-- ============================================
-- SISTEMA DE INVITACIONES Y NOTIFICACIONES
-- ============================================

-- 1. Tabla de invitaciones a proyectos
CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_invited_user_id ON project_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_status ON project_invitations(status);

-- 2. Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('project_invitation', 'task_assigned', 'project_update', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 3. Tabla de colaboradores de proyectos
CREATE TABLE IF NOT EXISTS project_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('owner', 'admin', 'collaborator')),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Índices para colaboradores
CREATE INDEX IF NOT EXISTS idx_project_collaborators_project_id ON project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user_id ON project_collaborators(user_id);

-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================

-- Habilitar RLS en las tablas
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

-- Políticas para project_invitations
-- Los usuarios pueden ver invitaciones que han enviado o que les han enviado
CREATE POLICY "Users can view their own invitations"
  ON project_invitations FOR SELECT
  USING (
    auth.uid() = invited_by
    OR auth.uid() = invited_user_id
    OR email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- Solo el dueño del proyecto puede crear invitaciones
CREATE POLICY "Project owners can create invitations"
  ON project_invitations FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM projects WHERE id = project_id
      UNION
      SELECT user_id FROM project_collaborators
      WHERE project_id = project_invitations.project_id
      AND role IN ('owner', 'admin')
    )
  );

-- Los usuarios invitados pueden actualizar el estado de su invitación
CREATE POLICY "Invited users can update invitation status"
  ON project_invitations FOR UPDATE
  USING (
    auth.uid() = invited_user_id
    OR email = (SELECT email FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = invited_user_id
    OR email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- Políticas para notifications
-- Los usuarios solo pueden ver sus propias notificaciones
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Permitir insertar notificaciones (esto normalmente se hará desde functions)
CREATE POLICY "Allow insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Los usuarios pueden actualizar sus propias notificaciones (marcar como leídas)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden eliminar sus propias notificaciones
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para project_collaborators
-- Cualquiera puede ver colaboradores de un proyecto
CREATE POLICY "Anyone can view project collaborators"
  ON project_collaborators FOR SELECT
  USING (true);

-- Solo dueños/admins pueden añadir colaboradores
CREATE POLICY "Owners and admins can add collaborators"
  ON project_collaborators FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM projects WHERE id = project_id
      UNION
      SELECT user_id FROM project_collaborators
      WHERE project_id = project_collaborators.project_id
      AND role IN ('owner', 'admin')
    )
  );

-- Solo dueños/admins pueden eliminar colaboradores
CREATE POLICY "Owners and admins can remove collaborators"
  ON project_collaborators FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM projects WHERE id = project_id
      UNION
      SELECT user_id FROM project_collaborators
      WHERE project_id = project_collaborators.project_id
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para crear notificación cuando se crea una invitación
CREATE OR REPLACE FUNCTION create_invitation_notification()
RETURNS TRIGGER AS $$
DECLARE
  project_name TEXT;
  inviter_name TEXT;
BEGIN
  -- Obtener nombre del proyecto
  SELECT title INTO project_name FROM projects WHERE id = NEW.project_id;

  -- Obtener nombre del invitador desde profiles
  SELECT COALESCE(full_name, email) INTO inviter_name
  FROM profiles
  WHERE id = NEW.invited_by;

  -- Si el usuario ya está registrado, crear notificación
  IF NEW.invited_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.invited_user_id,
      'project_invitation',
      'Nueva invitación a proyecto',
      inviter_name || ' te ha invitado a colaborar en el proyecto "' || project_name || '"',
      jsonb_build_object(
        'invitation_id', NEW.id,
        'project_id', NEW.project_id,
        'invited_by', NEW.invited_by
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear notificación al invitar
DROP TRIGGER IF EXISTS trigger_create_invitation_notification ON project_invitations;
CREATE TRIGGER trigger_create_invitation_notification
  AFTER INSERT ON project_invitations
  FOR EACH ROW
  EXECUTE FUNCTION create_invitation_notification();

-- Función para añadir colaborador cuando se acepta invitación
CREATE OR REPLACE FUNCTION accept_invitation()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la invitación fue aceptada
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Añadir al usuario como colaborador
    INSERT INTO project_collaborators (project_id, user_id, role)
    VALUES (NEW.project_id, NEW.invited_user_id, 'collaborator')
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para añadir colaborador al aceptar invitación
DROP TRIGGER IF EXISTS trigger_accept_invitation ON project_invitations;
CREATE TRIGGER trigger_accept_invitation
  AFTER UPDATE ON project_invitations
  FOR EACH ROW
  EXECUTE FUNCTION accept_invitation();

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en project_invitations
DROP TRIGGER IF EXISTS trigger_update_invitation_timestamp ON project_invitations;
CREATE TRIGGER trigger_update_invitation_timestamp
  BEFORE UPDATE ON project_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para asociar invited_user_id cuando se crea un perfil
CREATE OR REPLACE FUNCTION link_invitation_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar invitaciones pendientes que coincidan con el email del nuevo usuario
  UPDATE project_invitations
  SET invited_user_id = NEW.id
  WHERE email = NEW.email
  AND status = 'pending'
  AND invited_user_id IS NULL;

  -- Crear notificaciones para las invitaciones encontradas
  INSERT INTO notifications (user_id, type, title, message, metadata)
  SELECT
    NEW.id,
    'project_invitation',
    'Invitación a proyecto pendiente',
    'Tienes invitaciones pendientes a proyectos',
    jsonb_build_object('invitation_id', id, 'project_id', project_id)
  FROM project_invitations
  WHERE email = NEW.email
  AND status = 'pending'
  AND invited_user_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para vincular invitaciones cuando se crea un perfil
DROP TRIGGER IF EXISTS trigger_link_invitation_on_signup ON profiles;
CREATE TRIGGER trigger_link_invitation_on_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION link_invitation_on_signup();
