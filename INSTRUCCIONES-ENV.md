# Instrucciones para configurar variables de entorno

Para que el dashboard funcione correctamente, necesitas crear un archivo `.env.local` en la raíz del proyecto con el siguiente contenido:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://imctturssihyvszpqplw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltY3R0dXJzc2loeXZzenBxcGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0OTM3MDcsImV4cCI6MjA3MDA2OTcwN30.3kFJJvtqnBzOlEnInK2-cPhDDMIrCW3tAMkZX80aWI4
```

## Pasos para crear el archivo:

1. Crea un archivo llamado `.env.local` en la raíz del proyecto
2. Copia y pega el contenido de arriba
3. Guarda el archivo
4. Reinicia el servidor de desarrollo (`npm run dev`)

## Verificación

Para verificar que las variables están configuradas correctamente, abre la consola del navegador y revisa si hay errores de conexión a Supabase.

## Pasos adicionales para diagnosticar

Si aún no aparecen los datos, verifica:

1. **Autenticación**: ¿Está el usuario logueado en Supabase?
2. **Tabla staff**: ¿Existe un registro en `public.staff` con `userid` que coincida con el usuario autenticado?
3. **Tabla staff_team**: ¿Hay registros activos que conecten al staff con equipos?
4. **Permisos RLS**: ¿Están deshabilitadas las políticas RLS como se especificó?

Una vez creado el archivo `.env.local`, reinicia el servidor y revisa la consola del navegador para ver si hay errores específicos.
