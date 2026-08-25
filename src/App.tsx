import { Link, Navigate, Outlet, Routes, Route, useParams } from 'react-router'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import CheckEmailPage from './pages/auth/CheckEmailPage'
import EmailConfirmedPage from './pages/auth/EmailConfirmedPage'
import RequireAuth from './auth/RequireAuth'
import { AppLayout } from './layouts/AppLayout'
import HomePage from './pages/HomePage'
import { PersonalSpaceLayout } from './layouts/PersonalSpaceLayout'
import PersonalSummaryPage from './pages/personal/PersonalSummaryPage'
import PersonalEvolutionPage from './pages/personal/PersonalEvolutionPage'
import PersonalCategoriesPage from './pages/personal/PersonalCategoriesPage'
import ExpensesPage from './pages/ExpensesPage'
import { SharedSpaceLayout } from './layouts/SharedSpaceLayout'
import SharedSummaryPage from './pages/shared/SharedSummaryPage'
import SharedEvolutionPage from './pages/shared/SharedEvolutionPage'
import SharedCategoriesPage from './pages/shared/SharedCategoriesPage'
import SharedMembersPage from './pages/shared/SharedMembersPage'
import SharedManagementPage from './pages/shared/SharedManagementPage'
import { IncomeLayout } from './layouts/IncomeLayout'
import IncomeMovementsPage from './pages/incomes/IncomeMovementsPage'
import IncomeCategoriesPage from './pages/incomes/IncomeCategoriesPage'

function PublicLayout() {
  return <Outlet />
}

function LegacySharedExpensesRedirect() {
  const { spaceId } = useParams<{ spaceId: string }>()
  return <Navigate to={spaceId ? `/gastos?space=${encodeURIComponent(spaceId)}` : '/gastos'} replace />
}

function App() {
  return (
    <Routes>
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<HomePage />} />
        <Route path="gastos" element={<ExpensesPage />} />
        <Route path="ingresos" element={<IncomeLayout />}>
          <Route index element={<Navigate to="/ingresos/movimientos" replace />} />
          <Route path="movimientos" element={<IncomeMovementsPage />} />
          <Route path="categorias" element={<IncomeCategoriesPage />} />
        </Route>
        <Route path="personal" element={<PersonalSpaceLayout />}>
          <Route index element={<Navigate to="/personal/resumen" replace />} />
          <Route path="gastos" element={<Navigate to="/gastos?space=personal" replace />} />
          <Route path="resumen" element={<PersonalSummaryPage />} />
          <Route path="evolucion" element={<PersonalEvolutionPage />} />
          <Route path="categorias" element={<PersonalCategoriesPage />} />
        </Route>
        <Route path="spaces/:spaceId/gastos" element={<LegacySharedExpensesRedirect />} />
        <Route path="spaces/:spaceId" element={<SharedSpaceLayout />}>
          <Route index element={<Navigate to="resumen" replace />} />
          <Route path="resumen" element={<SharedSummaryPage />} />
          <Route path="evolucion" element={<SharedEvolutionPage />} />
          <Route path="categorias" element={<SharedCategoriesPage />} />
          <Route path="integrantes" element={<SharedMembersPage />} />
          <Route path="configuracion" element={<SharedManagementPage />} />
        </Route>
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
