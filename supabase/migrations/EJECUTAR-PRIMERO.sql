-- ============================================================================
-- ⚠️ EJECUTAR ESTE SQL EN SUPABASE DASHBOARD - SQL EDITOR
-- ============================================================================
-- 
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en https://supabase.com/dashboard
-- 2. Click en "SQL Editor" en el menú lateral
-- 3. Click en "New Query"
-- 4. Copia y pega TODO este archivo
-- 5. Click en "Run" (o presiona Ctrl+Enter)
-- 6. Verifica que no haya errores en rojo
-- 
-- Si todo sale bien, verás: "Success. No rows returned"
-- 
-- ============================================================================

-- PASO 1: Verificar que las tablas necesarias existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'message') THEN
        RAISE EXCEPTION 'ERROR: La tabla "message" no existe. Verifica que el schema de mensajería esté creado.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'parent') THEN
        RAISE EXCEPTION 'ERROR: La tabla "parent" no existe. Verifica el schema base.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'staff') THEN
        RAISE EXCEPTION 'ERROR: La tabla "staff" no existe. Verifica el schema base.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'team') THEN
        RAISE EXCEPTION 'ERROR: La tabla "team" no existe. Verifica el schema base.';
    END IF;
    
    RAISE NOTICE '✅ Todas las tablas base existen';
END $$;

-- ============================================================================
-- PASO 2: Crear la tabla message_read_status
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_read_status (
  messageid UUID NOT NULL,
  parentid UUID NULL,
  coachid UUID NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- CONSTRAINT: Exactamente uno debe tener valor
  CONSTRAINT message_read_status_check CHECK (
    (parentid IS NOT NULL AND coachid IS NULL) OR
    (parentid IS NULL AND coachid IS NOT NULL)
  ),
  
  -- FOREIGN KEYS
  CONSTRAINT message_read_status_messageid_fkey 
    FOREIGN KEY (messageid) REFERENCES message(id) ON DELETE CASCADE,
  CONSTRAINT message_read_status_parentid_fkey 
    FOREIGN KEY (parentid) REFERENCES parent(parentid) ON DELETE CASCADE,
  CONSTRAINT message_read_status_coachid_fkey 
    FOREIGN KEY (coachid) REFERENCES staff(id) ON DELETE CASCADE
);

-- ============================================================================
-- PASO 3: Crear índices para performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_message_read_parentid 
  ON public.message_read_status(parentid) 
  WHERE parentid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_message_read_coachid 
  ON public.message_read_status(coachid) 
  WHERE coachid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_message_read_messageid 
  ON public.message_read_status(messageid);

-- ============================================================================
-- PASO 4: Crear unique constraints
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS message_read_status_parent_unique 
  ON public.message_read_status(messageid, parentid) 
  WHERE parentid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS message_read_status_coach_unique 
  ON public.message_read_status(messageid, coachid) 
  WHERE coachid IS NOT NULL;

-- ============================================================================
-- PASO 5: Crear función RPC para coaches
-- ============================================================================

CREATE OR REPLACE FUNCTION get_coach_unread_counts(p_coachid UUID)
RETURNS TABLE (
  teamid UUID,
  parentid UUID,
  parentname TEXT,
  teamname TEXT,
  unread_count BIGINT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.teamid,
    m.parentid,
    CONCAT(p.firstname, ' ', p.lastname) AS parentname,
    t.name AS teamname,
    COUNT(*)::BIGINT AS unread_count
  FROM message m
  INNER JOIN parent p ON p.parentid = m.parentid
  INNER JOIN team t ON t.teamid = m.teamid
  WHERE m.coachid = p_coachid
    AND m.sender_role = 'parent'
    AND NOT EXISTS (
      SELECT 1 
      FROM message_read_status mrs 
      WHERE mrs.messageid = m.id 
        AND mrs.coachid = p_coachid
    )
  GROUP BY m.teamid, m.parentid, p.firstname, p.lastname, t.name
  ORDER BY MAX(m.created_at) DESC;
END;
$$;

-- ============================================================================
-- PASO 6: Habilitar RLS en la tabla
-- ============================================================================

ALTER TABLE public.message_read_status ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 7: Crear políticas RLS para coaches
-- ============================================================================

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Coaches can read their own read status" ON public.message_read_status;
DROP POLICY IF EXISTS "Coaches can insert their own read status" ON public.message_read_status;
DROP POLICY IF EXISTS "Parents can read their own read status" ON public.message_read_status;
DROP POLICY IF EXISTS "Parents can insert their own read status" ON public.message_read_status;

-- Política para que coaches puedan leer sus propios registros
CREATE POLICY "Coaches can read their own read status"
  ON public.message_read_status
  FOR SELECT
  USING (coachid = auth.uid());

-- Política para que coaches puedan insertar sus propios registros
CREATE POLICY "Coaches can insert their own read status"
  ON public.message_read_status
  FOR INSERT
  WITH CHECK (coachid = auth.uid() AND parentid IS NULL);

-- Política para que parents puedan leer sus propios registros (futuro)
CREATE POLICY "Parents can read their own read status"
  ON public.message_read_status
  FOR SELECT
  USING (parentid = auth.uid());

-- Política para que parents puedan insertar sus propios registros (futuro)
CREATE POLICY "Parents can insert their own read status"
  ON public.message_read_status
  FOR INSERT
  WITH CHECK (parentid = auth.uid() AND coachid IS NULL);

-- ============================================================================
-- PASO 8: Verificación final
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
  function_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Verificar tabla
  SELECT COUNT(*) INTO table_count
  FROM pg_tables 
  WHERE tablename = 'message_read_status';
  
  IF table_count = 0 THEN
    RAISE EXCEPTION '❌ La tabla message_read_status no se creó correctamente';
  END IF;
  
  -- Verificar función
  SELECT COUNT(*) INTO function_count
  FROM pg_proc 
  WHERE proname = 'get_coach_unread_counts';
  
  IF function_count = 0 THEN
    RAISE EXCEPTION '❌ La función get_coach_unread_counts no se creó correctamente';
  END IF;
  
  -- Verificar índices
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE tablename = 'message_read_status';
  
  IF index_count < 3 THEN
    RAISE WARNING '⚠️ Se esperaban al menos 3 índices, se encontraron %', index_count;
  END IF;
  
  RAISE NOTICE '✅ ¡Migración completada exitosamente!';
  RAISE NOTICE '✅ Tabla: message_read_status creada';
  RAISE NOTICE '✅ Función: get_coach_unread_counts creada';
  RAISE NOTICE '✅ Índices: % creados', index_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Ahora recarga tu aplicación y las notificaciones deberían funcionar';
END $$;

-- ============================================================================
-- FIN - Si llegaste aquí sin errores, ¡todo está listo!
-- ============================================================================
