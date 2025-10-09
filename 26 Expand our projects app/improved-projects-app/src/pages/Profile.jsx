import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import AvatarUploader from '../components/AvatarUploader'

export default function Profile({ onProfileUpdate }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    bio: '',
    company: '',
    location: '',
    avatar_url: ''
  })

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        // Buscar el perfil existente
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single()

        if (data) {
          setProfile({
            full_name: data.full_name || '',
            phone: data.phone || '',
            bio: data.bio || '',
            company: data.company || '',
            location: data.location || '',
            avatar_url: data.avatar_url || ''
          })
        }
      }
    } catch (error) {
      console.error('Error al cargar perfil:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile(e) {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: profile.full_name,
          phone: profile.phone,
          bio: profile.bio,
          company: profile.company,
          location: profile.location,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      alert('Perfil actualizado exitosamente')

      // Recargar el perfil en App.jsx
      if (onProfileUpdate) {
        onProfileUpdate(user.id, user.email)
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error)
      alert('Error al actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }

  function handleChange(field, value) {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  function handleAvatarUpload(url) {
    setProfile(prev => ({ ...prev, avatar_url: url }))
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="content-card">
        <div className="content-card-title">
          <i className="bi bi-person-circle"></i>
          Mi Perfil
        </div>

        {/* Avatar Uploader */}
        <div className="mb-4 pb-4 border-bottom">
          <h5 className="mb-3">Foto de perfil</h5>
          <AvatarUploader
            userId={user?.id}
            currentAvatarUrl={profile.avatar_url}
            onUploadSuccess={handleAvatarUpload}
          />
        </div>

        <form onSubmit={updateProfile}>
          <div className="row">
            {/* Columna izquierda */}
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  <i className="bi bi-envelope me-2"></i>
                  Correo electrónico
                </label>
                <input
                  type="email"
                  className="form-control"
                  value={user?.email || ''}
                  disabled
                />
                <small className="text-muted">El correo no se puede modificar</small>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  <i className="bi bi-person me-2"></i>
                  Nombre completo
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ingresa tu nombre completo"
                  value={profile.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  <i className="bi bi-telephone me-2"></i>
                  Teléfono
                </label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="+52 123 456 7890"
                  value={profile.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  <i className="bi bi-building me-2"></i>
                  Empresa
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nombre de tu empresa"
                  value={profile.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                />
              </div>
            </div>

            {/* Columna derecha */}
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  <i className="bi bi-geo-alt me-2"></i>
                  Ubicación
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ciudad, País"
                  value={profile.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  <i className="bi bi-chat-left-text me-2"></i>
                  Biografía
                </label>
                <textarea
                  className="form-control"
                  placeholder="Cuéntanos sobre ti..."
                  value={profile.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  rows="4"
                />
              </div>
            </div>
          </div>

          <div className="d-flex gap-2 mt-4">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Guardando...
                </>
              ) : (
                <>
                  <i className="bi bi-save me-2"></i>
                  Guardar cambios
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadProfile}
            >
              <i className="bi bi-arrow-clockwise me-2"></i>
              Descartar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
