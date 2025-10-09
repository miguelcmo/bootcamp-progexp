-- ============================================
-- FIX: Políticas RLS para Colaboradores
-- ============================================

-- 1. ARREGLAR POLÍTICAS DE PROJECTS
-- Los colaboradores necesitan poder ver los proyectos donde están asignados

-- Eliminar política antigua si existe
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Collaborators can view projects" ON projects;

-- Política: Los usuarios pueden ver sus propios proyectos Y proyectos donde son colaboradores
CREATE POLICY "Users can view their projects and collaborations"
  ON projects FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    auth.uid() IN (
      SELECT user_id FROM project_collaborators
      WHERE project_id = projects.id
    )
  );

-- Política: Solo el dueño puede actualizar el proyecto
CREATE POLICY "Only owners can update projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Solo el dueño puede eliminar el proyecto
CREATE POLICY "Only owners can delete projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Política: Cualquier usuario autenticado puede crear proyectos
CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. ARREGLAR POLÍTICAS DE PROJECT_COLLABORATORS
-- Asegurar que todos puedan ver colaboradores correctamente

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Anyone can view project collaborators" ON project_collaborators;
DROP POLICY IF EXISTS "Owners and admins can add collaborators" ON project_collaborators;
DROP POLICY IF EXISTS "Owners and admins can remove collaborators" ON project_collaborators;

-- Política: Usuarios autenticados pueden ver colaboradores de proyectos
CREATE POLICY "Users can view project collaborators"
  ON project_collaborators FOR SELECT
  USING (
    -- El dueño del proyecto
    auth.uid() IN (SELECT user_id FROM projects WHERE id = project_id)
    OR
    -- Los colaboradores del proyecto
    auth.uid() IN (SELECT user_id FROM project_collaborators WHERE project_id = project_collaborators.project_id)
    OR
    -- O es un colaborador en la tabla
    auth.uid() = user_id
  );

-- Política: Solo dueños y admins pueden añadir colaboradores
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

-- Política: Solo dueños y admins pueden eliminar colaboradores
CREATE POLICY "Owners and admins can remove collaborators"
  ON project_collaborators FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM projects WHERE id = project_id
      UNION
      SELECT user_id FROM project_collaborators pc
      WHERE pc.project_id = project_collaborators.project_id
      AND pc.role IN ('owner', 'admin')
    )
  );

-- Política: Solo dueños pueden actualizar roles
CREATE POLICY "Owners can update collaborator roles"
  ON project_collaborators FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM projects WHERE id = project_id)
  )
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM projects WHERE id = project_id)
  );

-- 3. VERIFICAR QUE RLS ESTÁ HABILITADO
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver todas las políticas de projects
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY policyname;

-- Ver todas las políticas de project_collaborators
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'project_collaborators'
ORDER BY policyname;

-- ============================================
-- PRUEBA: Ver proyectos y colaboradores
-- ============================================

-- Ver proyectos con sus colaboradores
SELECT
  p.id,
  p.title,
  p.description,
  p.status,
  owner.email as owner_email,
  owner.full_name as owner_name,
  COUNT(pc.id) as total_collaborators
FROM projects p
JOIN profiles owner ON owner.id = p.user_id
LEFT JOIN project_collaborators pc ON pc.project_id = p.id
GROUP BY p.id, owner.email, owner.full_name
ORDER BY p.created_at DESC;

-- Ver todos los colaboradores con detalles
SELECT
  p.title as project_title,
  p.user_id as owner_id,
  owner.email as owner_email,
  pc.user_id as collaborator_id,
  collab.email as collaborator_email,
  collab.full_name as collaborator_name,
  pc.role,
  pc.added_at
FROM projects p
JOIN profiles owner ON owner.id = p.user_id
LEFT JOIN project_collaborators pc ON pc.project_id = p.id
LEFT JOIN profiles collab ON collab.id = pc.user_id
ORDER BY p.title, pc.added_at;
