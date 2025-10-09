import { useState } from 'react'

export default function Sidebar({ currentView, setCurrentView, onLogout, profile }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const menuItems = [
    { id: 'dashboard', label: 'Proyectos', icon: 'bi-folder' },
    { id: 'notes', label: 'Notas', icon: 'bi-journal-text' },
    { id: 'profile', label: 'Mi Perfil', icon: 'bi-person-circle' }
  ]

  return (
    <>
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          {!isCollapsed && (
            <>
              <i className="bi bi-kanban fs-4"></i>
              <h5 className="mb-0 ms-2">Admin Panel</h5>
            </>
          )}
          <button
            className="btn btn-sm btn-dark ms-auto"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <i className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
          </button>
        </div>

        <div className="sidebar-user">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="sidebar-avatar"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          ) : (
            <i className="bi bi-person-circle fs-3"></i>
          )}
          {!isCollapsed && (
            <div className="user-info">
              <div className="user-email">
                {profile?.full_name || profile?.email || 'Usuario'}
              </div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => setCurrentView(item.id)}
            >
              <i className={`${item.icon} fs-5`}></i>
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-nav-item" onClick={onLogout}>
            <i className="bi bi-box-arrow-left fs-5"></i>
            {!isCollapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </div>

      {/* Overlay para móvil */}
      <div className="sidebar-overlay" onClick={() => setIsCollapsed(true)}></div>
    </>
  )
}
