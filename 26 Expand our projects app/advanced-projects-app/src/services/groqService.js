// Groq API Service (Fast, Free, Reliable)
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export async function generateTaskSuggestions(projectTitle, projectDescription) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY

  if (!apiKey) {
    throw new Error('Groq API key not configured. Please add VITE_GROQ_API_KEY to your .env file')
  }

  const prompt = `Basándote en el siguiente proyecto, sugiere 5-8 tareas específicas y accionables que ayudarían a completar este proyecto. Sé práctico y específico.

Título del Proyecto: ${projectTitle}
Descripción del Proyecto: ${projectDescription || 'Sin descripción'}

Responde ÚNICAMENTE con un array JSON de objetos de tareas. Cada tarea debe tener:
- title: string (nombre corto y accionable de la tarea EN ESPAÑOL)
- description: string (breve explicación de lo que se necesita hacer EN ESPAÑOL)

Formato de ejemplo:
[
  {"title": "Configurar repositorio del proyecto", "description": "Inicializar repositorio Git y crear la estructura inicial del proyecto"},
  {"title": "Diseñar esquema de base de datos", "description": "Crear diagrama ERD y definir todas las tablas y relaciones necesarias"}
]

Responde ÚNICAMENTE con el array JSON, sin texto adicional. IMPORTANTE: Todas las tareas deben estar en ESPAÑOL.`

  try {
    const requestBody = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }

    console.log('Sending request to Groq API...')

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    console.log('Response status:', response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Groq API Error Response:', errorData)
      console.error('Response status:', response.status, response.statusText)
      throw new Error(errorData.error?.message || errorData.message || `API Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Groq API Response:', data)

    const content = data.choices[0]?.message?.content

    if (!content) {
      console.error('No content in response:', data)
      throw new Error('No response from AI')
    }

    console.log('AI Response content:', content)

    // Parse the JSON response - handle both plain JSON and markdown code blocks
    let tasks
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      const jsonString = jsonMatch ? jsonMatch[1] : content
      tasks = JSON.parse(jsonString.trim())
    } catch (parseError) {
      console.error('Failed to parse JSON:', content)
      throw new Error('AI returned invalid JSON format')
    }

    if (!Array.isArray(tasks)) {
      throw new Error('Invalid response format from AI - expected array')
    }

    return tasks
  } catch (error) {
    console.error('Error calling Groq API:', error)
    throw error
  }
}

export async function analyzeProjectProgress(projectTitle, projectDescription, tasksData) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY

  if (!apiKey) {
    throw new Error('Groq API key not configured')
  }

  const totalTasks = tasksData.length
  const completedTasks = tasksData.filter(t => t.status === 'completada').length
  const inProgressTasks = tasksData.filter(t => t.status === 'en_progreso').length
  const pendingTasks = tasksData.filter(t => t.status === 'pendiente').length

  const prompt = `Analiza este proyecto y proporciona insights y recomendaciones EN ESPAÑOL:

Proyecto: ${projectTitle}
Descripción: ${projectDescription || 'Sin descripción'}
Total de Tareas: ${totalTasks}
Completadas: ${completedTasks}
En Progreso: ${inProgressTasks}
Pendientes: ${pendingTasks}

Tareas:
${tasksData.map(t => `- [${t.status === 'completada' ? 'x' : t.status === 'en_progreso' ? '>' : ' '}] ${t.title}: ${t.description || ''}`).join('\n')}

Proporciona un análisis breve (2-3 párrafos) cubriendo:
1. Evaluación del progreso actual
2. Próximos pasos sugeridos o prioridades
3. Posibles bloqueos o recomendaciones

Mantén la respuesta concisa y accionable. IMPORTANTE: Responde completamente EN ESPAÑOL.`

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Groq API Error:', errorData)
      throw new Error(errorData.error?.message || errorData.message || 'Failed to analyze project')
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content
    return content || 'No analysis available'
  } catch (error) {
    console.error('Error calling Groq API:', error)
    throw error
  }
}
