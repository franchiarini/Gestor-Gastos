import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import type { SharedSpace } from '../domain/getSharedSpaces'
import { ThemeToggle } from './ThemeToggle'
import { BrandMark } from './BrandMark'

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
  const activeSpaceId = pathname.match(/^\/spaces\/([^/]+)/)?.[1] ?? null
  const [isIncomeExpanded, setIsIncomeExpanded] = useState(() => pathname.startsWith('/ingresos'))
  const [isPersonalExpanded, setIsPersonalExpanded] = useState(() => pathname.startsWith('/personal/'))
  const [areSpacesExpanded, setAreSpacesExpanded] = useState(() => pathname.startsWith('/spaces/'))
  const [expandedSpaceId, setExpandedSpaceId] = useState<string | null>(activeSpaceId)
  const activeSpaces = sharedSpaces.filter((space) => space.estado === 'ACTIVO')
  const archivedSpaces = sharedSpaces.filter((space) => space.estado === 'ARCHIVADO')

  useEffect(() => {
    if (pathname.startsWith('/ingresos')) setIsIncomeExpanded(true)
    if (pathname.startsWith('/personal/')) setIsPersonalExpanded(true)
    if (pathname.startsWith('/spaces/')) setAreSpacesExpanded(true)
  }, [pathname])

  useEffect(() => {
    setExpandedSpaceId(activeSpaceId)
  }, [activeSpaceId])

  const sharedSections = [
    ['resumen', 'Resumen'],
    ['balance', 'Balance'],
    ['evolucion', 'Evolución'],
    ['categorias', 'Categorías'],
    ['integrantes', 'Integrantes'],
    ['configuracion', 'Gestión'],
  ] as const

  function renderSpace(space: SharedSpace, archived = false) {
    const isCurrent = space.id === activeSpaceId
    const isExpanded = space.id === expandedSpaceId
    return (
      <li key={space.id} className={archived ? 'opacity-70' : ''}>
        {isCurrent ? <button type="button" aria-expanded={isExpanded} aria-controls={`space-${space.id}-navigation`} onClick={() => setExpandedSpaceId((current) => current === space.id ? null : space.id)} className="flex min-h-10 w-full items-center justify-between rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 text-left text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-border)]"><span className="min-w-0 truncate">{space.nombre}</span><span aria-hidden="true">{isExpanded ? '▾' : '›'}</span></button> : <NavLink to={`/spaces/${space.id}/resumen`} className={spaceNavigationClass}><span className="min-w-0 truncate">{space.nombre}</span></NavLink>}
        {isExpanded && <ul id={`space-${space.id}-navigation`} className="ml-3 space-y-0.5 border-l border-[var(--color-border)] pl-2">
          {sharedSections.map(([path, label]) => <li key={path}><NavLink to={`/spaces/${space.id}/${path}`} className={spaceNavigationClass}>{label}</NavLink></li>)}
        </ul>}
      </li>
    )
  }

  return (
    <aside
      id="app-navigation"
      aria-label="Navegación principal"
      className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl transition-transform duration-200 lg:translate-x-0 lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex min-h-16 items-center justify-between border-b border-[var(--color-border)] px-5">
        <span className="flex min-w-0 items-center gap-2.5">
          <BrandMark />
          <span className="truncate text-lg font-bold text-[var(--color-text)]">Gestor de Gastos</span>
        </span>
        <button type="button" onClick={onClose} aria-label="Cerrar navegación" className="app-action min-h-11 min-w-11 lg:hidden">
          ×
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-4" onClick={(event) => {
        if ((event.target as HTMLElement).closest('a')) onClose()
      }}>
        <ul className="space-y-1">
          <li><NavLink to="/" end className={navigationClass}>Inicio</NavLink></li>
          <li><NavLink to="/gastos" className={navigationClass}>Gastos</NavLink></li>
          <li className="pt-2">
            <button
              type="button"
              aria-expanded={isIncomeExpanded}
              aria-controls="income-navigation"
              onClick={() => setIsIncomeExpanded((expanded) => !expanded)}
              className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2.5 text-left font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)]"
            >
              <span>Ingresos</span>
              <span aria-hidden="true">{isIncomeExpanded ? '▾' : '›'}</span>
            </button>
            <ul id="income-navigation" hidden={!isIncomeExpanded} className="ml-3 space-y-0.5 border-l border-[var(--color-border)] pl-2">
              <li><NavLink to="/ingresos/movimientos" className={spaceNavigationClass}>Movimientos</NavLink></li>
              <li><NavLink to="/ingresos/resumen" className={spaceNavigationClass}>Resumen</NavLink></li>
              <li><NavLink to="/ingresos/evolucion" className={spaceNavigationClass}>Evolución</NavLink></li>
              <li><NavLink to="/ingresos/categorias" className={spaceNavigationClass}>Categorías</NavLink></li>
            </ul>
          </li>
          <li><NavLink to="/balance" className={navigationClass}>Balance</NavLink></li>
          <li className="pt-2">
            <button
              type="button"
              aria-expanded={isPersonalExpanded}
              aria-controls="personal-space-navigation"
              onClick={() => setIsPersonalExpanded((expanded) => !expanded)}
              className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2.5 text-left font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)]"
            >
              <span>Espacio personal</span>
              <span aria-hidden="true">{isPersonalExpanded ? '▾' : '›'}</span>
            </button>
            <ul id="personal-space-navigation" hidden={!isPersonalExpanded} className="ml-3 space-y-0.5 border-l border-[var(--color-border)] pl-2">
              <li><NavLink to="/personal/resumen" className={spaceNavigationClass}>Resumen</NavLink></li>
              <li><NavLink to="/personal/evolucion" className={spaceNavigationClass}>Evolución</NavLink></li>
              <li><NavLink to="/personal/categorias" className={spaceNavigationClass}>Categorías</NavLink></li>
            </ul>
          </li>
          <li className="pt-2">
            <button
              type="button"
              aria-expanded={areSpacesExpanded}
              aria-controls="shared-spaces-navigation"
              onClick={() => setAreSpacesExpanded((expanded) => !expanded)}
              className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2.5 text-left font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)]"
            >
              <span>Espacios</span>
              <span aria-hidden="true" className="text-base">{areSpacesExpanded ? '▾' : '›'}</span>
            </button>
            <div id="shared-spaces-navigation" hidden={!areSpacesExpanded} className="ml-3 border-l border-[var(--color-border)] pl-2">
              {activeSpaces.length === 0 && <p className="px-3 py-2 text-sm text-[var(--color-text-muted)]">Sin espacios activos</p>}
              <ul className="space-y-1">{activeSpaces.map((space) => renderSpace(space))}</ul>
              {archivedSpaces.length > 0 && (
                <>
                  <p className="mb-1 mt-2 px-3 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Archivados</p>
                  <ul className="space-y-1">{archivedSpaces.map((space) => renderSpace(space, true))}</ul>
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
