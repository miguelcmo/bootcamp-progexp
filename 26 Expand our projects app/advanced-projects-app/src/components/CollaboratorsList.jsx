import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

export default function CollaboratorsList({ projectId, projectOwnerId }) {
  const [collaborators, setCollaborators] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [collaboratorToDelete, setCollaboratorToDelete] = useState(null)

  useEffect(() => {
    loadCollaborators()
    checkUserRole()
  }, [projectId])

  async function checkUserRole() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    setCurrentUserId(user.id)

    // Verificar si el usuario es dueño
    if (user.id === projectOwnerId) {
      setIsOwnerOrAdmin(true)
      return
    }

    // Verificar si es admin
    const { data } = await supabase
      .from('project_collaborators')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (data && data.role === 'admin') {
      setIsOwnerOrAdmin(true)
    }
  }

  async function loadCollaborators() {
    try {
      // Obtener información del dueño
      const { data: ownerProfile, error: ownerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', projectOwnerId)
        .single()

      if (ownerError) {
        console.error('Error al obtener perfil del dueño:', ownerError)
      }

      // Obtener colaboradores
      const { data: collabData, error: collabError } = await supabase
        .from('project_collaborators')
        .select('*')
        .eq('project_id', projectId)
        .order('added_at', { ascending: true })

      if (collabError) {
        console.error('Error al obtener colaboradores:', collabError)
        throw collabError
      }

      // Obtener perfiles de colaboradores si existen
      let enrichedCollabData = []
      if (collabData && collabData.length > 0) {
        const userIds = collabData.map((c) => c.user_id)

        console.log('User IDs a buscar:', userIds)

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds)

        console.log('Profiles encontrados:', profiles)

        if (profilesError) {
          console.error('Error al obtener perfiles:', profilesError)
        }

        // Crear mapa de perfiles
        const profileMap = {}
        if (profiles) {
          profiles.forEach((p) => {
            profileMap[p.id] = p
          })
        }

        console.log('Profile Map:', profileMap)

        // Enriquecer datos de colaboradores
        enrichedCollabData = collabData.map((collab) => {
          const enriched = {
            ...collab,
            profiles: profileMap[collab.user_id] || null,
          }
          console.log(`Colaborador ${collab.user_id}:`, enriched)
          return enriched
        })
      }

      // Combinar dueño y colaboradores
      const allCollaborators = [
        {
          id: 'owner',
          user_id: projectOwnerId,
          role: 'owner',
          profiles: ownerProfile,
          added_at: null,
        },
        ...enrichedCollabData,
      ]

      setCollaborators(allCollaborators)
    } catch (error) {
      console.error('Error al cargar colaboradores:', error)
    } finally {
      setLoading(false)
    }
  }

  function confirmRemoveCollaborator(collaboratorId, userId, collaboratorName) {
    setCollaboratorToDelete({ id: collaboratorId, userId, name: collaboratorName })
    setShowDeleteModal(true)
  }

  async function handleRemoveCollaborator() {
    if (!collaboratorToDelete) return

    try {
      const { error } = await supabase
        .from('project_collaborators')
        .delete()
        .eq('id', collaboratorToDelete.id)

      if (error) throw error

      // Cerrar modal
      setShowDeleteModal(false)
      setCollaboratorToDelete(null)

      // Recargar lista
      await loadCollaborators()
    } catch (error) {
      console.error('Error al remover colaborador:', error)
      alert('Error al remover colaborador: ' + error.message)
      setShowDeleteModal(false)
    }
  }

  async function handleChangeRole(collaboratorId, newRole) {
    try {
      const { error } = await supabase
        .from('project_collaborators')
        .update({ role: newRole })
        .eq('id', collaboratorId)

      if (error) throw error

      // Recargar lista
      await loadCollaborators()
    } catch (error) {
      console.error('Error al cambiar rol:', error)
      alert('Error al cambiar rol: ' + error.message)
    }
  }

  function getRoleBadge(role) {
    const badges = {
      owner: { class: 'bg-primary', icon: '👑', text: 'Dueño' },
      admin: { class: 'bg-warning text-dark', icon: '⭐', text: 'Admin' },
      collaborator: { class: 'bg-info', icon: '🤝', text: 'Colaborador' },
    }
    return badges[role] || badges.collaborator
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">
            <i className="bi bi-people me-2"></i>
            Colaboradores
          </h5>
          <div className="text-center py-3">
            <div className="spinner-border spinner-border-sm" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-body">
        <div
          className="d-flex justify-content-between align-items-center"
          style={{ cursor: 'pointer' }}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <h5 className="card-title mb-0">
            <i className="bi bi-people me-2"></i>
            Colaboradores
            <span className="badge bg-secondary ms-2">{collaborators.length}</span>
          </h5>
          <i className={`bi bi-chevron-${isCollapsed ? 'down' : 'up'} fs-5`}></i>
        </div>

        {!isCollapsed && (
          <div className="collaborators-list mt-3">
          {collaborators.map((collab) => {
            const badge = getRoleBadge(collab.role)
            const profile = collab.profiles

            return (
              <div key={collab.id} className="collaborator-item">
                <div className="collaborator-avatar">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name || profile.email} />
                  ) : (
                    <div className="avatar-placeholder">
                      <i className="bi bi-person-fill"></i>
                    </div>
                  )}
                </div>

                <div className="collaborator-info">
                  <div className="collaborator-name">
                    {profile?.full_name || profile?.email || 'Usuario'}
                  </div>
                  <div className="collaborator-email">{profile?.email}</div>
                  {collab.added_at && (
                    <div className="collaborator-date">
                      <i className="bi bi-calendar-plus me-1"></i>
                      Desde {new Date(collab.added_at).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="collaborator-actions">
                  <span className={`badge ${badge.class}`}>
                    {badge.icon} {badge.text}
                  </span>

                  {/* Solo mostrar controles si eres dueño/admin y no es el dueño del proyecto */}
                  {isOwnerOrAdmin && collab.role !== 'owner' && (
                    <div className="btn-group btn-group-sm mt-2">
                      {currentUserId === projectOwnerId && (
                        <select
                          className="form-select form-select-sm"
                          value={collab.role}
                          onChange={(e) => handleChangeRole(collab.id, e.target.value)}
                        >
                          <option value="collaborator">Colaborador</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => confirmRemoveCollaborator(
                          collab.id,
                          collab.user_id,
                          profile?.full_name || profile?.email || 'este colaborador'
                        )}
                        title="Remover colaborador"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          </div>
        )}
      </div>

      {/* Modal de confirmación para eliminar colaborador */}
      {showDeleteModal && (
        <>
          <div className="modal-backdrop show"></div>
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header border-0">
                  <h5 className="modal-title">
                    <i className="bi bi-exclamation-triangle text-warning me-2"></i>
                    Confirmar eliminación
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowDeleteModal(false)
                      setCollaboratorToDelete(null)
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="mb-0">
                    ¿Estás seguro de que quieres remover a{' '}
                    <strong>{collaboratorToDelete?.name}</strong> del proyecto?
                  </p>
                  <p className="text-muted small mt-2 mb-0">
                    Esta acción no se puede deshacer.
                  </p>
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowDeleteModal(false)
                      setCollaboratorToDelete(null)
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleRemoveCollaborator}
                  >
                    <i className="bi bi-trash me-1"></i>
                    Remover
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
