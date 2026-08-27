import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
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

type NavigationIconName = 'home' | 'expenses' | 'balance' | 'income' | 'personal' | 'spaces' | 'sign-out'

function NavigationIcon({ name }: { name: NavigationIconName }) {
  const paths: Record<NavigationIconName, ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5M9 21v-7h6v7" /></>,
    expenses: <><path d="M4 6h16v12H4z" /><path d="M4 10h16M8 15h3" /></>,
    balance: <><path d="M12 3v18M5 7h14" /><path d="m5 7-3 6h6L5 7Zm14 0-3 6h6l-3-6Z" /><path d="M8 21h8" /></>,
    income: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 19h16" /></>,
    personal: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    spaces: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    'sign-out': <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M14 4h7v16h-7" /></>,
  }

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">{paths[name]}</svg>
}

function Chevron({ expanded }: { expanded: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}><path d="m7 4 6 6-6 6" /></svg>
}

function navigationClass({ isActive }: { isActive: boolean }) {
  return `flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5 font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
    isActive
      ? 'border-blue-200 bg-blue-50 font-bold text-blue-800 shadow-[inset_3px_0_0_#2563eb] dark:border-blue-900 dark:bg-blue-950/55 dark:text-blue-200'
      : 'border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]'
  }`
}

function spaceNavigationClass({ isActive }: { isActive: boolean }) {
  return `flex min-h-10 items-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
    isActive
      ? 'border-blue-200 bg-blue-50 font-bold text-blue-800 shadow-[inset_2px_0_0_#2563eb] dark:border-blue-900 dark:bg-blue-950/55 dark:text-blue-200'
      : 'border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]'
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
  const [isPersonalExpanded, setIsPersonalExpanded] = useState(() => pathname.startsWith('/personal/'))
  const [areSpacesExpanded, setAreSpacesExpanded] = useState(() => pathname.startsWith('/spaces/'))
  const [expandedSpaceId, setExpandedSpaceId] = useState<string | null>(activeSpaceId)
  const activeSpaces = sharedSpaces.filter((space) => space.estado === 'ACTIVO')
  const archivedSpaces = sharedSpaces.filter((space) => space.estado === 'ARCHIVADO')

  useEffect(() => {
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
        {isCurrent ? <button type="button" aria-expanded={isExpanded} aria-controls={`space-${space.id}-navigation`} onClick={() => setExpandedSpaceId((current) => current === space.id ? null : space.id)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-left text-sm font-bold text-blue-800 shadow-[inset_3px_0_0_#2563eb] transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-900 dark:bg-blue-950/55 dark:text-blue-200 dark:hover:bg-blue-950/80"><span className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden="true" /><span className="min-w-0 truncate">{space.nombre}</span></span><Chevron expanded={isExpanded} /></button> : <NavLink to={`/spaces/${space.id}/resumen`} className={spaceNavigationClass}><span className="mr-2 h-2 w-2 shrink-0 rounded-full bg-slate-400" aria-hidden="true" /><span className="min-w-0 truncate">{space.nombre}</span></NavLink>}
        {isExpanded && <ul id={`space-${space.id}-navigation`} className="ml-4 mt-1 space-y-0.5 border-l border-[var(--color-border)] pl-2">
          {sharedSections.map(([path, label]) => <li key={path}><NavLink to={`/spaces/${space.id}/${path}`} className={spaceNavigationClass}>{label}</NavLink></li>)}
        </ul>}
      </li>
    )
  }

  return (
    <aside
      id="app-navigation"
      aria-label="Navegación principal"
      className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl transition-transform duration-200 lg:translate-x-0 lg:shadow-sm ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex min-h-[4.75rem] items-center justify-between border-b border-[var(--color-border)] bg-gradient-to-b from-blue-50/70 to-transparent px-5 dark:from-blue-950/25">
        <span className="flex min-w-0 items-center gap-3">
          <span className="rounded-xl bg-blue-50 p-1.5 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:ring-blue-900"><BrandMark /></span>
          <span className="min-w-0"><span className="block truncate text-base font-extrabold tracking-tight text-[var(--color-text)]">Gestor de Gastos</span><span className="block text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Finanzas simples</span></span>
        </span>
        <button type="button" onClick={onClose} aria-label="Cerrar navegación" className="app-action min-h-11 min-w-11 lg:hidden">
          ×
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]" onClick={(event) => {
        if ((event.target as HTMLElement).closest('a')) onClose()
      }}>
        <ul className="space-y-1">
          <li><NavLink to="/" end className={navigationClass}><NavigationIcon name="home" />Inicio</NavLink></li>
          <li><NavLink to="/gastos" className={navigationClass}><NavigationIcon name="expenses" />Gastos</NavLink></li>
          <li><NavLink to="/ingresos/movimientos" className={navigationClass}><NavigationIcon name="income" />Ingresos</NavLink></li>
          <li><NavLink to="/balance" className={navigationClass}><NavigationIcon name="balance" />Balance</NavLink></li>
          <li className="pt-4"><p className="mb-1 px-3 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Tus espacios</p></li>
          <li>
            <button
              type="button"
              aria-expanded={isPersonalExpanded}
              aria-controls="personal-space-navigation"
              onClick={() => setIsPersonalExpanded((expanded) => !expanded)}
              className="flex min-h-11 w-full items-center justify-between rounded-xl border border-transparent px-3 py-2.5 text-left font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="flex items-center gap-3"><NavigationIcon name="personal" />Espacio personal</span>
              <Chevron expanded={isPersonalExpanded} />
            </button>
            <ul id="personal-space-navigation" hidden={!isPersonalExpanded} className="ml-5 mt-1 space-y-0.5 border-l border-[var(--color-border)] pl-3">
              <li><NavLink to="/personal/resumen" className={spaceNavigationClass}>Resumen</NavLink></li>
              <li><NavLink to="/personal/evolucion" className={spaceNavigationClass}>Evolución</NavLink></li>
              <li><NavLink to="/personal/categorias" className={spaceNavigationClass}>Categorías</NavLink></li>
            </ul>
          </li>
          <li className="pt-1">
            <button
              type="button"
              aria-expanded={areSpacesExpanded}
              aria-controls="shared-spaces-navigation"
              onClick={() => setAreSpacesExpanded((expanded) => !expanded)}
              className="flex min-h-11 w-full items-center justify-between rounded-xl border border-transparent px-3 py-2.5 text-left font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="flex items-center gap-3"><NavigationIcon name="spaces" />Espacios</span>
              <Chevron expanded={areSpacesExpanded} />
            </button>
            <div id="shared-spaces-navigation" hidden={!areSpacesExpanded} className="ml-5 mt-1 border-l border-[var(--color-border)] pl-3">
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

      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-3.5">
        <p className="mb-2 px-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Apariencia</p>
        <ThemeToggle variant="inline" />
        <button type="button" onClick={onSignOut} disabled={isSigningOut} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
          <NavigationIcon name="sign-out" />{isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>
        {signOutError && <p role="alert" className="app-error mt-2 text-sm">{signOutError}</p>}
      </div>
    </aside>
  )
}
