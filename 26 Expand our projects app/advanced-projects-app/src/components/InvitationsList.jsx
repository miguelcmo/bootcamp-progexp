import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

export default function InvitationsList() {
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    loadInvitations()
    setupRealtimeSubscription()
  }, [])

  async function loadInvitations() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Obtener el email del usuario desde profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single()

      if (!profile) return

      // Obtener invitaciones pendientes
      const { data, error } = await supabase
        .from('project_invitations')
        .select(`
          *,
          projects (
            id,
            title,
            description,
            status
          )
        `)
        .eq('email', profile.email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Enriquecer con información del invitador
      if (data && data.length > 0) {
        const inviterIds = [...new Set(data.map((inv) => inv.invited_by))]

        const { data: inviters } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', inviterIds)

        // Crear un mapa de invitadores
        const inviterMap = {}
        inviters?.forEach((inv) => {
          inviterMap[inv.id] = inv
        })

        // Agregar información del invitador a cada invitación
        const enrichedData = data.map((invitation) => ({
          ...invitation,
          inviter: inviterMap[invitation.invited_by] || null,
        }))

        setInvitations(enrichedData)
      } else {
        setInvitations([])
      }
    } catch (error) {
      console.error('Error al cargar invitaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  function setupRealtimeSubscription() {
    const channel = supabase
      .channel('invitations-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_invitations',
        },
        (payload) => {
          console.log('Cambio en invitaciones:', payload)
          loadInvitations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  async function handleAcceptInvitation(invitationId) {
    setProcessingId(invitationId)
    try {
      const { error } = await supabase
        .from('project_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId)

      if (error) throw error

      // Recargar invitaciones
      await loadInvitations()

      // Mostrar modal de éxito
      console.log('Mostrando modal de éxito')
      setSuccessMessage('¡Invitación aceptada! Ahora eres colaborador del proyecto.')
      setShowSuccessModal(true)
      console.log('showSuccessModal:', true)
    } catch (error) {
      console.error('Error al aceptar invitación:', error)
      setSuccessMessage('Error al aceptar la invitación: ' + error.message)
      setShowSuccessModal(true)
    } finally {
      setProcessingId(null)
    }
  }

  console.log('showSuccessModal actual:', showSuccessModal)
  console.log('successMessage actual:', successMessage)

  async function handleRejectInvitation(invitationId) {
    setProcessingId(invitationId)
    try {
      const { error } = await supabase
        .from('project_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitationId)

      if (error) throw error

      // Recargar invitaciones
      await loadInvitations()
    } catch (error) {
      console.error('Error al rechazar invitación:', error)
      alert('Error al rechazar la invitación: ' + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="content-card">
        <div className="content-card-title">
          <i className="bi bi-envelope"></i>
          Invitaciones Pendientes
        </div>
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    )
  }

  if (invitations.length === 0 && !showSuccessModal) {
    return null
  }

  return (
    <div className="content-card">
      <div className="content-card-title">
        <i className="bi bi-envelope"></i>
        Invitaciones Pendientes
        <span className="badge bg-warning text-dark ms-2">{invitations.length}</span>
      </div>

      <div className="invitations-list">
        {invitations.map((invitation) => (
          <div key={invitation.id} className="invitation-item">
            <div className="invitation-content">
              <div className="invitation-header">
                <h6 className="mb-1">
                  <i className="bi bi-folder me-2 text-primary"></i>
                  {invitation.projects?.title || 'Proyecto sin nombre'}
                </h6>
                <span className="badge bg-warning text-dark">Pendiente</span>
              </div>

              {invitation.projects?.description && (
                <p className="invitation-description">
                  {invitation.projects.description}
                </p>
              )}

              <div className="invitation-meta">
                <div className="invitation-inviter">
                  <i className="bi bi-person-circle me-1"></i>
                  Invitado por:{' '}
                  <strong>
                    {invitation.inviter?.full_name || invitation.inviter?.email || 'Usuario'}
                  </strong>
                </div>
                <div className="invitation-date">
                  <i className="bi bi-calendar3 me-1"></i>
                  {new Date(invitation.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </div>

            <div className="invitation-actions">
              <button
                className="btn btn-success btn-sm"
                onClick={() => handleAcceptInvitation(invitation.id)}
                disabled={processingId === invitation.id}
              >
                {processingId === invitation.id ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Procesando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-1"></i>
                    Aceptar
                  </>
                )}
              </button>
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={() => handleRejectInvitation(invitation.id)}
                disabled={processingId === invitation.id}
              >
                <i className="bi bi-x-circle me-1"></i>
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de éxito/error */}
      {showSuccessModal && (
        <>
          <div className="modal-backdrop show"></div>
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header border-0">
                  <h5 className="modal-title">
                    {successMessage.includes('Error') ? (
                      <i className="bi bi-x-circle text-danger me-2"></i>
                    ) : (
                      <i className="bi bi-check-circle text-success me-2"></i>
                    )}
                    {successMessage.includes('Error') ? 'Error' : '¡Éxito!'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowSuccessModal(false)}
                  ></button>
                </div>
                <div className="modal-body text-center py-4">
                  <p className="mb-0">{successMessage}</p>
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowSuccessModal(false)}
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
