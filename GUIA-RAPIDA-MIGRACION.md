# 🚀 Guía Rápida: Ejecutar Migración SQL

## ⚠️ ¿Por qué veo errores?

Las notificaciones requieren una tabla y una función en Supabase que **aún no han sido creadas**.

---

## ✅ Solución en 5 Minutos

### Paso 1: Abrir Supabase Dashboard

1. Ve a: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Inicia sesión si no lo has hecho
3. Selecciona tu proyecto

### Paso 2: Abrir SQL Editor

1. En el menú lateral izquierdo, busca y haz click en **"SQL Editor"**
2. Verás un editor de código SQL

### Paso 3: Nueva Query

1. Haz click en el botón **"New Query"** (arriba a la derecha)
2. Se abrirá un editor en blanco

### Paso 4: Copiar el SQL

1. En tu proyecto, abre el archivo:
   ```
   supabase/migrations/EJECUTAR-PRIMERO.sql
   ```

2. Selecciona TODO el contenido del archivo
3. Copia (Ctrl+C o Cmd+C)

### Paso 5: Pegar y Ejecutar

1. Pega el contenido en el SQL Editor de Supabase (Ctrl+V o Cmd+V)
2. Haz click en el botón **"Run"** (esquina inferior derecha)
   - O presiona `Ctrl+Enter` (Windows/Linux)
   - O presiona `Cmd+Enter` (Mac)

### Paso 6: Verificar

Deberías ver mensajes en verde que dicen:

```
✅ Todas las tablas base existen
✅ ¡Migración completada exitosamente!
✅ Tabla: message_read_status creada
✅ Función: get_coach_unread_counts creada
✅ Índices: X creados
🎉 Ahora recarga tu aplicación y las notificaciones deberían funcionar
```

Si ves ❌ errores en rojo, lee el mensaje de error y:
- Verifica que copiaste TODO el contenido del archivo
- Verifica que tu proyecto tiene las tablas base (`message`, `parent`, `staff`, `team`)

### Paso 7: Recargar la App

1. Vuelve a tu aplicación
2. Recarga la página (F5 o Cmd+R)
3. Los errores deberían desaparecer
4. El ícono de campana debería funcionar correctamente

---

## 🎉 ¡Listo!

Si todo salió bien:
- ✅ No más errores en consola
- ✅ La campana de notificaciones funciona
- ✅ El badge muestra conteos correctos
- ✅ Realtime actualiza automáticamente

---

## 🐛 ¿Sigue sin funcionar?

### Error: "La tabla message no existe"

**Problema:** El schema base de mensajería no está creado.

**Solución:** Verifica que hayas ejecutado la migración del sistema de mensajería primero.

### Error: "permission denied"

**Problema:** Permisos insuficientes en Supabase.

**Solución:** 
1. Verifica que estés usando el usuario correcto
2. En el Dashboard, ve a **Settings → API** y verifica que tengas permisos de administrador

### La migración se ejecutó pero sigo viendo errores

**Solución:**
1. Cierra completamente el navegador
2. Abre de nuevo y ve a la app
3. Abre la consola (F12) y busca nuevos errores
4. Si ves "Successfully subscribed to notifications channel" ✅, está funcionando

---

## 📸 Capturas de Pantalla de Referencia

### 1. SQL Editor
```
Dashboard → SQL Editor (menú izquierdo)
```

### 2. New Query
```
Botón "New Query" arriba a la derecha
```

### 3. Run Button
```
Botón verde "Run" en la esquina inferior derecha
```

---

## ⏱️ Tiempo estimado

- **Primera vez:** 5 minutos
- **Si ya sabes dónde está todo:** 1 minuto

---

## 💡 Consejos

1. **Copia TODO el archivo** - No dejes nada afuera
2. **No modifiques el SQL** - Usa el archivo tal como está
3. **Lee los mensajes de éxito** - Te confirman que todo está bien
4. **Recarga la página** - Los cambios no se aplican hasta recargar

---

## 📞 ¿Necesitas ayuda?

Si después de seguir estos pasos sigues teniendo problemas:

1. Abre la consola del navegador (F12)
2. Toma una captura de los errores
3. Verifica que el SQL se ejecutó sin errores en Supabase
4. Revisa el archivo `INSTRUCCIONES-NOTIFICACIONES.md` para troubleshooting detallado
