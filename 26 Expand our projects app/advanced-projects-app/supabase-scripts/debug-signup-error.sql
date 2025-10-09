-- ============================================
-- DIAGNÓSTICO: Error al crear usuario
-- ============================================

-- 1. Ver estructura completa de la tabla profiles
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Ver todas las restricciones (constraints)
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  tc.table_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'profiles'
ORDER BY tc.constraint_type, kcu.column_name;

-- 3. Ver índices únicos
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'profiles';

-- 4. Ver triggers actuales en auth.users
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND event_object_schema = 'auth';

-- 5. Verificar si existe la función
SELECT
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'handle_new_user'
AND n.nspname = 'public';

-- 6. Ver logs recientes de errores (si están disponibles)
-- Nota: Esto podría no funcionar dependiendo de los permisos

-- 7. SOLUCIÓN ALTERNATIVA: Deshabilitar el trigger temporalmente
-- Esto permitirá que los usuarios se registren sin crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Mensaje de confirmación
SELECT 'Trigger deshabilitado. Los usuarios pueden registrarse pero deberán crear perfil manualmente' as status;

-- 8. Verificar que no hay otros triggers conflictivos
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
OR (event_object_schema = 'public' AND event_object_table = 'profiles');
