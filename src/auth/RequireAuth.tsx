import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from './AuthContext'

function RequireAuth({ children }: PropsWithChildren) {
  const { user, loading } = useAuth()

  if (loading) {
    return <p>Comprobando sesión...</p>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default RequireAuth
