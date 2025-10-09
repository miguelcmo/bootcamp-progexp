-- ============================================
-- VERIFICAR ESTRUCTURA DE TABLAS
-- ============================================

-- 1. Verificar que la tabla project_collaborators existe
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'project_collaborators'
) as tabla_existe;

-- 2. Ver estructura de la tabla
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'project_collaborators'
ORDER BY ordinal_position;

-- 3. Ver todos los registros (sin filtros)
SELECT * FROM project_collaborators;

-- 4. Ver foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name='project_collaborators';

-- 5. Contar registros
SELECT COUNT(*) as total FROM project_collaborators;

-- 6. Verificar relación con profiles
SELECT
  pc.id,
  pc.user_id,
  pc.project_id,
  pc.role,
  p.email,
  p.full_name
FROM project_collaborators pc
LEFT JOIN profiles p ON p.id = pc.user_id;
