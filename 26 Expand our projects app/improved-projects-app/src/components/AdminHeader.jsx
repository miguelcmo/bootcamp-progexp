import { useState } from 'react'

export default function AdminHeader({ profile, onProfileClick }) {
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <header className="admin-header">
      <div className="header-content">
        <div className="header-title">
          <i className="bi bi-grid-3x3-gap-fill me-2"></i>
          <h4 className="mb-0">Panel de Administración</h4>
        </div>

        <div className="header-actions">
          <button className="btn btn-sm btn-outline-light me-2">
            <i className="bi bi-bell"></i>
            <span className="badge bg-danger ms-1">3</span>
          </button>

          {/* Dropdown de perfil */}
          <div className="profile-dropdown-container">
            <button
              className="btn btn-sm btn-outline-light"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <i className="bi bi-gear"></i>
            </button>

            {showDropdown && (
              <>
                <div
                  className="profile-dropdown-overlay"
                  onClick={() => setShowDropdown(false)}
                ></div>
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Avatar"
                        className="profile-dropdown-avatar"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="profile-dropdown-avatar-placeholder">
                        <i className="bi bi-person-fill"></i>
                      </div>
                    )}
                    <div className="profile-dropdown-info">
                      <div className="profile-dropdown-name">
                        {profile?.full_name || 'Usuario'}
                      </div>
                      <div className="profile-dropdown-email">
                        {profile?.email || ''}
                      </div>
                    </div>
                  </div>

                  {profile?.company && (
                    <div className="profile-dropdown-item">
                      <i className="bi bi-building me-2"></i>
                      {profile.company}
                    </div>
                  )}

                  {profile?.location && (
                    <div className="profile-dropdown-item">
                      <i className="bi bi-geo-alt me-2"></i>
                      {profile.location}
                    </div>
                  )}

                  {profile?.phone && (
                    <div className="profile-dropdown-item">
                      <i className="bi bi-telephone me-2"></i>
                      {profile.phone}
                    </div>
                  )}

                  <div className="profile-dropdown-divider"></div>

                  <button
                    className="profile-dropdown-button"
                    onClick={() => {
                      setShowDropdown(false)
                      onProfileClick()
                    }}
                  >
                    <i className="bi bi-person-circle me-2"></i>
                    Ver perfil completo
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
