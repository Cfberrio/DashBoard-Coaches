-- ============================================================================
-- 🔴 HABILITAR REALTIME - Ejecutar DESPUÉS de EJECUTAR-PRIMERO.sql
-- ============================================================================
-- 
-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard → SQL Editor
-- 2. Copia y pega este SQL
-- 3. Click en "Run"
-- 4. Después, habilita Realtime en el Dashboard (pasos abajo)
-- 
-- ============================================================================

-- Habilitar replicación para la tabla message_read_status
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_status;

-- Verificar que se agregó
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tabla message_read_status agregada a Realtime';
  RAISE NOTICE '';
  RAISE NOTICE '📋 IMPORTANTE: Ahora debes habilitar Realtime en el Dashboard:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Ve a Database → Replication (menú lateral)';
  RAISE NOTICE '2. Busca la tabla: message_read_status';
  RAISE NOTICE '3. Activa el toggle en la columna "Realtime"';
  RAISE NOTICE '4. También verifica que "message" esté habilitada';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Después recarga tu aplicación';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- FIN
-- ============================================================================
