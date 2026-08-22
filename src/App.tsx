import { Link, Routes, Route } from 'react-router'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import CheckEmailPage from './pages/auth/CheckEmailPage'
import EmailConfirmedPage from './pages/auth/EmailConfirmedPage'
import RequireAuth from './auth/RequireAuth'
import PersonalSpacePage from './pages/PersonalSpacePage'
import SharedSpacePage from './pages/SharedSpacePage'
import { ThemeToggle } from './components/ThemeToggle'

function App() {
  return (
    <>
      <ThemeToggle />
      <Routes>
      <Route
        path="/"
        element={
          <RequireAuth>
            <PersonalSpacePage />
          </RequireAuth>
        }
      />
      <Route
        path="/spaces/:spaceId"
        element={
          <RequireAuth>
            <SharedSpacePage />
          </RequireAuth>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/check-email" element={<CheckEmailPage />} />
      <Route path="/auth/confirmed" element={<EmailConfirmedPage />} />
      <Route
        path="*"
        element={
          <main className="app-page flex items-center justify-center">
            <div className="app-panel w-full max-w-lg text-center">
              <h1 className="app-text mb-3 text-4xl font-bold">Página no encontrada</h1>
              <p className="app-muted mb-6">La dirección que ingresaste no existe.</p>
              <Link to="/" className="app-button-primary">Volver al inicio</Link>
            </div>
          </main>
        }
      />
      </Routes>
    </>
  )
}

export default App
