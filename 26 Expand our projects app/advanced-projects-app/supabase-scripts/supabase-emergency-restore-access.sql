-- ============================================
-- RESTAURACIÓN DE EMERGENCIA - ACCESO A PROYECTOS
-- ============================================

-- IMPORTANTE: Los proyectos NO se borraron, solo perdiste acceso por las políticas RLS
-- Este script restaura el acceso inmediatamente

-- 1. Verificar que los proyectos existen (sin RLS)
SELECT COUNT(*) as total_proyectos FROM projects;

-- 2. Deshabilitar temporalmente RLS para verificar datos
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_collaborators DISABLE ROW LEVEL SECURITY;

-- Ver todos los proyectos (ahora deberías verlos)
SELECT
  id,
  title,
  description,
  user_id,
  status,
  created_at
FROM projects
ORDER BY created_at DESC;

-- 3. Habilitar RLS nuevamente
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

-- 4. Eliminar TODAS las políticas de projects para empezar de cero
DROP POLICY IF EXISTS "Users can view their projects and collaborations" ON projects;
DROP POLICY IF EXISTS "Only owners can update projects" ON projects;
DROP POLICY IF EXISTS "Only owners can delete projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Collaborators can view projects" ON projects;

-- 5. Crear política PERMISIVA para SELECT (ver proyectos)
CREATE POLICY "Enable read access for project owners and collaborators"
  ON projects FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM project_collaborators
      WHERE project_collaborators.project_id = projects.id
      AND project_collaborators.user_id = auth.uid()
    )
  );

-- 6. Crear políticas para INSERT, UPDATE, DELETE
CREATE POLICY "Enable insert for authenticated users"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for project owners"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for project owners"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Políticas para project_collaborators
DROP POLICY IF EXISTS "Users can view project collaborators" ON project_collaborators;
DROP POLICY IF EXISTS "Owners and admins can add collaborators" ON project_collaborators;
DROP POLICY IF EXISTS "Owners and admins can remove collaborators" ON project_collaborators;
DROP POLICY IF EXISTS "Owners can update collaborator roles" ON project_collaborators;

-- Política SELECT (ver colaboradores)
CREATE POLICY "Enable read access for all authenticated users"
  ON project_collaborators FOR SELECT
  TO authenticated
  USING (true);

-- Política INSERT (agregar colaboradores)
CREATE POLICY "Enable insert for project owners and admins"
  ON project_collaborators FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_collaborators.project_id
      AND projects.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_collaborators pc
      WHERE pc.project_id = project_collaborators.project_id
      AND pc.user_id = auth.uid()
      AND pc.role = 'admin'
    )
  );

-- Política DELETE (remover colaboradores)
CREATE POLICY "Enable delete for project owners and admins"
  ON project_collaborators FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_collaborators.project_id
      AND projects.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_collaborators pc
      WHERE pc.project_id = project_collaborators.project_id
      AND pc.user_id = auth.uid()
      AND pc.role = 'admin'
    )
  );

-- Política UPDATE (cambiar roles)
CREATE POLICY "Enable update for project owners"
  ON project_collaborators FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_collaborators.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_collaborators.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Ver políticas activas de projects
SELECT
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY policyname;

-- Ver políticas activas de project_collaborators
SELECT
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'project_collaborators'
ORDER BY policyname;

-- Ver tus proyectos (debería mostrarlos ahora)
SELECT
  p.id,
  p.title,
  p.description,
  p.user_id,
  owner.email as owner_email
FROM projects p
JOIN profiles owner ON owner.id = p.user_id
ORDER BY p.created_at DESC;
