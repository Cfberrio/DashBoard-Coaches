# Coach Dashboard - Data Layer Implementation

Esta implementación conecta el Coach Dashboard con Supabase y proporciona una capa de datos completa para la gestión de asistencia de equipos deportivos.

## Características Implementadas

### 🔐 Autenticación y Autorización

- Autenticación con Supabase Auth
- Mapeo de usuarios a tabla `staff` via `id`
- Filtrado automático por permisos de coach

### 📊 Dashboard Principal

- Vista de equipos asignados al coach
- Listado de sesiones próximas (ventana configurable)
- Estados de carga y manejo de errores

### ✅ Gestión de Asistencia

- Sistema simplificado de asistencia usando tabla `assistance`
- Marcado de asistencia: presente (assisted = true) o ausente (assisted = false)
- Actualización automática de registros existentes o creación de nuevos
- Interfaz intuitiva con botones de presente/ausente

### 📧 Reportes Semanales

- Función Edge para generar reportes automáticos
- Envío por email a coaches y administradores
- Métricas de asistencia por equipo
- Top 5 de estudiantes con más ausencias

## Estructura de Archivos

```
src/
├── lib/
│   └── supabaseClient.ts          # Cliente Supabase y helpers de auth
├── features/coach/
│   ├── types.ts                   # Tipos TypeScript del dominio
│   ├── api.ts                     # Funciones de datos (Supabase)
│   ├── hooks.ts                   # Hooks de React Query
│   ├── wiring.tsx                 # Componentes de conexión
│   └── examples.tsx               # Ejemplos de uso
supabase/
└── functions/
    └── weekly-attendance-report/
        └── index.ts               # Función Edge para reportes
```

## Variables de Entorno

Crear un archivo `.env.local` con las siguientes variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Para la función Edge de reportes
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key
```

## Instalación y Configuración

### 1. Instalar Dependencias

```bash
npm install @supabase/supabase-js @tanstack/react-query
```

### 2. Configurar Supabase

Las siguientes tablas deben existir en tu base de datos según el nuevo esquema:

- `public.staff` - Personal/coaches con campos: id, name, email, phone
- `public.team` - Equipos con campos: teamid, schoolid, description, price, participants, isactive, created_at, updated_at, name, logo
- `public.school` - Escuelas con campos: schoolid, name, location
- `public.student` - Estudiantes con campos: studentid, parentid, firstname, lastname, dob, grade, ecname, ecphone, ecrelationship, StudentDismisall
- `public.parent` - Padres con campos: parentid, firstname, lastname, email, phone
- `public.enrollment` - Inscripciones con campos: enrollmentid, studentid, teamid, isactive
- `public.session` - Sesiones con campos: sessionid, teamid, startdate, enddate, starttime, endtime, daysofweek, repeat, coachid
- `public.assistance` - Asistencia con campos: id, sessionid, studentid, assisted

### 3. Relaciones del Esquema

- Un `staff` puede ser coach de múltiples `session`
- Una `session` pertenece a un `team` y tiene un `coachid`
- Un `team` pertenece a una `school`
- Un `student` puede estar inscrito en múltiples `team` via `enrollment`
- La `assistance` registra la asistencia de un `student` en una `session`

## Uso de los Hooks

### Hook Principal del Dashboard

```tsx
import { useDashboard } from "@/features/coach/wiring";

function MyDashboard() {
  const { staff, teams, occurrences, isLoading, error } = useDashboard();

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Bienvenido, {staff?.name}</h1>
      <p>Tienes {teams.length} equipos</p>
      <p>Próximas sesiones: {occurrences.length}</p>
    </div>
  );
}
```

### Gestión de Asistencia

```tsx
import { useOccurrenceAttendance } from "@/features/coach/wiring";

function AttendancePanel({ occurrenceId }: { occurrenceId: string }) {
  const { students, setAttendance, isLoading } =
    useOccurrenceAttendance(occurrenceId);

  const markPresent = (studentId: string) => {
    setAttendance(studentId, true); // true = presente
  };

  const markAbsent = (studentId: string) => {
    setAttendance(studentId, false); // false = ausente
  };

  return (
    <div>
      {students.map((student) => (
        <div key={student.studentid}>
          <span>
            {student.firstname} {student.lastname}
          </span>
          <button onClick={() => markPresent(student.studentid)}>
            Presente
          </button>
          <button onClick={() => markAbsent(student.studentid)}>Ausente</button>
        </div>
      ))}
    </div>
  );
}
```

### Wrapper de Autenticación

```tsx
import { RequireAuth } from "@/features/coach/wiring";

function App() {
  return (
    <RequireAuth>
      <MyDashboard />
    </RequireAuth>
  );
}
```

## Flujo de Trabajo del Dashboard

### 1. Login y Autenticación

- El usuario se autentica con Supabase Auth
- Se busca su registro en la tabla `staff` usando `id`

### 2. Búsqueda de Equipos

- Se consultan las sesiones donde `coachid` coincide con el ID del staff
- Se obtienen los equipos únicos de esas sesiones
- Se incluye información de la escuela para mostrar ubicación

### 3. Selección de Sesión

- Se calculan las ocurrencias de sesión basándose en:
  - `startdate` y `enddate` de la sesión
  - `daysofweek` para determinar qué días de la semana
  - `starttime` y `endtime` para las horas

### 4. Toma de Asistencia

- Se obtiene el roster activo del equipo via tabla `enrollment`
- Se consultan los registros existentes en `assistance` para la sesión
- Se permite marcar cada estudiante como presente (assisted = true) o ausente (assisted = false)
- Los cambios se guardan automáticamente en la tabla `assistance`

## Función Edge - Reportes Semanales

### Deployment

```bash
# Subir la función
supabase functions deploy weekly-attendance-report

# Programar ejecución semanal (viernes a las 6 PM Miami)
supabase functions schedule create weekly_attendance \
  --cron "0 18 * * 5" \
  --endpoint /weekly-attendance-report
```

### Testing Manual

```bash
# Ejecutar para todos los coaches
supabase functions invoke weekly-attendance-report --no-verify-jwt

# Ejecutar para un coach específico
curl "https://your-project.supabase.co/functions/v1/weekly-attendance-report?staffId=coach-uuid"
```

### Configuración de Email

La función usa Resend para envío de emails. Configura tu dominio en Resend y actualiza la variable `from` en el código:

```typescript
const emailPayload = {
  from: "noreply@tu-dominio.com", // Actualizar aquí
  // ...
};
```

## Características de Seguridad

- **RLS Deshabilitado**: Filtrado manual por `staffid`/`teamid` en todas las consultas
- **Validación de Permisos**: Solo se muestran equipos asignados al coach
- **Auditoría**: Los cambios de asistencia se registran directamente en la tabla `assistance`

## Estados de Asistencia

| Estado     | Valor              | Descripción                      |
| ---------- | ------------------ | -------------------------------- |
| `Presente` | `assisted = true`  | Estudiante presente en la sesión |
| `Ausente`  | `assisted = false` | Estudiante ausente de la sesión  |

## Zona Horaria

Todo el sistema usa la zona horaria de Miami (`America/New_York`) para:

- Cálculo de sesiones semanales
- Reportes de asistencia
- Timestamps en emails

## Troubleshooting

### Error: "Staff row not found"

- Verificar que el usuario autenticado tenga un registro en `public.staff`
- Verificar que `staff.id` coincida con `auth.users.id`

### Error: "No teams found"

- Verificar que existan sesiones en `session` con `coachid` del usuario
- Verificar que los equipos tengan `isactive = true`

### Error: "No students found"

- Verificar que existan inscripciones activas en `enrollment` con `isactive = true`
- Verificar que los estudiantes estén correctamente vinculados

### Función Edge no envía emails

- Verificar `RESEND_API_KEY` en variables de entorno
- Verificar dominio configurado en Resend
- Revisar logs con `supabase functions logs weekly-attendance-report`

## Próximos Pasos

1. **Notificaciones Push**: Implementar notificaciones para cambios de sesión
2. **Reportes Avanzados**: Gráficos de tendencias de asistencia
3. **App Móvil**: Extensión para marcado rápido desde dispositivos móviles
4. **Integración Calendario**: Sincronización con Google Calendar o Outlook

## Soporte

Para issues y preguntas, revisar:

1. Logs de Supabase
2. Console del navegador (errores de React Query)
3. Logs de Edge Functions para reportes
