import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import ProjectDetails from './ProjectDetails'

export default function Dashboard({ onLogout }) {
  // dashboard
  const [user, setUser] = useState(null)
  const [projects, setProjects] = useState([])
  // para la creacion de nuevos proyectos
  const [newProjectTitle, setNewProjectTitle] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  // para acceder al detalle de determinado proyecto
  const [selectedProjectId, setSelectedProjectId] = useState()

  useEffect (() => {
    // obtener la session actual
    async function loadSession () {
      const { data: {session} } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) fetchProjects(currentUser.id)
    }

    loadSession()
  }, []) // ejecutar unica ves cuando se renderiza el componente inicial


  // consultar todos los proyectos
  async function fetchProjects (userId) {
    // SELECT * FROM "table"
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false })

    if (error) console.error(error)
    else setProjects(data)
  } 

  // insertar proyecto
  async function addProject (e) {
    e.preventDefault()
    if (newProjectTitle.trim() === "" || !user) return

    const { data, error } = await supabase
      .from("projects")
      .insert([{
        title: newProjectTitle,
        description: newProjectDescription, 
        user_id: user.id,
        status: 'active'
      }])
      .select()

      if (error) {
        console.error("Error al crear el proyecto:", error)
        alert(`Error: ${error.message}`)
      } else {
        console.log("Proyecto creado:", data)
        setNewProjectTitle("")
        setNewProjectDescription("")
        fetchProjects(user.id)
      }
  }

  // eliminar proyecto
  async function deleteProject(id) {
    const { error } = await supabase.from("projects").delete().eq("id", id)
    if (!error && user) fetchProjects(user.id)
  }

    // Si hay un proyecto seleccionado, mostrar sus detalles
  if (selectedProjectId) {
    return (
      <ProjectDetails
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  return (
    <div className="fade-in">
      <div className="content-card mb-4">
        <div className="content-card-title">
          <i className="bi bi-plus-circle"></i>
          Crear nuevo proyecto
        </div>

        <form onSubmit={addProject}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Título del proyecto</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ingresa el título..."
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Descripción</label>
            <textarea
              className="form-control"
              placeholder="Describe tu proyecto..."
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              rows="3"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            <i className="bi bi-plus-lg me-2"></i>
            Agregar Proyecto
          </button>
        </form>
      </div>

      <div className="content-card">
        <div className="content-card-title">
          <i className="bi bi-folder"></i>
          Mis Proyectos
          <span className="badge bg-primary ms-2">{projects.length}</span>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-folder-x fs-1 text-muted d-block mb-3"></i>
            <p className="text-muted">Aún no tienes proyectos. ¡Crea tu primer proyecto!</p>
          </div>
        ) : (
          <div className="projects-list">
            {projects.map((project) => (
              <div key={project.id} className="project-item">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="flex-grow-1">
                    <div className="project-title">{project.title}</div>
                    {project.description && (
                      <div className="project-description">{project.description}</div>
                    )}
                    <div className="project-meta">
                      <span className={`project-status ${project.status}`}>
                        {project.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                      <span>
                        <i className="bi bi-calendar3 me-1"></i>
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => setSelectedProjectId(project.id)}
                      title="Ver detalles"
                    >
                      <i className="bi bi-eye"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => deleteProject(project.id)}
                      title="Eliminar"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
