import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getPersonalSpace } from '../domain/getPersonalSpace'
import type { PersonalSpace } from '../domain/getPersonalSpace'
import { getCategoriesForSpace } from '../domain/getCategoriesForSpace'
import type { SpaceCategory } from '../domain/getCategoriesForSpace'

function PersonalSpacePage() {
  const [space, setSpace] = useState<PersonalSpace | null>(null)
  const [categories, setCategories] = useState<SpaceCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError('')

    getPersonalSpace()
      .then(async (personalSpace) => {
        const personalSpaceCategories = await getCategoriesForSpace(personalSpace.id)

        if (isMounted) {
          setSpace(personalSpace)
          setCategories(personalSpaceCategories)
        }
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar tu espacio personal.',
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
  }, [retryCount])

  async function handleSignOut() {
    if (isSigningOut) {
      return
    }

    setSignOutError('')
    setIsSigningOut(true)

    const { error: logoutError } = await supabase.auth.signOut()

    if (logoutError) {
      setSignOutError(logoutError.message)
      setIsSigningOut(false)
    }
  }

  if (isLoading) {
    return <p>{space ? 'Cargando categorías...' : 'Cargando Mis gastos...'}</p>
  }

  if (error || !space) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center py-8 px-6">
          <p role="alert" className="mb-4 text-red-600">
            {error || 'No se pudo cargar tu espacio personal.'}
          </p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center py-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">{space.nombre}</h1>
        <p className="text-lg text-gray-600 mb-6">Este es tu espacio personal.</p>
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">Categorías</h2>
        <ul className="mb-8 space-y-2 text-gray-600">
          {categories.map((category) => (
            <li key={category.id}>{category.nombre}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>
        {signOutError && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {signOutError}
          </p>
        )}
      </div>
    </div>
  )
}

export default PersonalSpacePage
