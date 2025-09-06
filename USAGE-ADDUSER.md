# Script para Crear Usuarios en Supabase

Este script crea usuarios en Supabase Auth sin contraseña, usando solo email para autenticación OTP.

## Prerrequisitos

1. **Variables de entorno** en `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
   ```

2. **Dependencias**:
   ```bash
   npm install @supabase/supabase-js dotenv
   ```

## Uso

### Crear un usuario:
```bash
node adduser.js "email@example.com" "Nombre del Usuario" "userid-opcional"
```

### Ejemplos:
```bash
# Crear un coach con userid personalizado
node adduser.js "coach@example.com" "Coach Juan Pérez" "coach-juan-123"

# Crear un usuario simple (userid generado automáticamente)
node adduser.js "usuario@test.com" "Usuario Test"

# Solo con email (nombre opcional, userid generado automáticamente)
node adduser.js "test@example.com"

# Con userid específico para integración con tabla staff
node adduser.js "coach@example.com" "Coach Name" "staff-uuid-123"
```

## ¿Qué hace el script?

1. **Crea usuario en Supabase Auth**:
   - Sin contraseña (solo OTP)
   - Email confirmado automáticamente
   - Metadatos del usuario
   - UserID personalizado (si se proporciona)

2. **Maneja duplicados**:
   - Si el usuario ya existe, muestra su información
   - No falla si el email ya está registrado

3. **Muestra información**:
   - ID del usuario creado (personalizado o generado)
   - Email y fecha de creación
   - Estado de confirmación

## UserID Personalizado

### ¿Cuándo usar userid personalizado?

- **Integración con tabla staff**: Si ya tienes un UUID para el coach en tu tabla `staff`
- **IDs predefinidos**: Si necesitas que el ID coincida con un sistema externo
- **Consistencia**: Para mantener IDs consistentes entre diferentes sistemas

### Ejemplo de integración con staff:

```bash
# 1. Crear usuario con userid específico
node adduser.js "coach@example.com" "Coach Juan" "550e8400-e29b-41d4-a716-446655440000"

# 2. El mismo ID se puede usar en la tabla staff
# INSERT INTO staff (id, name, email) VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Coach Juan', 'coach@example.com');
```

## Verificación

Después de crear el usuario:

1. **En Supabase Dashboard**:
   - Ve a Authentication > Users
   - Busca el email del usuario creado
   - Verifica que esté confirmado

2. **En tu aplicación**:
   - Intenta hacer login con el email
   - Debería funcionar con OTP

## Troubleshooting

### Error: "Faltan variables de entorno"
- Verifica que `.env.local` existe
- Asegúrate de tener `SUPABASE_SERVICE_ROLE_KEY`

### Error: "Invalid API key"
- Verifica que la service role key sea correcta
- No uses la anon key, usa la service role key

### Error: "permission denied"
- La service role key debe tener permisos de administrador
- Verifica en Supabase Dashboard > Settings > API

## Características del usuario creado

- ✅ **Sin contraseña**: Solo se autentica con OTP
- ✅ **Email confirmado**: No necesita verificación manual
- ✅ **Metadatos incluidos**: Nombre y información adicional
- ✅ **Listo para usar**: Puede hacer login inmediatamente

## Ejemplo de salida

```
🔄 Creando usuario: coach@example.com
✅ Usuario creado exitosamente!
🆔 ID: 12345678-1234-1234-1234-123456789abc
📧 Email: coach@example.com
📅 Creado: 2024-01-15T10:30:00.000Z
✅ Email confirmado: Sí

🎉 El usuario puede hacer login con OTP usando: coach@example.com
```
