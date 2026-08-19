import { useState } from 'react'
import { Routes, Route } from 'react-router'
import { supabase } from './lib/supabase'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import CheckEmailPage from './pages/auth/CheckEmailPage'
import EmailConfirmedPage from './pages/auth/EmailConfirmedPage'
import { useAuth } from './auth/AuthContext'

function Home() {
  const { user, loading } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')

  async function handleSignOut() {
    if (isSigningOut) {
      return
    }

    setSignOutError('')
    setIsSigningOut(true)

    const { error } = await supabase.auth.signOut()

    if (error) {
      setSignOutError(error.message)
      setIsSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center py-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Gestor de Gastos
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Fundación técnica en construcción
        </p>
        <p className="text-lg text-gray-600 mb-4">
          {loading
            ? 'Comprobando sesión...'
            : user
              ? 'Sesión activa'
              : 'Sin sesión'}
        </p>
        {user && !loading && (
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </button>
        )}
        {signOutError && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {signOutError}
          </p>
        )}
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/check-email" element={<CheckEmailPage />} />
      <Route path="/auth/confirmed" element={<EmailConfirmedPage />} />
    </Routes>
  )
}

export default App
