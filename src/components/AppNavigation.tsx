import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import type { SharedSpace } from '../domain/getSharedSpaces'
import { ThemeToggle } from './ThemeToggle'

type AppNavigationProps = {
  isOpen: boolean
  sharedSpaces: SharedSpace[]
  isSigningOut: boolean
  signOutError: string
  onClose: () => void
  onSignOut: () => void
}

function navigationClass({ isActive }: { isActive: boolean }) {
  return `block min-h-11 rounded-xl px-3 py-2.5 font-semibold transition ${
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]'
  }`
}

function spaceNavigationClass({ isActive }: { isActive: boolean }) {
  return `block min-h-10 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]'
  }`
}

export function AppNavigation({
  isOpen,
  sharedSpaces,
  isSigningOut,
  signOutError,
  onClose,
  onSignOut,
}: AppNavigationProps) {
  const { pathname } = useLocation()
  const [areSpacesExpanded, setAreSpacesExpanded] = useState(() => pathname.startsWith('/spaces/'))
  const activeSpaces = sharedSpaces.filter((space) => space.estado === 'ACTIVO')
  const archivedSpaces = sharedSpaces.filter((space) => space.estado === 'ARCHIVADO')

  useEffect(() => {
    if (pathname.startsWith('/spaces/')) setAreSpacesExpanded(true)
  }, [pathname])

  return (
    <aside
      id="app-navigation"
      aria-label="Navegación principal"
      className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl transition-transform duration-200 lg:translate-x-0 lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex min-h-16 items-center justify-between border-b border-[var(--color-border)] px-5">
        <span className="text-lg font-bold text-[var(--color-text)]">Gestor de Gastos</span>
        <button type="button" onClick={onClose} aria-label="Cerrar navegación" className="app-action min-h-11 min-w-11 lg:hidden">
          ×
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-4" onClick={(event) => {
        if ((event.target as HTMLElement).closest('a')) onClose()
      }}>
        <ul className="space-y-1">
          <li><NavLink to="/" end className={navigationClass}>Inicio</NavLink></li>
          <li className="pt-3">
            <p className="mb-1 px-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Mis gastos</p>
            <ul className="space-y-1">
              <li><NavLink to="/personal/gastos" className={navigationClass}>Gastos</NavLink></li>
              <li><NavLink to="/personal/resumen" className={navigationClass}>Resumen</NavLink></li>
              <li><NavLink to="/personal/evolucion" className={navigationClass}>Evolución</NavLink></li>
              <li><NavLink to="/personal/categorias" className={navigationClass}>Categorías</NavLink></li>
            </ul>
          </li>
          <li className="pt-3">
            <button
              type="button"
              aria-expanded={areSpacesExpanded}
              aria-controls="shared-spaces-navigation"
              onClick={() => setAreSpacesExpanded((expanded) => !expanded)}
              className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <span>Espacios</span>
              <span aria-hidden="true" className="text-base">{areSpacesExpanded ? '▾' : '›'}</span>
            </button>
            <div id="shared-spaces-navigation" hidden={!areSpacesExpanded} className="ml-3 border-l border-[var(--color-border)] pl-2">
              {activeSpaces.length === 0 && <p className="px-3 py-2 text-sm text-[var(--color-text-muted)]">Sin espacios activos</p>}
              <ul className="space-y-0.5">
                {activeSpaces.map((space) => (
                  <li key={space.id}>
                    <NavLink to={`/spaces/${space.id}/gastos`} className={spaceNavigationClass}>{space.nombre}</NavLink>
                  </li>
                ))}
              </ul>
              {archivedSpaces.length > 0 && (
                <>
                  <p className="mb-1 mt-2 px-3 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Archivados</p>
                  <ul className="space-y-0.5 opacity-70">
                    {archivedSpaces.map((space) => (
                      <li key={space.id}>
                        <NavLink to={`/spaces/${space.id}/gastos`} className={spaceNavigationClass}>{space.nombre}</NavLink>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </li>
        </ul>
      </nav>

      <div className="border-t border-[var(--color-border)] p-4">
        <ThemeToggle variant="inline" />
        <button type="button" onClick={onSignOut} disabled={isSigningOut} className="app-button-secondary mt-3 w-full">
          {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>
        {signOutError && <p role="alert" className="app-error mt-2 text-sm">{signOutError}</p>}
      </div>
    </aside>
  )
}
