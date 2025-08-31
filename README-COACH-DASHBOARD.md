# Coach Dashboard - Data Layer Implementation

Esta implementación conecta el Coach Dashboard con Supabase y proporciona una capa de datos completa para la gestión de asistencia de equipos deportivos.

## Características Implementadas

### 🔐 Autenticación y Autorización
- Autenticación con Supabase Auth
- Mapeo de usuarios a tabla `staff` via `userid`
- Filtrado automático por permisos de coach

### 📊 Dashboard Principal
- Vista de equipos asignados al coach
- Listado de sesiones próximas (ventana configurable)
- Estados de carga y manejo de errores

### ✅ Gestión de Asistencia
- Creación automática de registros de asistencia (seeding)
- Marcado de asistencia: presente, tarde, justificado, ausente
- Historial completo de cambios con timestamps
- Notas opcionales para cada registro

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

Las siguientes tablas deben existir en tu base de datos:

- `public.staff` - Personal/coaches
- `public.team` - Equipos
- `public.student` - Estudiantes
- `public.enrollment` - Inscripciones de estudiantes
- `public.session` - Sesiones de entrenamiento
- `public.session_occurrence` - Instancias específicas de sesiones
- `public.staff_team` - Relación coach-equipo
- `public.attendance` - Registros de asistencia
- `public.attendance_history` - Historial de cambios

### 3. Funciones RPC

Asegúrate de que estas funciones estén creadas en Supabase:

```sql
-- Crear instancias de sesión
public.create_occurrences_for_session(sessionid uuid)

-- Crear registros de asistencia para una instancia
public.seed_attendance_for_occurrence(p_occurrence_id uuid)

-- Actualizar estado de asistencia
public.set_attendance_status(
  p_occurrence_id uuid, 
  p_student_id uuid, 
  p_status attendance_status, 
  p_note text, 
  p_changed_by uuid
) -> uuid
```

## Uso de los Hooks

### Hook Principal del Dashboard

```tsx
import { useDashboard } from '@/features/coach/wiring';

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
import { useOccurrenceAttendance } from '@/features/coach/wiring';

function AttendancePanel({ occurrenceId }: { occurrenceId: string }) {
  const { students, setAttendance, isLoading } = useOccurrenceAttendance(occurrenceId);
  
  const markPresent = (studentId: string) => {
    setAttendance(studentId, 'present', 'Marcado presente por el coach');
  };
  
  return (
    <div>
      {students.map(student => (
        <div key={student.studentid}>
          <span>{student.firstname} {student.lastname}</span>
          <button onClick={() => markPresent(student.studentid)}>
            Presente
          </button>
          {/* Más botones para late, excused, absent */}
        </div>
      ))}
    </div>
  );
}
```

### Wrapper de Autenticación

```tsx
import { RequireAuth } from '@/features/coach/wiring';

function App() {
  return (
    <RequireAuth>
      <MyDashboard />
    </RequireAuth>
  );
}
```

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
  from: 'noreply@tu-dominio.com', // Actualizar aquí
  // ...
};
```

## Características de Seguridad

- **RLS Deshabilitado**: Filtrado manual por `staffid`/`teamid` en todas las consultas
- **Validación de Permisos**: Solo se muestran equipos asignados al coach
- **Auditoría**: Todos los cambios de asistencia se registran con timestamp y usuario

## Estados de Asistencia

| Estado | Descripción |
|--------|-------------|
| `present` | Estudiante presente |
| `late` | Estudiante llegó tarde |
| `excused` | Ausencia justificada |
| `absent` | Ausencia sin justificar |

## Zona Horaria

Todo el sistema usa la zona horaria de Miami (`America/New_York`) para:
- Cálculo de sesiones semanales
- Reportes de asistencia
- Timestamps en emails

## Troubleshooting

### Error: "Staff row not found"
- Verificar que el usuario autenticado tenga un registro en `public.staff`
- Verificar que `staff.userid` coincida con `auth.users.id`

### Error: "No teams found"
- Verificar registros en `staff_team` con `active = true`
- Verificar permisos del coach

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
