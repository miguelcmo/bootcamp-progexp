-- ============================================
-- CREAR TRIGGER PARA AUTO-CREAR PERFILES
-- ============================================

-- Este trigger crea automáticamente un perfil cuando un usuario se registra

-- 1. Crear la función que se ejecutará cuando se registre un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Eliminar el trigger si ya existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Crear el trigger en la tabla auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CREAR PERFILES PARA USUARIOS EXISTENTES
-- ============================================

-- Verificar usuarios sin perfil
SELECT
  u.id,
  u.email,
  u.created_at,
  CASE WHEN p.id IS NULL THEN '❌ Sin perfil' ELSE '✅ Con perfil' END as estado
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC;

-- Crear perfiles para usuarios existentes que no lo tengan
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email) as full_name,
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verificar que todos tengan perfil ahora
SELECT
  COUNT(*) as total_usuarios,
  COUNT(p.id) as usuarios_con_perfil,
  COUNT(*) - COUNT(p.id) as usuarios_sin_perfil
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id;

-- ============================================
-- ACTUALIZAR INVITACIONES EXISTENTES
-- ============================================

-- Vincular invitaciones pendientes con usuarios ahora que tienen perfil
UPDATE project_invitations pi
SET invited_user_id = p.id
FROM profiles p
WHERE pi.email = p.email
AND pi.status = 'pending'
AND pi.invited_user_id IS NULL;

-- Verificar invitaciones actualizadas
SELECT
  pi.id,
  pi.email,
  pi.invited_user_id,
  pi.status,
  p.full_name,
  proj.title as project_title
FROM project_invitations pi
LEFT JOIN profiles p ON p.id = pi.invited_user_id
LEFT JOIN projects proj ON proj.id = pi.project_id
ORDER BY pi.created_at DESC;

-- ============================================
-- CREAR NOTIFICACIONES PARA INVITACIONES EXISTENTES
-- ============================================

-- Crear notificaciones para invitaciones que ya existen pero no tienen notificación
INSERT INTO notifications (user_id, type, title, message, metadata, created_at)
SELECT
  pi.invited_user_id,
  'project_invitation',
  'Invitación a proyecto pendiente',
  COALESCE(inviter.full_name, inviter.email) || ' te ha invitado a colaborar en el proyecto "' || proj.title || '"',
  jsonb_build_object(
    'invitation_id', pi.id,
    'project_id', pi.project_id,
    'invited_by', pi.invited_by
  ),
  pi.created_at
FROM project_invitations pi
JOIN profiles inviter ON inviter.id = pi.invited_by
JOIN projects proj ON proj.id = pi.project_id
WHERE pi.status = 'pending'
AND pi.invited_user_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM notifications n
  WHERE n.user_id = pi.invited_user_id
  AND n.metadata->>'invitation_id' = pi.id::text
);

-- Verificar notificaciones creadas
SELECT
  n.id,
  n.title,
  n.message,
  n.read,
  p.email as usuario_email,
  n.created_at
FROM notifications n
JOIN profiles p ON p.id = n.user_id
ORDER BY n.created_at DESC;
