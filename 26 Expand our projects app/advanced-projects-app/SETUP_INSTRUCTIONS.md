# Guía de Configuración - Sistema de Invitaciones y Notificaciones

## 📋 Resumen

Este documento explica cómo configurar el sistema de invitaciones a proyectos con notificaciones en tiempo real y envío de correos electrónicos usando Supabase.

## 🗄️ Paso 1: Configurar la Base de Datos

### 1.1 Ejecutar el script SQL

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor** en el menú lateral
3. Crea una nueva query
4. Copia y pega el contenido completo del archivo `supabase-setup.sql`
5. Ejecuta el script (botón "Run" o Ctrl/Cmd + Enter)

Este script creará:
- ✅ Tabla `project_invitations` (invitaciones a proyectos)
- ✅ Tabla `notifications` (notificaciones de usuarios)
- ✅ Tabla `project_collaborators` (colaboradores de proyectos)
- ✅ Políticas RLS (Row Level Security)
- ✅ Triggers automáticos
- ✅ Funciones para automatización

### 1.2 Verificar la creación

Ejecuta esta query para verificar que las tablas se crearon correctamente:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('project_invitations', 'notifications', 'project_collaborators');
```

## 📧 Paso 2: Configurar el Envío de Correos (Edge Functions)

### 2.1 Instalar Supabase CLI

```bash
npm install -g supabase
```

### 2.2 Inicializar proyecto Supabase (si no lo has hecho)

```bash
supabase init
```

### 2.3 Crear la Edge Function

```bash
supabase functions new send-invitation-email
```

### 2.4 Editar la función

Edita el archivo generado en `supabase/functions/send-invitation-email/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

serve(async (req) => {
  try {
    const { invitationId, email, projectTitle, inviterName, isRegistered } = await req.json()

    // Configuración de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Construir el mensaje según si el usuario está registrado o no
    const subject = `Invitación a colaborar en "${projectTitle}"`

    let htmlContent = ''
    if (isRegistered) {
      htmlContent = `
        <h2>¡Has sido invitado a colaborar!</h2>
        <p><strong>${inviterName}</strong> te ha invitado a colaborar en el proyecto <strong>${projectTitle}</strong>.</p>
        <p>Inicia sesión en la plataforma para ver tu invitación y aceptarla.</p>
        <a href="${Deno.env.get('APP_URL')}" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Ir a la plataforma</a>
      `
    } else {
      htmlContent = `
        <h2>¡Te han invitado a un proyecto!</h2>
        <p><strong>${inviterName}</strong> te ha invitado a colaborar en el proyecto <strong>${projectTitle}</strong>.</p>
        <p>Regístrate en nuestra plataforma para aceptar esta invitación y comenzar a colaborar.</p>
        <a href="${Deno.env.get('APP_URL')}/register" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Registrarse</a>
      `
    }

    // Enviar correo usando Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Tu App <noreply@tudominio.com>',
        to: [email],
        subject: subject,
        html: htmlContent,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Error al enviar correo')
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
```

### 2.5 Configurar variables de entorno para la función

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **Project Settings** > **Edge Functions**
3. Añade estas variables de entorno:
   - `RESEND_API_KEY`: Tu API key de Resend (obtén una gratis en [resend.com](https://resend.com))
   - `APP_URL`: La URL de tu aplicación (ej. `http://localhost:5173` para desarrollo)

### 2.6 Desplegar la función

```bash
supabase functions deploy send-invitation-email
```

### 2.7 Alternativa: Usar SMTP nativo de Supabase

Si no quieres usar Resend, puedes configurar el SMTP directamente en Supabase:

1. Ve a **Authentication** > **Email Templates**
2. Personaliza las plantillas de correo
3. Modifica la Edge Function para usar `supabase.auth.admin.inviteUserByEmail()`

## 🔔 Paso 3: Habilitar Realtime en Supabase

### 3.1 Habilitar Realtime para la tabla de notificaciones

1. Ve a **Database** > **Replication** en Supabase Dashboard
2. Busca la tabla `notifications`
3. Activa el toggle de **Realtime**

### 3.2 Verificar permisos

Asegúrate de que las políticas RLS estén correctamente configuradas (ya incluidas en el script SQL).

## 🚀 Paso 4: Uso en la Aplicación

### 4.1 Invitar colaboradores

1. Ve a un proyecto
2. Haz clic en "Invitar Colaborador"
3. Ingresa el email del usuario
4. Se enviará:
   - ✉️ Correo electrónico de invitación
   - 🔔 Notificación en tiempo real (si el usuario está registrado)

### 4.2 Ver notificaciones

- Las notificaciones aparecen en el icono de campanita del header
- Se actualizan en tiempo real usando Supabase Realtime
- El badge muestra el número de notificaciones no leídas

### 4.3 Aceptar invitaciones

Actualmente las invitaciones se registran en la base de datos. Para implementar la funcionalidad completa de aceptar/rechazar:

1. Crea un componente `InvitationsList` que muestre las invitaciones pendientes
2. Al aceptar, actualiza el status a 'accepted' (esto automáticamente añade al usuario como colaborador)
3. Al rechazar, actualiza el status a 'rejected'

## 🔧 Solución de Problemas

### Las notificaciones no aparecen en tiempo real

- Verifica que Realtime esté habilitado para la tabla `notifications`
- Revisa la consola del navegador en busca de errores
- Asegúrate de que las políticas RLS permiten SELECT en notificaciones

### Los correos no se envían

- Verifica que la Edge Function esté desplegada correctamente
- Revisa los logs de la función: `supabase functions logs send-invitation-email`
- Confirma que la API key de Resend sea válida
- Verifica que las variables de entorno estén configuradas

### Error de permisos al invitar

- Verifica que la tabla `projects` tenga un campo `user_id`
- Asegúrate de que el usuario actual sea el dueño del proyecto
- Revisa las políticas RLS de `project_invitations`

## 📝 Próximos Pasos Recomendados

1. **Crear página de invitaciones**: Una vista donde los usuarios puedan ver y gestionar sus invitaciones
2. **Añadir permisos por rol**: Implementar diferentes niveles de acceso (owner, admin, collaborator)
3. **Notificaciones adicionales**: Expandir el sistema para otros tipos de notificaciones (tareas asignadas, comentarios, etc.)
4. **Lista de colaboradores**: Mostrar colaboradores actuales en la página del proyecto
5. **Eliminar colaboradores**: Permitir al dueño remover colaboradores

## 🆘 Soporte

Si tienes problemas:
1. Revisa la consola del navegador (F12)
2. Revisa los logs de Supabase
3. Verifica que todas las tablas y políticas estén creadas correctamente

## 📚 Referencias

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Resend Email API](https://resend.com/docs)
