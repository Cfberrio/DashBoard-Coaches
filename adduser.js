#!/usr/bin/env node

/**
 * Script para crear un usuario en Supabase Auth sin contraseña
 * Uso: node adduser.js "email@example.com" "Nombre del Usuario" "userid-opcional"
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Obtener argumentos de línea de comandos
const [,, email, name, userid] = process.argv;

if (!email) {
  console.error('❌ Uso: node adduser.js "email@example.com" "Nombre del Usuario" "userid-opcional"');
  console.error('Ejemplos:');
  console.error('  node adduser.js "coach@example.com" "Coach Name"');
  console.error('  node adduser.js "coach@example.com" "Coach Name" "custom-user-id"');
  process.exit(1);
}

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('Asegúrate de tener en .env.local:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Cliente con service role para crear usuarios
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUser() {
  try {
    console.log(`🔄 Creando usuario: ${email}`);
    
    // Crear usuario en Supabase Auth sin contraseña
    const userData = {
      email: email,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        name: name || 'Usuario',
        created_via: 'script'
      }
    };

    // Si se proporciona userid, usarlo
    if (userid) {
      userData.id = userid;
      console.log(`🆔 Usando userid personalizado: ${userid}`);
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser(userData);

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`⚠️  Usuario ${email} ya existe en Supabase Auth`);
        
        // Obtener información del usuario existente
        const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email);
        if (existingUser.user) {
          console.log(`✅ Usuario existente encontrado: ${existingUser.user.id}`);
          console.log(`📧 Email: ${existingUser.user.email}`);
          console.log(`📅 Creado: ${existingUser.user.created_at}`);
        }
        return;
      }
      throw authError;
    }

    console.log(`✅ Usuario creado exitosamente!`);
    console.log(`🆔 ID: ${authData.user.id}`);
    console.log(`📧 Email: ${authData.user.email}`);
    console.log(`📅 Creado: ${authData.user.created_at}`);
    console.log(`✅ Email confirmado: ${authData.user.email_confirmed_at ? 'Sí' : 'No'}`);
    
    console.log(`\n🎉 El usuario puede hacer login con OTP usando: ${email}`);

  } catch (error) {
    console.error(`❌ Error creando usuario:`, error.message);
    console.error(`🔍 Error completo:`, error);
    
    if (error.message.includes('Invalid API key')) {
      console.error('💡 Verifica que SUPABASE_SERVICE_ROLE_KEY sea correcta');
    } else if (error.message.includes('permission denied')) {
      console.error('💡 Verifica que la service role key tenga permisos de administrador');
    } else if (error.message.includes('User not allowed')) {
      console.error('💡 Posibles causas:');
      console.error('   - El email ya existe con un proveedor diferente');
      console.error('   - Configuración de autenticación en Supabase');
      console.error('   - Políticas RLS que bloquean la creación');
      console.error('   - Configuración de confirmación de email requerida');
    }
  }
}

// Ejecutar el script
createUser();
