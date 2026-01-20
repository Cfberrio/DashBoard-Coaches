# 📋 Instrucciones: Sistema de Notificaciones con Base de Datos

## 🎯 Resumen de Cambios

Se ha migrado el sistema de notificaciones de coaches desde localStorage a una solución persistente en Supabase usando la tabla `message_read_status`.

### Archivos Creados:
- ✅ `supabase/migrations/create_message_read_status.sql` - Migración SQL
- ✅ `src/hooks/useCoachNotifications.ts` - Hook principal

### Archivos Modificados:
- ✅ `app/page.tsx` - DashboardHeader ahora usa el nuevo hook
- ✅ `src/components/coach-dashboard.tsx` - Usa totalUnread del nuevo hook
- ✅ `src/components/notifications/NotificationsPanel.tsx` - Recibe props en lugar de context
- ✅ `src/components/coach-messages/CoachMessagesClient.tsx` - Usa markAsRead del nuevo hook

### Archivos a Deprecar (opcional):
- ⚠️ `src/contexts/NotificationsContext.tsx` - Ya no se usa (mantener temporalmente)
- ⚠️ `src/features/coach/messaging-hooks.ts::useGlobalMessageNotifications` - Ya no se usa

---

## 🚀 Pasos para Desplegar

### 1. Ejecutar la Migración SQL en Supabase

Tienes 2 opciones:

#### Opción A: Desde el Dashboard de Supabase (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido de `supabase/migrations/create_message_read_status.sql`
5. Ejecuta la query
6. Verifica que se creó la tabla y la función RPC

#### Opción B: Usando Supabase CLI

```bash
# Si tienes Supabase CLI instalado
cd /Users/cberrio04/Documents/DISCIPLINERIFT-COACH
supabase db push
```

### 2. Verificar la Tabla en Supabase

1. Ve a **Database** > **Tables**
2. Busca la tabla `message_read_status`
3. Verifica que tiene las columnas:
   - `messageid` (uuid)
   - `parentid` (uuid, nullable)
   - `coachid` (uuid, nullable)
   - `read_at` (timestamptz)

### 3. Verificar la Función RPC

1. Ve a **Database** > **Functions**
2. Busca `get_coach_unread_counts`
3. Verifica que existe

### 4. Habilitar Realtime (si no está habilitado)

1. Ve a **Database** > **Replication**
2. Asegúrate de que la tabla `message_read_status` está habilitada para Realtime
3. También verifica que `message` esté habilitada

### 5. Probar en Desarrollo

```bash
cd /Users/cberrio04/Documents/DISCIPLINERIFT-COACH
npm run dev
```

---

## 🧪 Testing Manual

### Test 1: Verificar Carga de Notificaciones

1. **Login como coach**
2. Ve al dashboard principal
3. **Verifica:**
   - ✅ El ícono de campana aparece en el header
   - ✅ No hay errores en la consola del navegador
   - ✅ Si hay mensajes no leídos, el badge aparece

### Test 2: Simular Mensaje de Parent (Usando Supabase SQL Editor)

Ejecuta este SQL en Supabase para simular un mensaje de parent:

```sql
-- Primero, obtén tu coachid, un parentid y un teamid válidos
SELECT 
  s.id as coachid,
  t.teamid,
  p.parentid
FROM staff s
CROSS JOIN team t
CROSS JOIN parent p
LIMIT 1;

-- Luego, inserta un mensaje de prueba usando esos IDs
INSERT INTO message (teamid, sender_role, parentid, coachid, body)
VALUES (
  'TU_TEAMID_AQUI',     -- Reemplaza con teamid real
  'parent',
  'TU_PARENTID_AQUI',    -- Reemplaza con parentid real
  'TU_COACHID_AQUI',     -- Reemplaza con tu coachid
  'Mensaje de prueba desde parent'
);
```

3. **Verifica en la app:**
   - ✅ El badge de notificaciones incrementa automáticamente (sin reload)
   - ✅ Al hacer clic en la campana, aparece el dropdown
   - ✅ El mensaje se muestra con el nombre correcto del parent

### Test 3: Marcar como Leído

1. **Haz clic en una notificación del dropdown**
2. **Verifica:**
   - ✅ Navegas a `/messages?team=X&parent=Y`
   - ✅ Se abre el chat correcto
   - ✅ El badge de notificaciones disminuye
   - ✅ El dropdown ya no muestra esa conversación

### Test 4: Verificar en Base de Datos

Ejecuta en Supabase SQL Editor:

```sql
-- Ver mensajes marcados como leídos
SELECT 
  mrs.messageid,
  mrs.coachid,
  mrs.read_at,
  m.body,
  m.sender_role
FROM message_read_status mrs
JOIN message m ON m.id = mrs.messageid
WHERE mrs.coachid IS NOT NULL
ORDER BY mrs.read_at DESC
LIMIT 10;
```

3. **Verifica:**
   - ✅ Los mensajes que abriste aparecen en la tabla
   - ✅ `coachid` tiene tu ID
   - ✅ `parentid` es NULL

### Test 5: Función RPC

Ejecuta en Supabase SQL Editor:

```sql
-- Reemplaza con tu coachid real
SELECT * FROM get_coach_unread_counts('TU_COACHID_AQUI');
```

**Verifica:**
- ✅ Retorna las conversaciones con mensajes no leídos
- ✅ Los conteos son correctos
- ✅ Incluye nombres de parents y teams

---

## 🐛 Troubleshooting

### Problema: "function get_coach_unread_counts does not exist"

**Solución:** La función RPC no se creó. Ejecuta solo la parte de la función del archivo SQL:

```sql
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
```

### Problema: "permission denied for table message_read_status"

**Solución:** Las políticas RLS están bloqueando el acceso. Verifica que las políticas estén creadas:

```sql
-- Ver políticas actuales
SELECT * FROM pg_policies WHERE tablename = 'message_read_status';
```

Si no existen, ejecuta las políticas del archivo SQL de migración.

### Problema: Badge no se actualiza en tiempo real

**Solución:**
1. Verifica en consola del navegador si hay conexión a Realtime
2. Busca mensajes como: "🔔 Realtime subscription status: SUBSCRIBED"
3. Si no aparece, verifica que Realtime esté habilitado en Supabase para ambas tablas

### Problema: Error al marcar como leído

**Consola muestra:** `Error inserting read status`

**Solución:**
1. Verifica que el constraint CHECK está creado correctamente
2. Asegúrate de que estás insertando `parentid: null` cuando es un coach
3. Revisa los logs de Supabase para más detalles

---

## 📊 Monitoreo en Producción

### Queries Útiles

```sql
-- Conteo total de mensajes no leídos por coach
SELECT 
  coachid,
  s.name as coach_name,
  COUNT(*) as unread_count
FROM message m
JOIN staff s ON s.id = m.coachid
WHERE m.sender_role = 'parent'
  AND NOT EXISTS (
    SELECT 1 FROM message_read_status mrs 
    WHERE mrs.messageid = m.id AND mrs.coachid = m.coachid
  )
GROUP BY m.coachid, s.name
ORDER BY unread_count DESC;

-- Mensajes marcados como leídos hoy
SELECT 
  DATE(mrs.read_at) as date,
  COUNT(*) as messages_read
FROM message_read_status mrs
WHERE mrs.coachid IS NOT NULL
  AND mrs.read_at >= CURRENT_DATE
GROUP BY DATE(mrs.read_at);

-- Performance de la función RPC
EXPLAIN ANALYZE 
SELECT * FROM get_coach_unread_counts('ALGUN_COACHID');
```

---

## 🎉 Ventajas del Nuevo Sistema

✅ **Persistencia Real:** Las notificaciones no se pierden al cerrar el navegador  
✅ **Sincronización:** Funciona entre múltiples dispositivos  
✅ **Performance:** Queries optimizadas con índices  
✅ **Escalabilidad:** Diseñado para muchos coaches y conversaciones  
✅ **Auditoría:** Timestamps de cuándo se leyó cada mensaje  
✅ **Extensible:** Fácil agregar soporte para parents después  

---

## 📝 Notas Importantes

1. **El sistema antiguo (localStorage) aún existe** en el código pero ya no se usa
2. **No se eliminaron archivos** para mantener compatibilidad temporal
3. **La tabla soporta ambos** (parents y coaches) pero solo coaches está implementado
4. **Las políticas RLS** protegen el acceso - cada coach solo ve sus propios registros
5. **Realtime está optimizado** - solo escucha eventos relevantes para cada coach

---

## 🔄 Rollback (si es necesario)

Si algo sale mal, puedes revertir los cambios:

1. **Restaurar archivos:**
```bash
git checkout HEAD -- app/page.tsx
git checkout HEAD -- src/components/coach-dashboard.tsx
git checkout HEAD -- src/components/notifications/NotificationsPanel.tsx
git checkout HEAD -- src/components/coach-messages/CoachMessagesClient.tsx
```

2. **Eliminar nuevos archivos:**
```bash
rm src/hooks/useCoachNotifications.ts
rm supabase/migrations/create_message_read_status.sql
```

3. **En Supabase SQL Editor:**
```sql
DROP FUNCTION IF EXISTS get_coach_unread_counts(UUID);
DROP TABLE IF EXISTS message_read_status CASCADE;
```

4. El sistema volverá a usar localStorage automáticamente.

---

## ✅ Checklist Final

Antes de considerar el deploy completo:

- [ ] Migración SQL ejecutada exitosamente
- [ ] Tabla `message_read_status` creada
- [ ] Función RPC `get_coach_unread_counts` funciona
- [ ] Políticas RLS configuradas
- [ ] Realtime habilitado en ambas tablas
- [ ] Test 1: Badge aparece correctamente
- [ ] Test 2: Realtime actualiza sin reload
- [ ] Test 3: Marcar como leído funciona
- [ ] Test 4: Registros aparecen en BD
- [ ] Test 5: Función RPC retorna datos correctos
- [ ] No hay errores en consola del navegador
- [ ] No hay errores en logs de Supabase

---

**¿Preguntas o problemas?** Revisa la sección de Troubleshooting o verifica los logs en:
- Browser DevTools Console
- Supabase Dashboard > Logs > Edge Functions
- Supabase Dashboard > Logs > Database
