import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

export default function ProjectDetails({ projectId, onBack }) {
  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    // Obtener usuario actual
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const currentUser = session?.user ?? null;
    setUser(currentUser);

    if (currentUser) {
      await fetchProject();
      await fetchTasks();
    }
    setLoading(false);
  }

  // Obtener detalles del proyecto
  async function fetchProject() {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error) {
      console.error("Error al cargar proyecto:", error);
    } else {
      setProject(data);
    }
  }

  // Obtener tareas del proyecto
  async function fetchTasks() {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al cargar tareas:", error);
    } else {
      setTasks(data || []);
    }
  }

  // Crear nueva tarea
  async function addTask(e) {
    e.preventDefault();
    if (newTaskTitle.trim() === "" || !user) return;

    const taskData = {
      project_id: projectId,
      user_id: user.id,
      title: newTaskTitle,
      description: newTaskDescription,
      status: "pendiente",
    };

    console.log("Datos a insertar:", taskData);

    const { data, error } = await supabase
      .from("tasks")
      .insert([taskData])
      .select();

    if (error) {
      console.error("Error completo al crear tarea:", error);
      console.error("Detalles:", error.details, error.hint, error.code);
      alert(`Error: ${error.message}\nRevisa la consola para más detalles`);
    } else {
      console.log("Tarea creada:", data);
      setNewTaskTitle("");
      setNewTaskDescription("");
      fetchTasks();
    }
  }

  // Eliminar tarea
  async function deleteTask(id) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (!error) {
      fetchTasks();
    } else {
      console.error("Error al eliminar tarea:", error);
    }
  }

  // Cambiar estado de tarea
  async function updateTaskStatus(id, newStatus) {
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (!error) {
      fetchTasks();
    } else {
      console.error("Error al actualizar estado:", error);
    }
  }

  if (loading) {
    return (
      <div className="d-flex vh-100 justify-content-center align-items-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">Proyecto no encontrado</div>
        <button className="btn btn-secondary" onClick={onBack}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="container py-5">
      {/* Header con información del proyecto */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <button
            className="btn btn-sm btn-outline-secondary mb-2"
            onClick={onBack}
          >
            ← Volver a proyectos
          </button>
          <h2 className="mb-2">{project.title}</h2>
          {project.description && (
            <p className="text-secondary">{project.description}</p>
          )}
          <div className="text-muted small">
            <span className="badge bg-info me-2">{project.status}</span>
            Creado: {new Date(project.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      <hr className="my-4" />

      {/* Sección de tareas */}
      <div className="row">
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h4 className="card-title mb-3">Nueva Tarea</h4>
              <form onSubmit={addTask}>
                <div className="mb-3">
                  <label htmlFor="taskTitle" className="form-label">
                    Título
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="taskTitle"
                    placeholder="Título de la tarea..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="taskDescription" className="form-label">
                    Descripción
                  </label>
                  <textarea
                    className="form-control"
                    id="taskDescription"
                    placeholder="Descripción (opcional)..."
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    rows="3"
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  Agregar Tarea
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <h4 className="card-title mb-3">Tareas ({tasks.length})</h4>

              {tasks.length === 0 ? (
                <p className="text-muted">
                  No hay tareas aún. Crea la primera.
                </p>
              ) : (
                <div className="list-group">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="list-group-item list-group-item-action"
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <h6 className="mb-1">{task.title}</h6>
                          {task.description && (
                            <p className="mb-2 text-secondary small">
                              {task.description}
                            </p>
                          )}
                          <div className="d-flex gap-2 align-items-center">
                            <select
                              className="form-select form-select-sm w-auto"
                              value={task.status}
                              onChange={(e) =>
                                updateTaskStatus(task.id, e.target.value)
                              }
                            >
                              <option value="pendiente">Pendiente</option>
                              <option value="en_progreso">En progreso</option>
                              <option value="completada">Completada</option>
                            </select>
                            <span className="text-muted small">
                              Creada:{" "}
                              {new Date(task.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <button
                          className="btn btn-sm btn-outline-danger ms-2"
                          onClick={() => deleteTask(task.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
