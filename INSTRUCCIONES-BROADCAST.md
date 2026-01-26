# Instrucciones para Habilitar Sistema de Broadcast

## 1. Ejecutar Migración en Supabase

Para habilitar el sistema de mensajes broadcast, necesitas ejecutar la migración SQL en tu base de datos de Supabase.

### Opción A: Desde el Dashboard de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido del archivo: `supabase/migrations/add_broadcast_id_to_message.sql`
5. Ejecuta la query (RUN)

### Opción B: Usando Supabase CLI

```bash
# Asegúrate de estar en el directorio del proyecto
cd /Users/cberrio04/Documents/DISCIPLINERIFT-COACH

# Ejecuta la migración
supabase db push
```

## 2. Verificar la Migración

Después de ejecutar la migración, verifica que se haya aplicado correctamente:

```sql
-- Verifica que la columna broadcast_id existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'message' AND column_name = 'broadcast_id';

-- Verifica que el índice se haya creado
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'message' AND indexname = 'idx_message_broadcast_id';
```

## 3. Testing Manual

### 3.1 Enviar un Broadcast

1. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Ve a `/messages` en tu navegador

3. Cambia al tab **"Mensajes de Team"**

4. Selecciona un team que tenga parents (con estudiantes inscritos)

5. Escribe un mensaje y presiona **"Enviar a N parents"**

6. Deberías ver un mensaje de éxito mostrando a cuántos parents se envió

### 3.2 Verificar en la Base de Datos

Después de enviar un broadcast, verifica en Supabase:

```sql
-- Ver los últimos broadcasts enviados
SELECT 
    broadcast_id,
    COUNT(*) as recipients,
    body,
    created_at
FROM message
WHERE broadcast_id IS NOT NULL
  AND sender_role = 'coach'
GROUP BY broadcast_id, body, created_at
ORDER BY created_at DESC
LIMIT 10;

-- Ver todos los mensajes de un broadcast específico
SELECT 
    id,
    teamid,
    sender_role,
    parentid,
    coachid,
    body,
    created_at
FROM message
WHERE broadcast_id = 'TU_BROADCAST_ID_AQUI'
ORDER BY created_at;
```

### 3.3 Ver el Historial

1. En el tab **"Mensajes de Team"**, desplázate hacia abajo

2. Deberías ver el historial de broadcasts enviados con:
   - El texto del mensaje
   - La fecha y hora de envío
   - El número de parents a los que se envió
   - El número de respuestas (si hay)

### 3.4 Simular Respuesta de Parent

Para probar que las respuestas funcionan correctamente:

```sql
-- Inserta una respuesta simulada de un parent al broadcast
INSERT INTO message (teamid, sender_role, parentid, coachid, body, broadcast_id)
VALUES (
    'TU_TEAM_ID',
    'parent',
    'TU_PARENT_ID',
    'TU_COACH_ID',
    'Gracias por la información!',
    'EL_BROADCAST_ID_QUE_ENVIASTE'
);
```

Después de insertar esta respuesta:
1. El contador de respuestas en el historial debería actualizarse
2. El coach debería ver esta conversación en el tab "Mensajes Individuales"

## 4. Troubleshooting

### Error: "No parents found for this team"

**Causa:** El team no tiene estudiantes inscritos o los estudiantes no tienen parents asignados.

**Solución:**
```sql
-- Verifica que hay enrollments activos
SELECT COUNT(*) 
FROM enrollment 
WHERE teamid = 'TU_TEAM_ID' AND isactive = true;

-- Verifica que los estudiantes tienen parents
SELECT s.studentid, s.firstname, s.lastname, p.parentid, p.firstname, p.lastname
FROM enrollment e
JOIN student s ON e.studentid = s.studentid
LEFT JOIN parent p ON s.parentid = p.parentid
WHERE e.teamid = 'TU_TEAM_ID' AND e.isactive = true;
```

### Error: "broadcast_id column does not exist"

**Causa:** La migración no se ejecutó correctamente.

**Solución:** Vuelve a ejecutar la migración del paso 1.

### Los mensajes no aparecen en tiempo real

**Causa:** Realtime podría no estar habilitado para la tabla message.

**Solución:**
```sql
-- Verifica que Realtime está habilitado
ALTER PUBLICATION supabase_realtime ADD TABLE message;
```

## 5. Características Implementadas

✅ **Tab "Mensajes de Team":** Permite enviar mensajes a todos los parents de un team simultáneamente

✅ **Broadcast ID:** Todos los mensajes de un mismo broadcast comparten un UUID único

✅ **Contador de Recipients:** Muestra a cuántos parents se envió el mensaje

✅ **Historial de Broadcasts:** Lista de todos los broadcasts enviados con fecha, hora y estadísticas

✅ **Contador de Respuestas:** Muestra cuántos parents han respondido a cada broadcast

✅ **Conversaciones Individuales:** Las respuestas de parents aparecen en el tab "Mensajes Individuales" como conversaciones 1-on-1

✅ **Notificaciones:** Los parents reciben notificaciones individuales (no grupales)

## 6. Próximos Pasos

- Probar el envío de broadcasts con teams de diferentes tamaños
- Verificar que las notificaciones funcionan correctamente
- Probar respuestas de parents y seguimiento en mensajes individuales
- Realizar testing de performance con broadcasts a muchos parents
