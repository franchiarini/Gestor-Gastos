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
  const { user, loading } = useAuth()
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
    return <p>Comprobando sesión...</p>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (initializationError) {
    return (
      <div>
        <p role="alert">{initializationError}</p>
        <button type="button" onClick={() => setRetryCount((count) => count + 1)}>
          Reintentar
        </button>
      </div>
    )
  }

  if (
    isInitializing ||
    initializedUserId !== userId
  ) {
    return <p>Preparando tu espacio...</p>
  }

  return children
}

export default RequireAuth
