-- ============================================
-- FIX: Políticas RLS para Tasks
-- ============================================

-- Permitir que colaboradores vean y gestionen tareas

-- 1. Verificar si la tabla tasks tiene RLS habilitado
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'tasks';

-- 2. Habilitar RLS si no está habilitado
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas antiguas
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
DROP POLICY IF EXISTS "Enable read for project members" ON tasks;
DROP POLICY IF EXISTS "Enable insert for project members" ON tasks;
DROP POLICY IF EXISTS "Enable update for project members" ON tasks;
DROP POLICY IF EXISTS "Enable delete for project members" ON tasks;

-- 4. Crear políticas para SELECT (ver tareas)
-- Los usuarios pueden ver tareas de proyectos donde son dueños o colaboradores
CREATE POLICY "Enable read access for project members"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    -- El usuario es dueño del proyecto
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND projects.user_id = auth.uid()
    )
    OR
    -- El usuario es colaborador del proyecto
    EXISTS (
      SELECT 1 FROM project_collaborators
      WHERE project_collaborators.project_id = tasks.project_id
      AND project_collaborators.user_id = auth.uid()
    )
  );

-- 5. Crear política para INSERT (crear tareas)
-- Los usuarios pueden crear tareas en proyectos donde son dueños o colaboradores
CREATE POLICY "Enable insert for project members"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND projects.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_collaborators
      WHERE project_collaborators.project_id = tasks.project_id
      AND project_collaborators.user_id = auth.uid()
    )
  );

-- 6. Crear política para UPDATE (actualizar tareas)
-- Los usuarios pueden actualizar tareas de sus proyectos
CREATE POLICY "Enable update for project members"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND projects.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_collaborators
      WHERE project_collaborators.project_id = tasks.project_id
      AND project_collaborators.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND projects.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_collaborators
      WHERE project_collaborators.project_id = tasks.project_id
      AND project_collaborators.user_id = auth.uid()
    )
  );

-- 7. Crear política para DELETE (eliminar tareas)
-- Solo dueños y admins pueden eliminar tareas
CREATE POLICY "Enable delete for project owners and admins"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND projects.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_collaborators
      WHERE project_collaborators.project_id = tasks.project_id
      AND project_collaborators.user_id = auth.uid()
      AND project_collaborators.role = 'admin'
    )
  );

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver políticas activas de tasks
SELECT
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY policyname;

-- Ver todas las tareas con información de proyectos
SELECT
  t.id,
  t.title,
  t.status,
  p.title as project_title,
  owner.email as project_owner,
  COUNT(pc.id) as collaborators_count
FROM tasks t
JOIN projects p ON p.id = t.project_id
JOIN profiles owner ON owner.id = p.user_id
LEFT JOIN project_collaborators pc ON pc.project_id = p.id
GROUP BY t.id, t.title, t.status, p.title, owner.email
ORDER BY t.created_at DESC;

-- Contar tareas por proyecto
SELECT
  p.id,
  p.title,
  owner.email as owner_email,
  COUNT(t.id) as total_tasks
FROM projects p
JOIN profiles owner ON owner.id = p.user_id
LEFT JOIN tasks t ON t.project_id = p.id
GROUP BY p.id, p.title, owner.email
ORDER BY p.title;
