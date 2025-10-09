import { useState, useEffect } from 'react'
import { supabase } from './services/supabaseClient.js'
import AuthPage from './pages/AuthPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Notes from './pages/Notes.jsx'
import Profile from './pages/Profile.jsx'
import DashboardStats from './components/DashboardStats.jsx'
import Sidebar from './components/Sidebar.jsx'
import AdminHeader from './components/AdminHeader.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard' o 'notes'
  const [profile, setProfile] = useState(null)

  useEffect (() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) console.error("Erro al obtener la sesión:", error)
      setSession(data.session)
      if (data.session) {
        loadProfile(data.session.user.id, data.session.user.email)
      }
      setLoading(false)
    }

    getSession()

    // validar su la sesión esta activa o no
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (session) {
          loadProfile(session.user.id, session.user.email)
        }
      }
    )

    // limpiamos el listener
    return () => listener.subscription.unsubscribe()
  }, []) // unica ves cuando se renderiz el componente de forma inicial

  // Cargar perfil del usuario
  async function loadProfile(userId, email) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (data) {
        setProfile(data)
      } else {
        // Si no existe perfil, usar datos básicos
        setProfile({ email, full_name: null })
      }
    } catch (error) {
      console.error('Error al cargar perfil:', error)
      setProfile({ email, full_name: null })
    }
  }

  // Logout from app
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }


  if (loading) {
    return (
      <div className='d-flex vh-100 justify-content-center align-items-center'>
        <div className='spinner-border text-primary' role="status">
          <span className='visually-hidden'>Cargando...</span>
        </div>
      </div>
    )
  }

  return session ? (
    <div className="admin-layout">
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onLogout={handleLogout}
        profile={profile}
      />

      <div className="main-content">
        <AdminHeader
          profile={profile}
          onProfileClick={() => setCurrentView('profile')}
        />

        <div className="container-fluid px-4 py-4">
          {(currentView === 'dashboard' || currentView === 'notes') && <DashboardStats />}

          {currentView === 'dashboard' && (
            <Dashboard session={session} onLogout={handleLogout} />
          )}
          {currentView === 'notes' && <Notes />}
          {currentView === 'profile' && (
            <Profile onProfileUpdate={(userId, email) => loadProfile(userId, email)} />
          )}
        </div>
      </div>
    </div>
  ) : (
    <AuthPage onAuthSuccess={(s) => setSession(s)}/>
  )
}

export default App
