-- ============================================================================
-- 🔍 SCRIPT DE VERIFICACIÓN - Ejecutar DESPUÉS de EJECUTAR-PRIMERO.sql
-- ============================================================================
-- 
-- Este script verifica que la migración se ejecutó correctamente
-- Ejecuta esto en Supabase SQL Editor para diagnosticar problemas
-- 
-- ============================================================================

-- ============================================================================
-- CHECK 1: Verificar que la tabla existe
-- ============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE tablename = 'message_read_status' 
      AND schemaname = 'public'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE '✅ CHECK 1: Tabla message_read_status existe';
  ELSE
    RAISE EXCEPTION '❌ CHECK 1: Tabla message_read_status NO existe';
  END IF;
END $$;

-- ============================================================================
-- CHECK 2: Verificar columnas de la tabla
-- ============================================================================

DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'message_read_status'
    AND table_schema = 'public';
  
  IF column_count = 4 THEN
    RAISE NOTICE '✅ CHECK 2: Tabla tiene 4 columnas correctas';
  ELSE
    RAISE WARNING '⚠️ CHECK 2: Tabla tiene % columnas (esperadas: 4)', column_count;
  END IF;
END $$;

-- Mostrar detalles de las columnas
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'message_read_status'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- CHECK 3: Verificar índices
-- ============================================================================

DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'message_read_status'
    AND schemaname = 'public';
  
  IF index_count >= 3 THEN
    RAISE NOTICE '✅ CHECK 3: Tabla tiene % índices', index_count;
  ELSE
    RAISE WARNING '⚠️ CHECK 3: Tabla tiene % índices (esperados: al menos 3)', index_count;
  END IF;
END $$;

-- Mostrar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'message_read_status'
  AND schemaname = 'public';

-- ============================================================================
-- CHECK 4: Verificar función RPC
-- ============================================================================

DO $$
DECLARE
  function_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'get_coach_unread_counts'
      AND n.nspname = 'public'
  ) INTO function_exists;
  
  IF function_exists THEN
    RAISE NOTICE '✅ CHECK 4: Función get_coach_unread_counts existe';
  ELSE
    RAISE EXCEPTION '❌ CHECK 4: Función get_coach_unread_counts NO existe';
  END IF;
END $$;

-- Mostrar detalles de la función
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_coach_unread_counts'
  AND n.nspname = 'public';

-- ============================================================================
-- CHECK 5: Verificar políticas RLS
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'message_read_status'
    AND schemaname = 'public';
  
  IF policy_count >= 4 THEN
    RAISE NOTICE '✅ CHECK 5: Tabla tiene % políticas RLS', policy_count;
  ELSE
    RAISE WARNING '⚠️ CHECK 5: Tabla tiene % políticas RLS (esperadas: 4)', policy_count;
  END IF;
END $$;

-- Mostrar políticas
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'message_read_status'
  AND schemaname = 'public';

-- ============================================================================
-- CHECK 6: Verificar que RLS está habilitado
-- ============================================================================

DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'message_read_status';
  
  IF rls_enabled THEN
    RAISE NOTICE '✅ CHECK 6: RLS está habilitado en la tabla';
  ELSE
    RAISE WARNING '⚠️ CHECK 6: RLS NO está habilitado en la tabla';
  END IF;
END $$;

-- ============================================================================
-- CHECK 7: Verificar constraints
-- ============================================================================

SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.message_read_status'::regclass;

-- ============================================================================
-- CHECK 8: Test de la función RPC (requiere datos reales)
-- ============================================================================

-- Primero, obtener un coachid válido
DO $$
DECLARE
  test_coachid UUID;
  result_count INTEGER;
BEGIN
  -- Intentar obtener un coach que tenga mensajes
  SELECT DISTINCT coachid INTO test_coachid
  FROM message
  WHERE coachid IS NOT NULL
  LIMIT 1;
  
  IF test_coachid IS NOT NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '📊 Probando función con coachid: %', test_coachid;
    
    -- Llamar la función
    EXECUTE format('SELECT COUNT(*) FROM get_coach_unread_counts(%L)', test_coachid)
    INTO result_count;
    
    RAISE NOTICE '✅ CHECK 8: Función ejecuta correctamente';
    RAISE NOTICE '   Conversaciones no leídas encontradas: %', result_count;
  ELSE
    RAISE NOTICE '⚠️ CHECK 8: No hay coaches con mensajes para probar';
    RAISE NOTICE '   La función existe pero no se puede probar sin datos';
  END IF;
END $$;

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📋 RESUMEN DE VERIFICACIÓN';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Si todos los checks muestran ✅, la migración fue exitosa.';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos pasos:';
  RAISE NOTICE '1. Recarga tu aplicación web';
  RAISE NOTICE '2. Los errores en consola deberían desaparecer';
  RAISE NOTICE '3. El sistema de notificaciones debería funcionar';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ¡Listo para usar!';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- ============================================================================
-- FIN DE VERIFICACIÓN
-- ============================================================================
