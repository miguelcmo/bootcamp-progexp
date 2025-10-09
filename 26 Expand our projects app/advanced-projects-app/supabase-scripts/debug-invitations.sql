-- ============================================
-- SCRIPT DE DEBUG - Verificar Invitaciones y Notificaciones
-- ============================================

-- 1. Ver todas las invitaciones con detalles
SELECT
  pi.id,
  pi.email,
  pi.status,
  pi.invited_user_id,
  pi.created_at,
  p.title as project_title,
  inviter.email as inviter_email,
  inviter.full_name as inviter_name,
  invited.email as invited_email,
  invited.full_name as invited_name
FROM project_invitations pi
LEFT JOIN projects p ON p.id = pi.project_id
LEFT JOIN profiles inviter ON inviter.id = pi.invited_by
LEFT JOIN profiles invited ON invited.id = pi.invited_user_id
ORDER BY pi.created_at DESC;

-- 2. Ver todas las notificaciones
SELECT
  n.id,
  n.user_id,
  n.type,
  n.title,
  n.message,
  n.read,
  n.created_at,
  p.email as user_email,
  p.full_name as user_name
FROM notifications n
LEFT JOIN profiles p ON p.id = n.user_id
ORDER BY n.created_at DESC;

-- 3. Verificar triggers activos
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('project_invitations', 'notifications', 'profiles')
ORDER BY event_object_table, trigger_name;

-- 4. Verificar políticas RLS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('project_invitations', 'notifications', 'project_collaborators')
ORDER BY tablename, policyname;

-- 5. Contar registros por tabla
SELECT
  'project_invitations' as tabla,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendientes,
  SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as aceptadas,
  SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rechazadas
FROM project_invitations
UNION ALL
SELECT
  'notifications' as tabla,
  COUNT(*) as total,
  SUM(CASE WHEN read = false THEN 1 ELSE 0 END) as no_leidas,
  SUM(CASE WHEN read = true THEN 1 ELSE 0 END) as leidas,
  NULL as rechazadas
FROM notifications
UNION ALL
SELECT
  'project_collaborators' as tabla,
  COUNT(*) as total,
  NULL as pendientes,
  NULL as aceptadas,
  NULL as rechazadas
FROM project_collaborators;

-- 6. Ver colaboradores por proyecto
SELECT
  p.title as proyecto,
  u.email as colaborador_email,
  u.full_name as colaborador_nombre,
  pc.role as rol,
  pc.added_at
FROM project_collaborators pc
JOIN projects p ON p.id = pc.project_id
JOIN profiles u ON u.id = pc.user_id
ORDER BY p.title, pc.added_at;

-- ============================================
-- PRUEBA MANUAL: Crear una invitación de prueba
-- (Descomenta y ajusta los IDs según tu base de datos)
-- ============================================

-- Primero obtén los IDs necesarios:
-- SELECT id, email FROM profiles LIMIT 5;
-- SELECT id, title FROM projects LIMIT 5;

-- Luego crea una invitación de prueba:
-- INSERT INTO project_invitations (project_id, invited_by, email, invited_user_id, status)
-- VALUES (
--   'PROYECTO_ID_AQUI',
--   'INVITER_USER_ID_AQUI',
--   'email@usuario.com',
--   'INVITED_USER_ID_AQUI',  -- Si el usuario existe, sino NULL
--   'pending'
-- );

-- ============================================
-- PRUEBA: Verificar que el trigger crea la notificación
-- ============================================

-- Después de crear la invitación, ejecuta:
-- SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;

-- ============================================
-- LIMPIEZA: Eliminar datos de prueba
-- ============================================

-- DELETE FROM project_invitations WHERE email = 'email@prueba.com';
-- DELETE FROM notifications WHERE message LIKE '%email@prueba.com%';
