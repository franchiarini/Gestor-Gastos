import { Routes, Route } from 'react-router'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import CheckEmailPage from './pages/auth/CheckEmailPage'
import EmailConfirmedPage from './pages/auth/EmailConfirmedPage'
import RequireAuth from './auth/RequireAuth'
import PersonalSpacePage from './pages/PersonalSpacePage'
import SharedSpacePage from './pages/SharedSpacePage'

function App() {
  return (
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
    </Routes>
  )
}

export default App
