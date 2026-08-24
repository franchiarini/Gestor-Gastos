import { Link, Navigate, Outlet, Routes, Route } from 'react-router'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import CheckEmailPage from './pages/auth/CheckEmailPage'
import EmailConfirmedPage from './pages/auth/EmailConfirmedPage'
import RequireAuth from './auth/RequireAuth'
import SharedSpacePage from './pages/SharedSpacePage'
import { AppLayout } from './layouts/AppLayout'
import HomePage from './pages/HomePage'
import { PersonalSpaceLayout } from './layouts/PersonalSpaceLayout'
import PersonalExpensesPage from './pages/personal/PersonalExpensesPage'
import PersonalSummaryPage from './pages/personal/PersonalSummaryPage'
import PersonalEvolutionPage from './pages/personal/PersonalEvolutionPage'
import PersonalCategoriesPage from './pages/personal/PersonalCategoriesPage'

function PublicLayout() {
  return <Outlet />
}

function App() {
  return (
    <Routes>
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<HomePage />} />
        <Route path="personal" element={<PersonalSpaceLayout />}>
          <Route index element={<Navigate to="/personal/gastos" replace />} />
          <Route path="gastos" element={<PersonalExpensesPage />} />
          <Route path="resumen" element={<PersonalSummaryPage />} />
          <Route path="evolucion" element={<PersonalEvolutionPage />} />
          <Route path="categorias" element={<PersonalCategoriesPage />} />
        </Route>
        <Route path="spaces/:spaceId" element={<Navigate to="gastos" replace />} />
        <Route path="spaces/:spaceId/gastos" element={<SharedSpacePage />} />
      </Route>
      <Route element={<PublicLayout />}>
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
      </Route>
    </Routes>
  )
}

export default App
