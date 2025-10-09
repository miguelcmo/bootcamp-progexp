import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
    setupRealtimeSubscription()
  }, [])

  async function loadNotifications() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      setNotifications(data || [])
      updateUnreadCount(data || [])
    } catch (error) {
      console.error('Error al cargar notificaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  function setupRealtimeSubscription() {
    // Obtener el user_id actual de manera síncrona
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      const channel = supabase
        .channel('notifications-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Cambio en notificaciones:', payload)
            loadNotifications()
          }
        )
        .subscribe((status) => {
          console.log('Estado del canal de notificaciones:', status)
        })

      // Cleanup function
      return () => {
        supabase.removeChannel(channel)
      }
    })
  }

  function updateUnreadCount(notifs) {
    const count = notifs.filter((n) => !n.read).length
    setUnreadCount(count)
  }

  async function markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error

      // Actualizar el estado local
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
    } catch (error) {
      console.error('Error al marcar como leída:', error)
    }
  }

  async function markAllAsRead() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error

      loadNotifications()
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error)
    }
  }

  async function deleteNotification(notificationId) {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', notificationId)

      if (error) throw error

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    } catch (error) {
      console.error('Error al eliminar notificación:', error)
    }
  }

  async function handleNotificationClick(notification) {
    // Marcar como leída
    if (!notification.read) {
      await markAsRead(notification.id)
    }

    // Manejar acciones según el tipo de notificación
    if (notification.type === 'project_invitation') {
      const metadata = notification.metadata
      if (metadata?.invitation_id) {
        // Redirigir o mostrar modal de invitación
        console.log('Abrir invitación:', metadata.invitation_id)
        // Aquí puedes implementar la lógica para mostrar/aceptar la invitación
      }
    }
  }

  function formatTimeAgo(timestamp) {
    const now = new Date()
    const notifTime = new Date(timestamp)
    const diffMs = now - notifTime
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `Hace ${diffMins}m`
    if (diffHours < 24) return `Hace ${diffHours}h`
    return `Hace ${diffDays}d`
  }

  function getNotificationIcon(type) {
    switch (type) {
      case 'project_invitation':
        return 'bi-envelope'
      case 'task_assigned':
        return 'bi-check-circle'
      case 'project_update':
        return 'bi-info-circle'
      default:
        return 'bi-bell'
    }
  }

  return (
    <div className="notification-bell-container">
      <button
        className="btn btn-sm btn-outline-light position-relative"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <i className="bi bi-bell"></i>
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="notification-dropdown-overlay"
            onClick={() => setShowDropdown(false)}
          ></div>
          <div className="notification-dropdown">
            <div className="notification-dropdown-header">
              <h6 className="mb-0">Notificaciones</h6>
              {unreadCount > 0 && (
                <button
                  className="btn btn-link btn-sm text-primary p-0"
                  onClick={markAllAsRead}
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            <div className="notification-dropdown-body">
              {loading ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="bi bi-bell-slash fs-1 d-block mb-2"></i>
                  <p className="mb-0">No hay notificaciones</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.read ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-icon">
                      <i className={`bi ${getNotificationIcon(notification.type)}`}></i>
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">
                        {formatTimeAgo(notification.created_at)}
                      </div>
                    </div>
                    <button
                      className="notification-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notification.id)
                      }}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
