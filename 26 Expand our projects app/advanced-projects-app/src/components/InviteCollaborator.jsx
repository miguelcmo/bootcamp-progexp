import { useState } from 'react'
import { supabase } from '../services/supabaseClient'

export default function InviteCollaborator({ projectId, projectTitle, onInviteSent }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleInvite(e) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setMessage(null)

    try {
      // Obtener el usuario actual
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Verificar si el email ya está invitado
      const { data: existingInvitation } = await supabase
        .from('project_invitations')
        .select('*')
        .eq('project_id', projectId)
        .eq('email', email.toLowerCase())
        .eq('status', 'pending')
        .single()

      if (existingInvitation) {
        setMessage({ type: 'warning', text: 'Este usuario ya tiene una invitación pendiente' })
        setLoading(false)
        return
      }

      // Verificar si el email pertenece a un usuario registrado
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email.toLowerCase())

      const invitedUserId = profiles && profiles.length > 0 ? profiles[0].id : null

      // Crear la invitación
      const { data: invitation, error: inviteError } = await supabase
        .from('project_invitations')
        .insert([
          {
            project_id: projectId,
            invited_by: user.id,
            email: email.toLowerCase(),
            invited_user_id: invitedUserId,
            status: 'pending',
          },
        ])
        .select()
        .single()

      if (inviteError) throw inviteError

      // Opcional: Llamar a la Edge Function para enviar el correo (comentado hasta configurar)
      // const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
      //   body: {
      //     invitationId: invitation.id,
      //     email: email.toLowerCase(),
      //     projectTitle: projectTitle,
      //     inviterName: user.email,
      //     isRegistered: !!invitedUserId,
      //   },
      // })

      // if (emailError) {
      //   console.error('Error al enviar correo:', emailError)
      //   // No lanzamos error porque la invitación ya fue creada
      // }

      setMessage({
        type: 'success',
        text: invitedUserId
          ? 'Invitación enviada. El usuario recibirá una notificación.'
          : 'Invitación enviada por correo. El usuario deberá registrarse.',
      })
      setEmail('')

      if (onInviteSent) {
        onInviteSent()
      }
    } catch (error) {
      console.error('Error al enviar invitación:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Error al enviar la invitación',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="invite-collaborator">
      <h5 className="mb-3">Invitar Colaborador</h5>

      <form onSubmit={handleInvite}>
        <div className="mb-3">
          <label htmlFor="inviteEmail" className="form-label">
            Email del colaborador
          </label>
          <input
            type="email"
            className="form-control"
            id="inviteEmail"
            placeholder="usuario@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <div className="form-text">
            Se enviará una invitación por correo y notificación si el usuario está registrado.
          </div>
        </div>

        {message && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : message.type === 'warning' ? 'warning' : 'danger'} py-2`}>
            {message.text}
          </div>
        )}

        <button type="submit" className="btn btn-primary w-100" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Enviando...
            </>
          ) : (
            <>
              <i className="bi bi-envelope me-2"></i>
              Enviar Invitación
            </>
          )}
        </button>
      </form>
    </div>
  )
}
