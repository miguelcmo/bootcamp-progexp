-- ============================================
-- FIX: Eliminar trigger duplicado problemático
-- ============================================

-- 1. Eliminar el trigger en auth.users (este es el que causa el error)
DROP TRIGGER IF EXISTS trigger_link_invitation_on_signup ON auth.users;

-- 2. Eliminar el trigger en profiles también (lo recrearemos correctamente)
DROP TRIGGER IF EXISTS trigger_link_invitation_on_signup ON profiles;

-- 3. Eliminar cualquier otro trigger problemático en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. Verificar que no hay triggers en auth.users
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users';

-- Debería estar vacío ahora

-- 5. Recrear SOLO el trigger en profiles (que es donde debe estar)
CREATE TRIGGER trigger_link_invitation_on_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION link_invitation_on_signup();

-- 6. Verificar triggers actuales
SELECT
  trigger_name,
  event_object_table,
  event_object_schema
FROM information_schema.triggers
WHERE trigger_name = 'trigger_link_invitation_on_signup'
OR event_object_table = 'users' AND event_object_schema = 'auth';

-- 7. Crear perfiles para usuarios existentes sin perfil
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

-- 8. Verificar resultado
SELECT
  COUNT(*) as total_usuarios,
  COUNT(p.id) as usuarios_con_perfil,
  COUNT(*) - COUNT(p.id) as usuarios_sin_perfil
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id;

SELECT '✅ Triggers corregidos. Intenta registrar un nuevo usuario ahora.' as status;
