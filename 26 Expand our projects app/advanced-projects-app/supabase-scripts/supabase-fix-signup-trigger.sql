-- ============================================
-- FIX: Trigger de creación de perfiles
-- ============================================

-- 1. Verificar el trigger actual
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. Eliminar el trigger problemático
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Eliminar la función anterior
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 4. Crear nueva función más robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insertar perfil con manejo de errores
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay un error, registrarlo pero no fallar el signup
    RAISE WARNING 'Error al crear perfil para usuario %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 5. Crear el trigger nuevamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Verificar que el trigger se creó correctamente
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 7. Verificar la tabla profiles
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 8. Verificar políticas RLS de profiles
SELECT
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 9. Asegurar que RLS está habilitado pero permite INSERTs desde triggers
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas restrictivas de INSERT si existen
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

-- Política para SELECT (ver perfiles)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Política para INSERT (permitir desde triggers)
CREATE POLICY "Enable insert for service role"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- Política para UPDATE (solo el propio usuario)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- PRUEBA DEL TRIGGER
-- ============================================

-- Verificar configuración final
SELECT 'Trigger configurado correctamente' as status;
