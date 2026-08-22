import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
  authError: string
  retrySessionCheck: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [sessionCheckCount, setSessionCheckCount] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function loadSession() {
      setLoading(true)
      setAuthError('')

      try {
        const { data, error } = await supabase.auth.getSession()

        if (!isMounted) {
          return
        }

        if (error) {
          setAuthError('No se pudo comprobar tu sesión.')
          setLoading(false)
          return
        }

        setSession(data.session)
        setUser(data.session?.user ?? null)
        setLoading(false)
      } catch {
        if (isMounted) {
          setAuthError('No se pudo comprobar tu sesión.')
          setLoading(false)
        }
      }
    }

    loadSession()

    return () => {
      isMounted = false
    }
  }, [sessionCheckCount])

  useEffect(() => {
    let isMounted = true

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!isMounted || event === 'INITIAL_SESSION') {
          return
        }

        setSession(nextSession)
        setUser(nextSession?.user ?? null)
        setAuthError('')
        setLoading(false)
      },
    )

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  function retrySessionCheck() {
    setSessionCheckCount((count) => count + 1)
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, authError, retrySessionCheck }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider.')
  }

  return context
}
