# 🧪 Script de Testing: Sistema de Notificaciones

## Pre-requisitos

Antes de comenzar los tests, asegúrate de:
- ✅ La migración SQL está ejecutada
- ✅ El servidor de desarrollo está corriendo (`npm run dev`)
- ✅ Tienes acceso al SQL Editor de Supabase
- ✅ Conoces tu `coachid` (staff.id del coach autenticado)

---

## Test Suite Completo

### 🔍 Test 0: Obtener IDs Necesarios

Ejecuta en Supabase SQL Editor para obtener los IDs que necesitarás:

```sql
-- Obtener tu coachid (staff que está logueado)
SELECT id, name, email FROM staff LIMIT 5;

-- Obtener un teamid válido
SELECT teamid, name FROM team WHERE status IN ('open', 'ongoing') LIMIT 5;

-- Obtener un parentid válido
SELECT parentid, firstname, lastname, email FROM parent LIMIT 5;

-- Verificar que el coach tiene sessions en ese team
SELECT 
  s.sessionid,
  s.teamid,
  s.coachid,
  t.name as team_name,
  st.name as coach_name
FROM session s
JOIN team t ON t.teamid = s.teamid
JOIN staff st ON st.id = s.coachid
WHERE s.coachid = 'TU_COACHID_AQUI'  -- Reemplaza con tu ID
  AND s.cancel = false
LIMIT 5;
```

**Guarda estos valores:**
- `COACH_ID`: ____________________
- `TEAM_ID`: ____________________
- `PARENT_ID`: ____________________

---

### ✅ Test 1: Verificar Estructura de Base de Datos

```sql
-- 1.1 Verificar que la tabla existe
SELECT COUNT(*) FROM message_read_status;

-- 1.2 Verificar estructura de columnas
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'message_read_status'
ORDER BY ordinal_position;

-- 1.3 Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'message_read_status';

-- 1.4 Verificar función RPC existe
SELECT 
  proname,
  prosrc
FROM pg_proc
WHERE proname = 'get_coach_unread_counts';
```

**Resultado Esperado:**
- ✅ Tabla existe con 4 columnas
- ✅ 3 índices creados
- ✅ Función RPC existe

---

### ✅ Test 2: Insertar Mensaje de Prueba de Parent

```sql
-- 2.1 Insertar mensaje simulando que un parent escribió
INSERT INTO message (teamid, sender_role, parentid, coachid, body)
VALUES (
  'TU_TEAM_ID',      -- Reemplaza
  'parent',
  'TU_PARENT_ID',    -- Reemplaza
  'TU_COACH_ID',     -- Reemplaza
  '🧪 TEST: Mensaje de prueba desde parent - ' || NOW()::text
)
RETURNING id, created_at;

-- Guarda el message.id retornado: ____________________
```

**En la Aplicación:**
1. Mira el dashboard del coach
2. **Verifica:**
   - ✅ El badge de la campana incrementó (sin reload de página)
   - ✅ Aparece el número correcto
   - ✅ En consola ves: "🔔 New message received via Realtime"

---

### ✅ Test 3: Verificar Función RPC

```sql
-- 3.1 Llamar función RPC con tu coachid
SELECT * FROM get_coach_unread_counts('TU_COACH_ID');

-- 3.2 Verificar detalles
SELECT 
  teamid,
  parentid,
  parentname,
  teamname,
  unread_count
FROM get_coach_unread_counts('TU_COACH_ID')
WHERE teamid = 'TU_TEAM_ID'
  AND parentid = 'TU_PARENT_ID';
```

**Resultado Esperado:**
- ✅ Retorna al menos 1 fila
- ✅ `unread_count` >= 1
- ✅ `parentname` y `teamname` son legibles (no NULL)

---

### ✅ Test 4: Abrir Notificación en la App

**En la Aplicación:**

1. Haz clic en el ícono de campana
2. **Verifica:**
   - ✅ Aparece dropdown con notificaciones
   - ✅ Se muestra el nombre del parent correcto
   - ✅ Se muestra el nombre del team correcto
   - ✅ El conteo es correcto

3. Haz clic en la notificación
4. **Verifica:**
   - ✅ Navega a `/messages?team=X&parent=Y`
   - ✅ Se abre el chat correcto
   - ✅ Los mensajes se cargan
   - ✅ En consola ves: "📖 Marking conversation as read"

---

### ✅ Test 5: Verificar Marca como Leído

```sql
-- 5.1 Verificar que se insertaron registros en message_read_status
SELECT 
  mrs.messageid,
  mrs.coachid,
  mrs.read_at,
  m.body,
  m.sender_role,
  m.created_at
FROM message_read_status mrs
JOIN message m ON m.id = mrs.messageid
WHERE mrs.coachid = 'TU_COACH_ID'
ORDER BY mrs.read_at DESC
LIMIT 10;

-- 5.2 Verificar que el mensaje específico está marcado
SELECT 
  mrs.messageid,
  mrs.read_at,
  m.body
FROM message_read_status mrs
JOIN message m ON m.id = mrs.messageid
WHERE mrs.messageid = 'MESSAGE_ID_DEL_TEST_2'
  AND mrs.coachid = 'TU_COACH_ID';
```

**Resultado Esperado:**
- ✅ El mensaje aparece en `message_read_status`
- ✅ `coachid` es correcto
- ✅ `parentid` es NULL
- ✅ `read_at` tiene timestamp reciente

---

### ✅ Test 6: Verificar que Badge Desapareció

**En la Aplicación:**

1. Vuelve al dashboard (botón "Back to Dashboard")
2. **Verifica:**
   - ✅ El badge de la campana disminuyó o desapareció
   - ✅ Al abrir el dropdown, esa notificación ya no aparece
   - ✅ No hay errores en consola

```sql
-- 6.1 Verificar con RPC que no hay mensajes no leídos de esa conversación
SELECT * FROM get_coach_unread_counts('TU_COACH_ID')
WHERE teamid = 'TU_TEAM_ID'
  AND parentid = 'TU_PARENT_ID';
```

**Resultado Esperado:**
- ✅ No retorna filas (o `unread_count` = 0)

---

### ✅ Test 7: Realtime - Segundo Mensaje

```sql
-- 7.1 Insertar OTRO mensaje sin recargar la página
INSERT INTO message (teamid, sender_role, parentid, coachid, body)
VALUES (
  'TU_TEAM_ID',
  'parent',
  'TU_PARENT_ID',
  'TU_COACH_ID',
  '🧪 TEST 2: Segundo mensaje de prueba - ' || NOW()::text
);
```

**En la Aplicación (SIN RECARGAR PÁGINA):**

1. **Verifica:**
   - ✅ El badge incrementa automáticamente a 1
   - ✅ En consola ves: "🔔 New message received via Realtime"
   - ✅ En consola ves: "✅ Message from parent - reloading counts"

2. Abre el dropdown
   - ✅ La notificación aparece con count = 1

---

### ✅ Test 8: Múltiples Parents

```sql
-- 8.1 Obtener otro parent diferente
SELECT parentid, firstname, lastname FROM parent 
WHERE parentid != 'TU_PARENT_ID_ANTERIOR'
LIMIT 1;

-- Guarda el nuevo PARENT_ID_2: ____________________

-- 8.2 Insertar mensaje de parent diferente
INSERT INTO message (teamid, sender_role, parentid, coachid, body)
VALUES (
  'TU_TEAM_ID',
  'parent',
  'PARENT_ID_2',    -- Diferente parent
  'TU_COACH_ID',
  '🧪 TEST 3: Mensaje de parent diferente - ' || NOW()::text
);
```

**En la Aplicación:**

1. **Verifica:**
   - ✅ Badge incrementa (ahora debe mostrar 2)
   - ✅ Dropdown muestra 2 notificaciones separadas
   - ✅ Cada una con el nombre correcto del parent

---

### ✅ Test 9: Coach Envía Mensaje (No debe notificar)

```sql
-- 9.1 Insertar mensaje de coach (no debe crear notificación)
INSERT INTO message (teamid, sender_role, parentid, coachid, body)
VALUES (
  'TU_TEAM_ID',
  'coach',          -- Coach como sender
  'TU_PARENT_ID',
  'TU_COACH_ID',
  '🧪 TEST 4: Respuesta del coach - ' || NOW()::text
);
```

**En la Aplicación:**

1. **Verifica:**
   - ✅ Badge NO incrementa
   - ✅ En consola ves: "⏭️ Message from coach - ignoring"
   - ✅ El mensaje aparece en el chat si está abierto

---

### ✅ Test 10: Performance de la Función RPC

```sql
-- 10.1 Verificar plan de ejecución
EXPLAIN ANALYZE 
SELECT * FROM get_coach_unread_counts('TU_COACH_ID');

-- 10.2 Insertar muchos mensajes de prueba
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..50 LOOP
    INSERT INTO message (teamid, sender_role, parentid, coachid, body)
    VALUES (
      'TU_TEAM_ID',
      'parent',
      'TU_PARENT_ID',
      'TU_COACH_ID',
      'Performance test message ' || i
    );
  END LOOP;
END $$;

-- 10.3 Medir tiempo de ejecución
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM get_coach_unread_counts('TU_COACH_ID');
```

**Resultado Esperado:**
- ✅ Query ejecuta en < 100ms
- ✅ Usa los índices correctamente
- ✅ No hay sequential scans en tablas grandes

---

### ✅ Test 11: Límites y Edge Cases

```sql
-- 11.1 Test: Coach sin mensajes
SELECT * FROM get_coach_unread_counts('00000000-0000-0000-0000-000000000000');
-- Esperado: 0 filas, sin error

-- 11.2 Test: Mensaje sin parent (debe fallar por constraint)
INSERT INTO message (teamid, sender_role, parentid, coachid, body)
VALUES (
  'TU_TEAM_ID',
  'parent',
  NULL,              -- NULL no permitido para parent messages
  'TU_COACH_ID',
  'Test'
);
-- Esperado: Error de constraint

-- 11.3 Test: Insertar en message_read_status con ambos NULL (debe fallar)
INSERT INTO message_read_status (messageid, parentid, coachid)
VALUES ('00000000-0000-0000-0000-000000000000', NULL, NULL);
-- Esperado: Error de CHECK constraint

-- 11.4 Test: Insertar con ambos valores (debe fallar)
INSERT INTO message_read_status (messageid, parentid, coachid)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'TU_PARENT_ID',
  'TU_COACH_ID'
);
-- Esperado: Error de CHECK constraint
```

---

### 🧹 Limpieza de Tests

```sql
-- IMPORTANTE: Ejecutar después de los tests para limpiar datos de prueba

-- 1. Eliminar registros de message_read_status de test
DELETE FROM message_read_status
WHERE coachid = 'TU_COACH_ID'
  AND messageid IN (
    SELECT id FROM message 
    WHERE body LIKE '%🧪 TEST%'
  );

-- 2. Eliminar mensajes de test
DELETE FROM message
WHERE body LIKE '%🧪 TEST%'
  OR body LIKE '%Performance test message%';

-- 3. Verificar limpieza
SELECT COUNT(*) FROM message WHERE body LIKE '%TEST%';
-- Esperado: 0
```

---

## 📊 Resultados del Test

### Checklist Final

- [ ] Test 0: IDs obtenidos correctamente
- [ ] Test 1: Estructura de BD verificada
- [ ] Test 2: Mensaje insertado y badge incrementó
- [ ] Test 3: Función RPC retorna datos correctos
- [ ] Test 4: Dropdown funciona correctamente
- [ ] Test 5: Mensajes marcados como leídos en BD
- [ ] Test 6: Badge desapareció después de leer
- [ ] Test 7: Realtime actualiza sin reload
- [ ] Test 8: Múltiples parents funcionan correctamente
- [ ] Test 9: Mensajes de coach no notifican
- [ ] Test 10: Performance es aceptable
- [ ] Test 11: Edge cases manejados correctamente
- [ ] Limpieza: Datos de test eliminados

### Métricas de Performance

- Tiempo de carga inicial: _____ ms
- Tiempo de respuesta RPC: _____ ms
- Tiempo de marcar como leído: _____ ms
- Latencia de Realtime: _____ ms

---

## 🐛 Bugs Encontrados

Si encuentras problemas, documéntalos aquí:

1. **Bug #1:**
   - Descripción:
   - Pasos para reproducir:
   - Error en consola:
   - Query SQL relacionada:

2. **Bug #2:**
   - ...

---

## ✅ Estado del Sistema

- [ ] **APROBADO** - Listo para producción
- [ ] **CON OBSERVACIONES** - Funciona pero hay mejoras necesarias
- [ ] **RECHAZADO** - Problemas críticos encontrados

**Notas finales:**

---

**Fecha del test:** _______________  
**Tester:** _______________  
**Versión:** Sistema de Notificaciones v1.0  
