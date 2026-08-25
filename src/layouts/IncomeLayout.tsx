import { Outlet } from 'react-router'

export function IncomeLayout() {
  return (
    <main className="app-page overflow-x-hidden">
      <div className="app-container">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            Finanzas personales
          </p>
          <h1 className="app-text text-4xl font-bold sm:text-5xl">Ingresos</h1>
          <p className="app-muted mt-2">Registrá y organizá el dinero que recibís.</p>
        </header>
        <Outlet />
      </div>
    </main>
  )
}
