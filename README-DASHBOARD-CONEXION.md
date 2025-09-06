# Dashboard de Coaches - Conexión a Supabase

## Resumen de Cambios Realizados

✅ **Mock Data Eliminado**: Se removió toda la lógica mock del dashboard de coaches y se conectó a Supabase real.

✅ **Cliente Supabase Real**: Reemplazado el cliente mock por `@supabase/supabase-js` oficial usando las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

✅ **Vistas de Staff**: Implementadas consultas a las vistas `staff_my_teams_v` y `staff_my_occurrences_v` que automáticamente filtran por `auth.uid()`.

✅ **RPC para Asistencia**: Implementada la función `set_attendance_status` que maneja la lógica de marcar asistencia y crear historial.

✅ **Protección de Ruta**: Dashboard protegido con autenticación OTP. Solo coaches con registro en la tabla `staff` pueden acceder.

## Fuentes de Datos

### Equipos del Coach
- **Vista**: `staff_my_teams_v`
- **Filtro**: Automático por `auth.uid()` en la vista
- **Retorna**: Equipos asignados al coach autenticado

### Próximas Sesiones
- **Vista**: `staff_my_occurrences_v`
- **Filtro**: Automático por `auth.uid()` en la vista
- **Retorna**: Ocurrencias de sesiones en el rango de ±1 a 7 días

### Roster de Estudiantes
- **Tabla**: `enrollment` con JOIN a `student`
- **Filtro**: `teamid` y `isactive = true`
- **Retorna**: Estudiantes activos del equipo

### Asistencia
- **RPC**: `set_attendance_status`
- **Parámetros**: `p_session_id`, `p_occurrence_date`, `p_student_id`, `p_status`, `p_changed_by`
- **Funciona**: Crea/actualiza asistencia y guarda historial automáticamente

## Supuestos de Zona Horaria

- **Zona de Negocio**: America/New_York
- **Fechas en UI**: Se muestran en zona horaria del negocio
- **Almacenamiento**: Las fechas se guardan como ISO timestamps en UTC
- **Vista `staff_my_occurrences_v`**: Ya incluye fechas formateadas en zona correcta

## Separación de Roles

### Solo Cliente con Anon Key
- ✅ Todas las consultas del dashboard se ejecutan en el navegador
- ✅ Usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` y sesión OTP del usuario
- ✅ No usa service role en el dashboard

### Vistas Protegidas
- ✅ `staff_my_teams_v` y `staff_my_occurrences_v` incluyen filtro `auth.uid()`
- ✅ Con service role estas vistas retornan 0 filas (comportamiento esperado)
- ✅ Solo funcionan con usuario autenticado que tenga `staff.id` mapeado

## Flujo de Autenticación

1. **Login OTP**: Usuario ingresa email → recibe código → verifica código
2. **Verificación de Coach**: Se valida que existe `staff.id = auth.user.id`
3. **Acceso Dashboard**: Solo coaches válidos pueden ver el dashboard
4. **Sesión Persistente**: Sesión se mantiene en localStorage hasta logout/expiry

## Estados de Asistencia

- **present**: Presente
- **late**: Tardío  
- **excused**: Justificado
- **absent**: Ausente

Cada cambio de estado:
1. Llama RPC `set_attendance_status`
2. Actualiza registro en tabla `attendance`
3. Crea entrada en `attendance_history`
4. UI se actualiza automáticamente

## Verificaciones de Entorno

### Variables Requeridas (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://hlbntlhqdkbqhvlptxcb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Prerrequisitos en Supabase
- ✅ Vistas `staff_my_teams_v` y `staff_my_occurrences_v` creadas
- ✅ RPC `set_attendance_status` instalada
- ✅ Al menos un coach con `staff.id` poblado para testing

## Testing

### Para Probar Funcionalidad:

1. **Verificar Conexión**: Acceder a `http://localhost:3000` - debería mostrar login OTP
2. **Login como Coach**: Usar email de un usuario que tenga registro en `staff.id`
3. **Ver Equipos**: Dashboard debe mostrar equipos del coach autenticado
4. **Ver Sesiones**: Lista de próximas ocurrencias basada en las vistas
5. **Check-in**: Seleccionar sesión → marcar asistencias → verificar que persisten

### Debug
- Componente `DebugConnection` disponible para probar conexión a vistas
- Console logs en desarrollo para debuggear consultas
- Estados de carga y error manejados en toda la UI

## No-Regresión

- ✅ No se modificaron rutas públicas ni páginas de padres
- ✅ Dashboard de admin sigue funcionando independientemente  
- ✅ No se crearon tablas nuevas ni se modificaron defaults existentes
- ✅ Solo se usa la infraestructura de datos ya existente

## Próximos Pasos (Opcionales)

- [ ] Implementar historial de asistencia completo en UI
- [ ] Agregar métricas de uso (número de check-ins, latencia)
- [ ] Exportar reportes de asistencia por equipo/período
- [ ] Notificaciones push para recordatorios de sesiones


