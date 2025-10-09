import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

export default function Notes() {
  const [user, setUser] = useState(null)
  const [notes, setNotes] = useState([])
  const [newNoteTitle, setNewNoteTitle] = useState("")
  const [newNoteContent, setNewNoteContent] = useState("")

  useEffect(() => {
    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) fetchNotes(currentUser.id)
    }

    loadSession()
  }, [])

  // Consultar todas las notas
  async function fetchNotes(userId) {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) console.error(error)
    else setNotes(data)
  }

  // Insertar nota
  async function addNote(e) {
    e.preventDefault()
    if (newNoteTitle.trim() === "" || !user) return

    const { data, error } = await supabase
      .from("notes")
      .insert([{
        title: newNoteTitle,
        content: newNoteContent,
        user_id: user.id
      }])
      .select()

    if (error) {
      console.error("Error al crear la nota:", error)
      alert(`Error: ${error.message}`)
    } else {
      console.log("Nota creada:", data)
      setNewNoteTitle("")
      setNewNoteContent("")
      fetchNotes(user.id)
    }
  }

  // Eliminar nota
  async function deleteNote(id) {
    const { error } = await supabase.from("notes").delete().eq("id", id)
    if (!error && user) fetchNotes(user.id)
  }

  return (
    <div className="fade-in">
      <div className="content-card mb-4">
        <div className="content-card-title">
          <i className="bi bi-plus-circle"></i>
          Crear nueva nota
        </div>

        <form onSubmit={addNote}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Título de la nota</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ingresa el título..."
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Contenido</label>
            <textarea
              className="form-control"
              placeholder="Escribe tu nota aquí..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows="4"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            <i className="bi bi-plus-lg me-2"></i>
            Crear Nota
          </button>
        </form>
      </div>

      <div className="content-card">
        <div className="content-card-title">
          <i className="bi bi-journal-text"></i>
          Mis Notas
          <span className="badge bg-primary ms-2">{notes.length}</span>
        </div>

        {notes.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-journal-x fs-1 text-muted d-block mb-3"></i>
            <p className="text-muted">Aún no tienes notas. ¡Crea tu primera nota!</p>
          </div>
        ) : (
          <div className="row g-3">
            {notes.map((note) => (
              <div key={note.id} className="col-md-6 col-lg-4">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body">
                    <h5 className="card-title fw-bold text-dark">{note.title}</h5>
                    <p className="card-text text-secondary">{note.content}</p>
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <small className="text-muted">
                        <i className="bi bi-calendar3 me-1"></i>
                        {new Date(note.created_at).toLocaleDateString()}
                      </small>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteNote(note.id)}
                        title="Eliminar"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
