import { useState } from "react";
import { supabase } from "../services/supabaseClient";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  // Estados para manejar los campos del formulario
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage({ type: "", text: "" })
    setLoading(true)

    try {
      if (isLogin) {
        // logica de inicio de sesión
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        onAuthSuccess(data.session)
        setMessage({ type: "success", text: "Inicio de sesión exitoso!"})
      } else {
        // logica de registro
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage({ type: "success", text: "Registro exitoso!" })
      }
    } catch (error) {
      setMessage({ type: "danger", text: error.message})
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div
        className="card shadow-sm p-4"
        style={{ width: "100%", maxWidth: "400px" }}
      >
        <h3 className="text-center mb-4">
          {isLogin ? "Iniciar sesión" : "Crear cuenta"}
        </h3>

        {message.text && (
          <div className={`alert alert-${message.type}`} role="alert">
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Correo electrónico
            </label>
            <input
              type="email"
              className="form-control"
              id="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Contraseña
            </label>
            <input
              type="password"
              className="form-control"
              id="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="d-grid">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading
                ? "Procesando..."
                : isLogin
                ? "Iniciar sesión"
                : "Registrarse"}
            </button>
          </div>
        </form>

        <div className="text-center mt-3">
          <button
            className="btn btn-link p-0"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage({ type: "", text: "" });
            }}
          >
            {isLogin
              ? "¿No tienes cuenta? Regístrate aquí"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
