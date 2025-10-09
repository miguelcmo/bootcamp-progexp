-- ============================================
-- CREAR PERFIL MANUALMENTE para usuarios sin perfil
-- ============================================

-- 1. Verificar qué usuarios NO tienen perfil
SELECT
  u.id,
  u.email,
  u.created_at,
  CASE WHEN p.id IS NULL THEN '❌ Sin perfil' ELSE '✅ Con perfil' END as estado
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC;

-- 2. Crear perfiles para TODOS los usuarios que no lo tengan
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT
  u.id,
  u.email,
  u.email as full_name, -- Usar email como nombre temporal
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3. Verificar que todos tienen perfil ahora
SELECT
  COUNT(*) as total_usuarios,
  COUNT(p.id) as usuarios_con_perfil,
  COUNT(*) - COUNT(p.id) as usuarios_sin_perfil
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id;

SELECT '✅ Perfiles creados correctamente' as status;
