# Sistema de Administrador

El sistema de administrador proporciona una interfaz de solo lectura para supervisar la asistencia de todos los equipos y sesiones.

## Características Principales

### 🔐 Autenticación Separada
- Login con email y password (diferente al sistema OTP de coaches)
- Verificación de rol de administrador en la tabla `staff`
- Acceso restringido solo a usuarios con `role = 'admin'`

### 📊 Dashboard Completo
- Vista general de estadísticas de asistencia
- Monitoreo de todas las sesiones y equipos
- Organización jerárquica por equipos y sesiones

### 🔍 Funcionalidades de Visualización
- **Vista Jerárquica**: Equipos → Sesiones → Estudiantes
- **Expansión Interactiva**: Click para expandir equipos y sesiones
- **Modal de Detalles**: Vista detallada de asistencia por sesión
- **Exportación PDF**: Reporte completo organizado por equipos

## Acceso al Sistema

### URL de Acceso
```
/admin
```

### Credenciales
- **Email**: Debe existir en la tabla `admin`
- **Password**: Configurado en Supabase Auth

## Funcionalidades Detalladas

### 1. Vista Jerárquica
- **Equipos**: Organizados alfabéticamente con estadísticas generales
- **Sesiones**: Dentro de cada equipo, ordenadas por fecha
- **Estudiantes**: Lista individual de asistencia por sesión

### 2. Métricas Mostradas
- Total de sesiones
- Total de estudiantes únicos
- Promedio de asistencia general
- Estadísticas por equipo y por sesión

### 3. Interactividad
- **Expansión de Equipos**: Click en el header del equipo
- **Expansión de Sesiones**: Click en el header de la sesión
- **Modal de Detalles**: Botón "Ver Detalles" para vista completa
- **Exportación PDF**: Botón en el header principal

## Diferencias con el Coach Dashboard

| Aspecto | Coach Dashboard | Admin Dashboard |
|---------|----------------|-----------------|
| Autenticación | OTP por email | Email + Password |
| Acceso | Solo sus equipos asignados | Todos los equipos |
| Funcionalidad | Lectura y escritura | Solo lectura |
| Organización | Por sesiones individuales | Jerárquica: Equipos → Sesiones |
| Vista | Lista plana | Vista expandible anidada |
| Datos | Limitado a su rol | Vista completa del sistema |

## Estructura de Archivos

```
src/
├── features/
│   └── admin/
│       ├── api.ts          # Funciones API para datos globales
│       └── hooks.ts        # Hooks React para admin
├── components/
│   ├── admin-dashboard.tsx # Dashboard principal de admin
│   └── auth/
│       └── admin-login.tsx # Componente de login para admin
└── features/
    └── auth/
        └── useAdminAuth.ts # Hook de autenticación admin

app/
└── admin/
    └── page.tsx           # Página principal admin (/admin)
```

## Configuración Requerida

### Base de Datos
El usuario administrador debe tener:
```sql
-- En la tabla admin
INSERT INTO admin (id, email) 
VALUES ('{user_uuid}', 'admin@example.com');
```

### Supabase Auth
```sql
-- Crear usuario en Supabase Auth con email/password
-- El email debe coincidir con el email en la tabla admin
```

## Seguridad

- ✅ Verificación de admin en cada request
- ✅ Logout automático si pierde privilegios de admin
- ✅ Solo acceso de lectura a datos
- ✅ Separación completa del sistema de coaches
- ✅ Validación de autenticación en cada página

## Próximas Mejoras

- [ ] Exportación de datos a CSV/Excel
- [ ] Gráficos más detallados
- [ ] Notificaciones de baja asistencia
- [ ] Reportes automatizados
- [ ] Filtros adicionales (por estudiante, por coach, etc.)
