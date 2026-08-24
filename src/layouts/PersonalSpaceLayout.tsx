import { useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { getPersonalSpace } from '../domain/getPersonalSpace'
import type { PersonalSpace } from '../domain/getPersonalSpace'

export type PersonalSpaceLayoutContext = {
  spaceId: string
  nombre: string
  estado: string
}

export function PersonalSpaceLayout() {
  const [space, setSpace] = useState<PersonalSpace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError('')
    getPersonalSpace()
      .then((personalSpace) => { if (isMounted) setSpace(personalSpace) })
      .catch((loadError: unknown) => {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar tu espacio personal.')
      })
      .finally(() => { if (isMounted) setIsLoading(false) })
    return () => { isMounted = false }
  }, [retryCount])

  if (isLoading) return <main className="app-page flex items-center justify-center"><p className="app-muted">Cargando espacio personal...</p></main>

  if (error || !space) {
    return <main className="app-page flex items-center justify-center"><div className="app-panel w-full max-w-lg text-center"><p role="alert" className="app-error mb-4">{error || 'No se pudo cargar tu espacio personal.'}</p><button type="button" onClick={() => setRetryCount((count) => count + 1)} className="app-button-primary">Reintentar</button></div></main>
  }

  return (
    <main className="app-page overflow-x-hidden">
      <div className="app-container">
        <header className="mb-8 text-center">
          <h1 className="mb-2 break-words text-4xl font-bold text-gray-900 sm:text-5xl">Espacio personal</h1>
          <p className="text-gray-600">{space.nombre}</p>
        </header>
        <Outlet context={{ spaceId: space.id, nombre: space.nombre, estado: space.estado } satisfies PersonalSpaceLayoutContext} />
      </div>
    </main>
  )
}
