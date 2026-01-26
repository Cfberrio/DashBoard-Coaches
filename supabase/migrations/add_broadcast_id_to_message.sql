-- Agregar columna broadcast_id para agrupar mensajes broadcast
ALTER TABLE public.message
ADD COLUMN broadcast_id UUID;

-- Crear índice para mejorar rendimiento de queries por broadcast
CREATE INDEX idx_message_broadcast_id ON public.message(broadcast_id)
WHERE broadcast_id IS NOT NULL;

-- Comentario explicando el uso
COMMENT ON COLUMN public.message.broadcast_id IS 
'UUID compartido por todos los mensajes que fueron enviados como parte del mismo broadcast. NULL para mensajes individuales.';
