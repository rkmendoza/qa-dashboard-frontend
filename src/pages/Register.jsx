import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const BACKEND = import.meta.env.VITE_BACKEND_URL

const ALLOWED_DOMAINS = ['col.flylevel.com', 'flylevel.com', 'airplane.solutions']

const Register = () => {
  const [form, setForm]     = useState({ email: '', password: '', full_name: '' })
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const domainValid = () => {
    const domain = form.email.split('@')[1]?.toLowerCase()
    return ALLOWED_DOMAINS.includes(domain)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    if (!domainValid()) {
      setError(`Solo se permiten cuentas de: ${ALLOWED_DOMAINS.join(', ')}`)
      return
    }

    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setLoading(true)
    try {
      await axios.post(`${BACKEND}/api/auth/register`, form)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse')
    }
    setLoading(false)
  }

  if (success) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-sm text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Cuenta creada</h2>
        <p className="text-sm text-gray-500 mb-6">
          Tu cuenta fue creada exitosamente. Ya puedes iniciar sesión.
        </p>
        <button onClick={() => navigate('/login')}
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          Ir al login
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">Crear cuenta</h1>
        <p className="text-gray-500 text-sm mb-6">Solo para equipos autorizados</p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nombre completo</label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => setField('full_name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tu nombre"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email corporativo</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                form.email && !domainValid()
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200'
              }`}
              placeholder="tu@flylevel.com"
              required
            />
            {form.email && !domainValid() && (
              <p className="text-xs text-red-500 mt-1">Dominio no autorizado</p>
            )}
            {form.email && domainValid() && (
              <p className="text-xs text-green-600 mt-1">✓ Dominio autorizado</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setField('password', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mínimo 8 caracteres"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !domainValid()}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-blue-500 hover:text-blue-700">
            Inicia sesión
          </Link>
        </p>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-400 text-center">Dominios autorizados</p>
          <div className="flex flex-wrap gap-1 justify-center mt-1">
            {ALLOWED_DOMAINS.map(d => (
              <span key={d} className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500">
                @{d}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register