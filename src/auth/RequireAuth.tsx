import { useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from './AuthContext'
import { initializeUserDomain } from '../domain/initializeUserDomain'

const pendingInitializations = new Map<string, Promise<void>>()

function initializeUserDomainOnce(userId: string) {
  const pendingInitialization = pendingInitializations.get(userId)

  if (pendingInitialization) {
    return pendingInitialization
  }

  const initialization = initializeUserDomain().finally(() => {
    pendingInitializations.delete(userId)
  })

  pendingInitializations.set(userId, initialization)
  return initialization
}

function RequireAuth({ children }: PropsWithChildren) {
  const { user, loading, authError, retrySessionCheck } = useAuth()
  const userId = user?.id
  const [isInitializing, setIsInitializing] = useState(false)
  const [initializedUserId, setInitializedUserId] = useState<string | null>(null)
  const [initializationError, setInitializationError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (loading || !userId) {
      setIsInitializing(false)
      setInitializedUserId(null)
      setInitializationError('')
      return
    }

    let isMounted = true
    setIsInitializing(true)
    setInitializationError('')

    initializeUserDomainOnce(userId)
      .then(() => {
        if (isMounted) {
          setInitializedUserId(userId)
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setInitializationError(
            error instanceof Error
              ? error.message
              : 'No se pudo preparar tu espacio.',
          )
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsInitializing(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [loading, retryCount, userId])

  if (loading) {
    return <main className="app-page flex items-center justify-center"><p className="text-gray-600">Comprobando sesión...</p></main>
  }

  if (authError) {
    return (
      <main className="app-page flex items-center justify-center">
        <div className="app-panel w-full max-w-lg text-center">
          <p role="alert" className="mb-4 text-red-700">{authError}</p>
          <button type="button" onClick={retrySessionCheck} className="app-button-primary">
            Reintentar
          </button>
        </div>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (initializationError) {
    return (
      <main className="app-page flex items-center justify-center">
        <div className="app-panel w-full max-w-lg text-center">
          <p role="alert" className="mb-4 text-red-700">{initializationError}</p>
          <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="app-button-primary">
            Reintentar
          </button>
        </div>
      </main>
    )
  }

  if (
    isInitializing ||
    initializedUserId !== userId
  ) {
    return <main className="app-page flex items-center justify-center"><p className="text-gray-600">Preparando tu espacio...</p></main>
  }

  return children
}

export default RequireAuth
