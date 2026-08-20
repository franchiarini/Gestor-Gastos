import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getSharedSpaceContext } from '../domain/getSharedSpaceContext'
import type { SharedSpaceContext } from '../domain/getSharedSpaceContext'

function SharedSpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>()
  const [context, setContext] = useState<SharedSpaceContext | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError('')
    setContext(null)

    if (!spaceId) {
      setError('No se indicó un espacio compartido válido.')
      setIsLoading(false)
      return () => {
        isMounted = false
      }
    }

    getSharedSpaceContext(spaceId)
      .then((sharedSpaceContext) => {
        if (isMounted) {
          setContext(sharedSpaceContext)
        }
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar el espacio compartido.',
          )
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [spaceId])

  if (isLoading) {
    return <p>Cargando espacio compartido...</p>
  }

  if (error || !context) {
    return (
      <main className="min-h-screen bg-white px-6 py-8 text-center">
        <p role="alert" className="mb-4 text-red-600">
          {error || 'No se pudo cargar el espacio compartido.'}
        </p>
        <Link to="/" className="font-semibold text-blue-600 hover:underline">
          Volver a Mis gastos
        </Link>
      </main>
    )
  }

  const activeCategories = context.categorias.filter(
    (category) => category.estado === 'ACTIVA',
  )
  const archivedCategories = context.categorias.filter(
    (category) => category.estado === 'ARCHIVADA',
  )

  return (
    <main className="min-h-screen bg-white px-6 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">{context.nombre}</h1>
        <p className="mb-8 text-gray-600">
          Rol: {context.rol === 'ADMIN' ? 'Administrador' : 'Integrante'}
        </p>

        <section className="mb-8">
          <h2 className="mb-3 text-2xl font-semibold text-gray-900">Categorías</h2>
          {activeCategories.length === 0 ? (
            <p className="text-gray-600">No hay categorías activas.</p>
          ) : (
            <ul className="space-y-2 text-gray-600">
              {activeCategories.map((category) => (
                <li key={category.id}>{category.nombre}</li>
              ))}
            </ul>
          )}
        </section>

        {archivedCategories.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-2xl font-semibold text-gray-900">
              Categorías archivadas
            </h2>
            <ul className="space-y-2 text-gray-600">
              {archivedCategories.map((category) => (
                <li key={category.id}>{category.nombre}</li>
              ))}
            </ul>
          </section>
        )}

        <Link to="/" className="font-semibold text-blue-600 hover:underline">
          Volver a Mis gastos
        </Link>
      </div>
    </main>
  )
}

export default SharedSpacePage
