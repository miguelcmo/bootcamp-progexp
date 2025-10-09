# Configuración de xAI (Grok)

## ¿Qué es xAI Grok?

xAI es la compañía de inteligencia artificial de Elon Musk. Grok es su modelo de IA de última generación, conocido por sus respuestas ingeniosas y su capacidad de análisis. Estamos usando el modelo **Grok Beta** que tiene acceso a información en tiempo real.

## Características de AI Assistant

El asistente de IA en esta aplicación puede:

1. **Generar Tareas Automáticamente**
   - Analiza el título y descripción de tu proyecto
   - Sugiere 5-8 tareas específicas y accionables
   - Permite seleccionar qué tareas agregar al proyecto
   - Regenerar sugerencias si no te convencen

2. **Analizar Progreso del Proyecto**
   - Evalúa el estado actual del proyecto
   - Sugiere próximos pasos y prioridades
   - Identifica posibles bloqueos o problemas
   - Proporciona recomendaciones personalizadas

## Cómo Obtener tu API Key de xAI

### Paso 1: Crear una Cuenta

1. Ve a [https://console.x.ai](https://console.x.ai)
2. Haz clic en "Sign Up"
3. Regístrate con tu email o cuenta de X (Twitter)
4. Verifica tu email si es necesario

### Paso 2: Generar tu API Key

1. Una vez dentro del dashboard, ve a **API Keys**
2. Haz clic en **"Create API Key"**
3. Dale un nombre descriptivo (ej. "Projects App")
4. Copia la clave generada (**importante**: solo se muestra una vez)
5. La clave empieza con `xai-`

### Paso 3: Configurar en tu Aplicación

1. En la raíz del proyecto, crea un archivo `.env` (si no existe)
2. Copia el contenido de `.env.example`
3. Reemplaza `your_groq_api_key_here` con tu clave real:

```env
VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

4. **NUNCA** compartas tu API key públicamente
5. Asegúrate de que `.env` esté en tu `.gitignore`

### Paso 4: Reiniciar el Servidor

```bash
npm run dev
```

## Uso del AI Assistant

### Generar Tareas

1. Abre cualquier proyecto
2. Haz clic en el botón **"AI Assistant"** (con icono de estrella ⭐)
3. En la pestaña "Generate Tasks", haz clic en **"Generate Task Suggestions"**
4. Espera unos segundos mientras la IA analiza tu proyecto
5. Selecciona las tareas que quieres agregar
6. Haz clic en **"Add X Selected Tasks"**

### Analizar Progreso

1. Abre un proyecto que tenga al menos algunas tareas
2. Haz clic en **"AI Assistant"**
3. Ve a la pestaña **"Analyze Progress"**
4. Haz clic en **"Analyze Project"**
5. Lee las recomendaciones y próximos pasos sugeridos

## Límites de la API

xAI ofrece créditos gratuitos al registrarte:

- **$25 en créditos gratuitos** al crear tu cuenta
- **Límite de tasa**: Generoso para desarrollo
- **Grok Beta**: Modelo más reciente y capaz

Para este proyecto, los créditos gratuitos son más que suficientes para uso personal y desarrollo.

## Solución de Problemas

### Error: "xAI API key not configured"

- Verifica que el archivo `.env` existe en la raíz del proyecto
- Asegúrate de que la variable se llama exactamente `VITE_GROQ_API_KEY`
- Verifica que la clave empieza con `xai-`
- Reinicia el servidor de desarrollo (`npm run dev`)

### Error: "Failed to generate tasks"

- Verifica que tu API key es válida
- Revisa la consola del navegador para más detalles
- Asegúrate de tener conexión a internet

### Error: Rate limit exceeded

- Espera unos minutos antes de intentar de nuevo
- El tier gratuito tiene límites de tasa

### Las sugerencias no son relevantes

- Agrega una descripción más detallada a tu proyecto
- Intenta hacer clic en "Regenerate" para obtener nuevas sugerencias
- El modelo aprende de mejor contexto

## Modelos Disponibles

Actualmente usamos **grok-beta**, el modelo más reciente de xAI:

- `grok-beta` - Modelo de última generación (recomendado)
- `grok-2-1212` - Versión específica de Grok 2
- `grok-2-vision-1212` - Incluye capacidades de visión

Puedes cambiar el modelo en `src/services/groqService.js` modificando el parámetro `model`.

## Seguridad

⚠️ **IMPORTANTE**:

- Nunca subas tu archivo `.env` a Git
- Nunca compartas tu API key públicamente
- Nunca incluyas la key en el código fuente
- Si expones tu key accidentalmente, regenerala inmediatamente en xAI Console

## Recursos Adicionales

- [Documentación de xAI](https://docs.x.ai)
- [Console de xAI](https://console.x.ai)
- [API Reference](https://docs.x.ai/api)
- [Modelos disponibles](https://docs.x.ai/docs/models)

## Funcionalidades Futuras (Ideas)

- Chat interactivo con el proyecto
- Generación de descripciones de tareas
- Sugerencias de priorización
- Análisis de tiempo estimado
- Detección de dependencias entre tareas
- Generación de documentación del proyecto
