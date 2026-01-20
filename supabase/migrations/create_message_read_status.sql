-- ============================================================================
-- MIGRATION: Sistema de Notificaciones con message_read_status
-- Fecha: 2026-01-20
-- Descripción: Tabla para trackear mensajes leídos por parents Y coaches
-- ============================================================================

-- ============================================================================
-- TABLA: message_read_status
-- ============================================================================
-- Tabla flexible para ambos: parents Y coaches
-- Un mensaje puede ser marcado como leído por UN parent O UN coach (no ambos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_read_status (
  messageid UUID NOT NULL,
  parentid UUID NULL,  -- Nullable: usado cuando un PARENT lee un mensaje
  coachid UUID NULL,   -- Nullable: usado cuando un COACH lee un mensaje
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- CONSTRAINT: Exactamente uno debe tener valor (XOR lógico)
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
-- ÍNDICES para Performance
-- ============================================================================

-- Índice para búsquedas por parentid (solo donde parentid no es null)
CREATE INDEX IF NOT EXISTS idx_message_read_parentid 
  ON public.message_read_status(parentid) 
  WHERE parentid IS NOT NULL;

-- Índice para búsquedas por coachid (solo donde coachid no es null)
CREATE INDEX IF NOT EXISTS idx_message_read_coachid 
  ON public.message_read_status(coachid) 
  WHERE coachid IS NOT NULL;

-- Índice para búsquedas por messageid (usado en JOINs)
CREATE INDEX IF NOT EXISTS idx_message_read_messageid 
  ON public.message_read_status(messageid);

-- ============================================================================
-- UNIQUE CONSTRAINTS (Primary Keys Compuestos)
-- ============================================================================

-- Para PARENTS: (messageid, parentid) debe ser único
-- Garantiza que un parent solo puede marcar un mensaje como leído UNA vez
CREATE UNIQUE INDEX IF NOT EXISTS message_read_status_parent_unique 
  ON public.message_read_status(messageid, parentid) 
  WHERE parentid IS NOT NULL;

-- Para COACHES: (messageid, coachid) debe ser único
-- Garantiza que un coach solo puede marcar un mensaje como leído UNA vez
CREATE UNIQUE INDEX IF NOT EXISTS message_read_status_coach_unique 
  ON public.message_read_status(messageid, coachid) 
  WHERE coachid IS NOT NULL;

-- ============================================================================
-- FUNCIÓN RPC: get_coach_unread_counts
-- ============================================================================
-- Obtiene conteos de mensajes NO LEÍDOS para un coach específico
-- Agrupa por conversación (team + parent) y retorna info legible
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
    AND m.sender_role = 'parent'  -- Solo mensajes enviados por PARENTS
    AND NOT EXISTS (
      -- Excluir mensajes ya marcados como leídos por este coach
      SELECT 1 
      FROM message_read_status mrs 
      WHERE mrs.messageid = m.id 
        AND mrs.coachid = p_coachid
    )
  GROUP BY m.teamid, m.parentid, p.firstname, p.lastname, t.name
  ORDER BY MAX(m.created_at) DESC;  -- Conversaciones más recientes primero
END;
$$;

-- ============================================================================
-- COMENTARIOS para Documentación
-- ============================================================================

COMMENT ON TABLE public.message_read_status IS 
  'Tabla para trackear mensajes leídos. Soporta tanto parents como coaches usando una estructura flexible con parentid y coachid nullable.';

COMMENT ON COLUMN public.message_read_status.messageid IS 
  'ID del mensaje marcado como leído';

COMMENT ON COLUMN public.message_read_status.parentid IS 
  'ID del parent que leyó el mensaje (NULL si fue leído por un coach)';

COMMENT ON COLUMN public.message_read_status.coachid IS 
  'ID del coach que leyó el mensaje (NULL si fue leído por un parent)';

COMMENT ON COLUMN public.message_read_status.read_at IS 
  'Timestamp de cuando el mensaje fue marcado como leído';

COMMENT ON FUNCTION get_coach_unread_counts(UUID) IS 
  'Retorna conteos de mensajes no leídos agrupados por conversación (team + parent) para un coach específico';

-- ============================================================================
-- PERMISOS (Ajustar según tus políticas RLS)
-- ============================================================================

-- Habilitar RLS en la tabla
ALTER TABLE public.message_read_status ENABLE ROW LEVEL SECURITY;

-- Política para que coaches puedan leer sus propios registros
CREATE POLICY "Coaches can read their own read status"
  ON public.message_read_status
  FOR SELECT
  USING (
    coachid = auth.uid()
  );

-- Política para que coaches puedan insertar sus propios registros
CREATE POLICY "Coaches can insert their own read status"
  ON public.message_read_status
  FOR INSERT
  WITH CHECK (
    coachid = auth.uid() AND parentid IS NULL
  );

-- Política para que parents puedan leer sus propios registros
CREATE POLICY "Parents can read their own read status"
  ON public.message_read_status
  FOR SELECT
  USING (
    parentid = auth.uid()
  );

-- Política para que parents puedan insertar sus propios registros
CREATE POLICY "Parents can insert their own read status"
  ON public.message_read_status
  FOR INSERT
  WITH CHECK (
    parentid = auth.uid() AND coachid IS NULL
  );

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
