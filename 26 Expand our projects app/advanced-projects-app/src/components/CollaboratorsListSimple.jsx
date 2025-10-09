import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

export default function CollaboratorsListSimple({ projectId, projectOwnerId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [projectId])

  async function loadData() {
    try {
      console.log('=== INICIO DEBUG ===')
      console.log('Project ID:', projectId)
      console.log('Owner ID:', projectOwnerId)

      // Test 1: Obtener dueño
      console.log('\n--- Test 1: Obtener perfil del dueño ---')
      const { data: owner, error: ownerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', projectOwnerId)
        .single()

      console.log('Owner:', owner)
      console.log('Owner Error:', ownerError)

      // Test 2: Obtener colaboradores SIN .select complejo
      console.log('\n--- Test 2: Obtener colaboradores (simple) ---')
      const { data: collabs, error: collabsError } = await supabase
        .from('project_collaborators')
        .select('*')
        .eq('project_id', projectId)

      console.log('Collaborators:', collabs)
      console.log('Collaborators Error:', collabsError)

      // Test 3: Si hay colaboradores, obtener sus perfiles
      if (collabs && collabs.length > 0) {
        console.log('\n--- Test 3: Obtener perfiles de colaboradores ---')
        const userIds = collabs.map(c => c.user_id)
        console.log('User IDs:', userIds)

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds)

        console.log('Profiles:', profiles)
        console.log('Profiles Error:', profilesError)
      }

      console.log('=== FIN DEBUG ===\n')

      setData({
        owner,
        ownerError,
        collabs,
        collabsError
      })

    } catch (err) {
      console.error('CATCH ERROR:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="alert alert-info">Cargando...</div>

  if (error) return <div className="alert alert-danger">Error: {error}</div>

  return (
    <div className="card">
      <div className="card-header">
        <h5>🔍 Debug Colaboradores</h5>
      </div>
      <div className="card-body">
        <pre style={{ fontSize: '11px', maxHeight: '400px', overflow: 'auto' }}>
          {JSON.stringify(data, null, 2)}
        </pre>

        <button className="btn btn-sm btn-primary mt-2" onClick={loadData}>
          🔄 Refrescar
        </button>

        <hr />

        <h6>Resumen:</h6>
        <ul>
          <li>Dueño: {data?.owner?.email || 'No encontrado'}</li>
          <li>Colaboradores en DB: {data?.collabs?.length || 0}</li>
          <li>Error en owner: {data?.ownerError ? '❌ Sí' : '✅ No'}</li>
          <li>Error en collabs: {data?.collabsError ? '❌ Sí' : '✅ No'}</li>
        </ul>
      </div>
    </div>
  )
}
