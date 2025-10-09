import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

export default function DebugInvitations() {
  const [debug, setDebug] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDebugInfo()
  }, [])

  async function loadDebugInfo() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setDebug({ error: 'No hay usuario autenticado' })
        setLoading(false)
        return
      }

      // Obtener perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // Obtener invitaciones
      const { data: invitations, error: invError } = await supabase
        .from('project_invitations')
        .select('*')
        .or(`email.eq.${profile?.email},invited_user_id.eq.${user.id}`)

      // Obtener notificaciones
      const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)

      // Obtener colaboraciones
      const { data: collaborations } = await supabase
        .from('project_collaborators')
        .select('*')
        .eq('user_id', user.id)

      setDebug({
        user: {
          id: user.id,
          email: user.email,
        },
        profile: profile,
        invitations: invitations || [],
        invitationsError: invError,
        notifications: notifications || [],
        notificationsError: notifError,
        collaborations: collaborations || [],
      })
    } catch (error) {
      setDebug({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="alert alert-info">Cargando información de debug...</div>
  }

  return (
    <div className="card mb-4">
      <div className="card-header bg-dark text-white">
        <h5 className="mb-0">🔍 Debug - Invitaciones y Notificaciones</h5>
      </div>
      <div className="card-body">
        <pre style={{ fontSize: '11px', maxHeight: '500px', overflow: 'auto' }}>
          {JSON.stringify(debug, null, 2)}
        </pre>
        <button className="btn btn-sm btn-primary mt-2" onClick={loadDebugInfo}>
          🔄 Refrescar
        </button>
      </div>
    </div>
  )
}
