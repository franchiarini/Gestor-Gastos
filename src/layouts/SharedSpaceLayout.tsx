import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet, useOutletContext, useParams } from 'react-router'
import { getSharedSpaceContext } from '../domain/getSharedSpaceContext'
import type { SharedSpaceContext, SharedSpaceRole } from '../domain/getSharedSpaceContext'
import type { AppLayoutContext } from './AppLayout'

export type SharedSpaceLayoutContext = {
  spaceId: string
  nombre: string
  estado: 'ACTIVO' | 'ARCHIVADO'
  rol: SharedSpaceRole
  categorias: SharedSpaceContext['categorias']
  refreshSpaceContext: () => Promise<void>
  refreshSharedSpaces: () => Promise<void>
}

export function SharedSpaceLayout() {
  const { spaceId } = useParams<{ spaceId: string }>()
  const { refreshSharedSpaces } = useOutletContext<AppLayoutContext>()
  const [context, setContext] = useState<SharedSpaceContext | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  const refreshSpaceContext = useCallback(async () => {
    if (!spaceId) throw new Error('No se indicó un espacio compartido válido.')
    setContext(await getSharedSpaceContext(spaceId))
  }, [spaceId])

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError('')
    setContext(null)
    if (!spaceId) {
      setError('No se indicó un espacio compartido válido.')
      setIsLoading(false)
      return () => { isMounted = false }
    }
    getSharedSpaceContext(spaceId)
      .then((loadedContext) => { if (isMounted) setContext(loadedContext) })
      .catch((loadError: unknown) => {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el espacio compartido.')
      })
      .finally(() => { if (isMounted) setIsLoading(false) })
    return () => { isMounted = false }
  }, [retryCount, spaceId])

  if (isLoading) return <main className="app-page flex items-center justify-center"><p className="app-muted">Cargando espacio compartido...</p></main>
  if (error || !context) return <main className="app-page flex items-center justify-center"><div className="app-panel w-full max-w-lg text-center"><p role="alert" className="app-error mb-4">{error || 'No se pudo cargar el espacio compartido.'}</p><div className="flex flex-wrap justify-center gap-2"><button type="button" onClick={() => setRetryCount((count) => count + 1)} className="app-button-primary">Reintentar</button><Link to="/" className="app-button-secondary">Volver al inicio</Link></div></div></main>

  return (
    <main className="app-page overflow-x-hidden">
      <div className="app-container">
        <header className="mb-8">
          <h1 className="app-text mb-2 break-words text-4xl font-bold sm:text-5xl">{context.nombre}</h1>
          <p className="app-muted">Rol: {context.rol === 'ADMIN' ? 'Administrador' : 'Integrante'}</p>
        </header>
        {context.estado === 'ARCHIVADO' && <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950/60"><p className="font-bold text-amber-950 dark:text-amber-100">Espacio archivado</p><p className="text-amber-900 dark:text-amber-200">Modo sólo lectura. El historial permanece disponible.</p></div>}
        <Outlet context={{ spaceId: context.id, nombre: context.nombre, estado: context.estado, rol: context.rol, categorias: context.categorias, refreshSpaceContext, refreshSharedSpaces } satisfies SharedSpaceLayoutContext} />
      </div>
    </main>
  )
}
