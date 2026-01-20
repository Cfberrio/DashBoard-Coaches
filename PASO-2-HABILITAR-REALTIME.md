# 🔴 PASO 2: Habilitar Realtime

## ⚠️ Si ves el error: "Error subscribing to notifications channel"

Esto significa que la tabla `message_read_status` existe, pero **Realtime no está habilitado**.

---

## ✅ Solución (Escoge UNA opción)

### 🎯 OPCIÓN A: Dashboard de Supabase (Recomendado - Visual)

1. **Ve a Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Navega a Replication**
   - En el menú lateral izquierdo:
   - Click en **"Database"**
   - Luego click en **"Replication"**

3. **Busca las tablas**
   - Verás una lista de tablas con columnas
   - Busca estas 2 tablas:
     - ✅ `message` 
     - ✅ `message_read_status`

4. **Activar Realtime**
   - En la columna **"Realtime"**, activa el switch/toggle para:
     - `message` → **ON** (verde)
     - `message_read_status` → **ON** (verde)

5. **Guardar cambios**
   - Los cambios se guardan automáticamente
   - Verás un mensaje de confirmación

6. **Recarga tu app**
   - Vuelve a tu aplicación
   - Presiona F5 para recargar
   - El error debería desaparecer

---

### 🚀 OPCIÓN B: SQL (Más Rápido)

1. **Ejecuta este SQL en Supabase**
   ```sql
   ALTER PUBLICATION supabase_realtime 
   ADD TABLE public.message_read_status;
   ```

2. **IMPORTANTE:** Aunque ejecutes el SQL, DEBES hacer el Paso 4 de la Opción A
   - Ve al Dashboard → Database → Replication
   - Activa el toggle de `message_read_status`

---

## 🔍 Verificar que Funcionó

### En la Consola del Navegador (F12):

**Antes (Error):**
```
❌ Error subscribing to notifications channel
🚨 ERROR: REALTIME NO ESTÁ HABILITADO
```

**Después (Correcto):**
```
✅ Successfully subscribed to notifications channel
🔔 Setting up Realtime notifications for coach: ...
```

### Visualmente:

- ✅ No hay errores en rojo
- ✅ El ícono de campana funciona
- ✅ Si insertas un mensaje de prueba, el badge incrementa automáticamente

---

## 📸 Capturas de Referencia

### Dónde está "Replication":
```
Dashboard
  └── Database (menú lateral)
      └── Replication ← AQUÍ
```

### Cómo se ve la tabla:
```
Tabla                    | Source | Realtime
-------------------------+--------+---------
message                  |   ✓    |   🟢    ← ON
message_read_status      |   ✓    |   🟢    ← ON (activar este)
```

---

## 🐛 Troubleshooting

### Error: "No veo la tabla message_read_status en Replication"

**Causa:** La migración no se ejecutó correctamente.

**Solución:**
1. Ve a SQL Editor
2. Ejecuta: `SELECT * FROM message_read_status LIMIT 1;`
3. Si dice "table does not exist" → Vuelve a ejecutar `EJECUTAR-PRIMERO.sql`

### Error: "El toggle no se activa"

**Causa:** Problemas de permisos o caché.

**Solución:**
1. Cierra sesión en Supabase Dashboard
2. Vuelve a iniciar sesión
3. Intenta de nuevo
4. Si persiste, usa la OPCIÓN B (SQL)

### Error: "Dice que Realtime está habilitado pero sigue el error"

**Causa:** El navegador tiene caché.

**Solución:**
1. Cierra COMPLETAMENTE el navegador
2. Abre de nuevo
3. Ve a la app
4. Si persiste, limpia caché del navegador (Ctrl+Shift+Delete)

---

## ⏱️ Tiempo Estimado

- **Con Dashboard:** 2 minutos
- **Con SQL:** 30 segundos + activar toggle

---

## 🎉 Resultado Final

Cuando todo funcione correctamente:

1. ✅ No hay errores en consola
2. ✅ Ves: "Successfully subscribed to notifications channel"
3. ✅ La campana de notificaciones funciona
4. ✅ Si insertas un mensaje de prueba, el badge aparece instantáneamente
5. ✅ No necesitas recargar la página para ver nuevos mensajes

---

## 📞 Siguiente Paso

Una vez que Realtime esté habilitado:
- Prueba el sistema con un mensaje real
- Verifica que el badge incrementa automáticamente
- Confirma que al hacer click, navegas al chat correcto

**¿Todo listo?** → Sistema de notificaciones 100% funcional 🎉
