-- ============================================
-- DEBUG: Verificar Colaboradores
-- ============================================

-- 1. Ver TODOS los colaboradores en la base de datos (sin RLS)
SELECT
  pc.id,
  pc.project_id,
  pc.user_id,
  pc.role,
  pc.added_at,
  p.title as project_title,
  collab.email as collaborator_email,
  collab.full_name as collaborator_name
FROM project_collaborators pc
JOIN projects p ON p.id = pc.project_id
JOIN profiles collab ON collab.id = pc.user_id
ORDER BY pc.added_at DESC;

-- 2. Contar colaboradores por proyecto
SELECT
  p.id,
  p.title,
  owner.email as owner_email,
  COUNT(pc.id) as total_collaborators
FROM projects p
JOIN profiles owner ON owner.id = p.user_id
LEFT JOIN project_collaborators pc ON pc.project_id = p.id
GROUP BY p.id, p.title, owner.email
ORDER BY p.title;

-- 3. Ver invitaciones aceptadas (deberían haberse convertido en colaboradores)
SELECT
  pi.id,
  pi.email,
  pi.status,
  pi.invited_user_id,
  p.title as project_title,
  p.id as project_id,
  CASE
    WHEN pc.id IS NOT NULL THEN '✅ Colaborador creado'
    ELSE '❌ Falta crear colaborador'
  END as estado_colaborador
FROM project_invitations pi
JOIN projects p ON p.id = pi.project_id
LEFT JOIN project_collaborators pc ON pc.project_id = pi.project_id AND pc.user_id = pi.invited_user_id
WHERE pi.status = 'accepted'
ORDER BY pi.created_at DESC;

-- 4. Verificar trigger de aceptar invitación
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_accept_invitation';

-- 5. Verificar políticas RLS de project_collaborators
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'project_collaborators'
ORDER BY policyname;
