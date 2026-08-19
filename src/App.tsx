import { Routes, Route } from 'react-router'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import CheckEmailPage from './pages/auth/CheckEmailPage'
import EmailConfirmedPage from './pages/auth/EmailConfirmedPage'
import { useAuth } from './auth/AuthContext'

function Home() {
  const { user, loading } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center py-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Gestor de Gastos
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Fundación técnica en construcción
        </p>
        <p className="text-lg text-gray-600">
          {loading
            ? 'Comprobando sesión...'
            : user
              ? 'Sesión activa'
              : 'Sin sesión'}
        </p>
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
