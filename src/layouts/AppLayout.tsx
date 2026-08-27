import { useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { AppNavigation } from '../components/AppNavigation'
import { BrandMark } from '../components/BrandMark'
import { getSharedSpaces } from '../domain/getSharedSpaces'
import type { SharedSpace } from '../domain/getSharedSpaces'
import { supabase } from '../lib/supabase'

export type AppLayoutContext = {
  sharedSpaces: SharedSpace[]
  refreshSharedSpaces: () => Promise<void>
}

export function AppLayout() {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false)
  const [sharedSpaces, setSharedSpaces] = useState<SharedSpace[]>([])
  const [navigationError, setNavigationError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')

  async function refreshSharedSpaces() {
    const spaces = await getSharedSpaces()
    setSharedSpaces(spaces)
    setNavigationError('')
  }

  useEffect(() => {
    let isMounted = true
    getSharedSpaces()
      .then((spaces) => {
        if (isMounted) setSharedSpaces(spaces)
      })
      .catch((error: unknown) => {
        if (isMounted) setNavigationError(error instanceof Error ? error.message : 'No se pudieron cargar los espacios.')
      })
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    if (!isNavigationOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsNavigationOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isNavigationOpen])

  async function handleSignOut() {
    if (isSigningOut) return
    setSignOutError('')
    setIsSigningOut(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      setSignOutError(error.message)
      setIsSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--color-page)] lg:pl-72">
      <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 shadow-sm lg:hidden">
        <button type="button" onClick={() => setIsNavigationOpen(true)} aria-label="Abrir navegación" aria-expanded={isNavigationOpen} aria-controls="app-navigation" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
        <BrandMark />
        <span className="font-bold tracking-tight text-[var(--color-text)]">Nido</span>
      </header>

      {isNavigationOpen && <button type="button" aria-label="Cerrar navegación" onClick={() => setIsNavigationOpen(false)} className="fixed inset-0 z-40 bg-slate-950/55 lg:hidden" />}
      <AppNavigation isOpen={isNavigationOpen} sharedSpaces={sharedSpaces} isSigningOut={isSigningOut} signOutError={signOutError} onClose={() => setIsNavigationOpen(false)} onSignOut={handleSignOut} />
      {navigationError && <p role="alert" className="app-error mx-4 mt-4 text-sm lg:mx-8">{navigationError}</p>}
      <div className="min-w-0">
        <Outlet context={{ sharedSpaces, refreshSharedSpaces } satisfies AppLayoutContext} />
      </div>
    </div>
  )
}
