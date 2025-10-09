import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

export default function DashboardStats() {
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalNotes: 0,
    totalTasks: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id

      if (!userId) return

      // Obtener total de proyectos
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, status', { count: 'exact' })
        .eq('user_id', userId)

      // Obtener total de notas
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)

      // Obtener total de tareas
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)

      if (!projectsError && !notesError && !tasksError) {
        const activeProjects = projects?.filter(p => p.status === 'active').length || 0

        setStats({
          totalProjects: projects?.length || 0,
          activeProjects: activeProjects,
          totalNotes: notes?.length || 0,
          totalTasks: tasks?.length || 0
        })
      }

      setLoading(false)
    } catch (error) {
      console.error('Error al obtener estadísticas:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-3">
        <div className="text-center">
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="stats-container fade-in">
      <div className="stat-card">
        <div className="stat-card-header">
          <div>
            <div className="stat-value">{stats.totalProjects}</div>
            <div className="stat-label">Total Proyectos</div>
          </div>
          <div className="stat-icon primary">
            <i className="bi bi-folder"></i>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <div>
            <div className="stat-value">{stats.activeProjects}</div>
            <div className="stat-label">Proyectos Activos</div>
          </div>
          <div className="stat-icon success">
            <i className="bi bi-check-circle"></i>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <div>
            <div className="stat-value">{stats.totalNotes}</div>
            <div className="stat-label">Total Notas</div>
          </div>
          <div className="stat-icon warning">
            <i className="bi bi-sticky"></i>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-header">
          <div>
            <div className="stat-value">{stats.totalTasks}</div>
            <div className="stat-label">Total Tareas</div>
          </div>
          <div className="stat-icon info">
            <i className="bi bi-list-check"></i>
          </div>
        </div>
      </div>
    </div>
  )
}
