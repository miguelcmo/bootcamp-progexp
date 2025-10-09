-- ============================================
-- FIX: Corregir permisos de auth.users
-- Ejecuta este script para corregir el error de permisos
-- ============================================

-- 1. Eliminar políticas antiguas que usan auth.users
DROP POLICY IF EXISTS "Users can view their own invitations" ON project_invitations;
DROP POLICY IF EXISTS "Invited users can update invitation status" ON project_invitations;

-- 2. Recrear políticas usando profiles en lugar de auth.users
CREATE POLICY "Users can view their own invitations"
  ON project_invitations FOR SELECT
  USING (
    auth.uid() = invited_by
    OR auth.uid() = invited_user_id
    OR email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

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

-- 3. Actualizar función de notificaciones para usar profiles
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

-- 4. Actualizar trigger de vincular invitaciones
DROP TRIGGER IF EXISTS trigger_link_invitation_on_signup ON profiles;

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

CREATE TRIGGER trigger_link_invitation_on_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION link_invitation_on_signup();

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'project_invitations';

-- Verificar que los triggers existen
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_create_invitation_notification',
  'trigger_link_invitation_on_signup'
);
