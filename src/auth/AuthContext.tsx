import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
  authError: string
  isPasswordRecovery: boolean
  clearPasswordRecovery: () => void
  retrySessionCheck: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
}

const PASSWORD_RECOVERY_STORAGE_KEY = 'gestor-gastos-password-recovery'

function readPasswordRecoveryFlag() {
  try {
    return window.sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function writePasswordRecoveryFlag(isActive: boolean) {
  try {
    if (isActive) {
      window.sessionStorage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, 'true')
    } else {
      window.sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY)
    }
  } catch {
    // La sesión actual todavía permite completar el flujo aunque el storage no esté disponible.
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [sessionCheckCount, setSessionCheckCount] = useState(0)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(readPasswordRecoveryFlag)

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

        if (event === 'PASSWORD_RECOVERY') {
          writePasswordRecoveryFlag(true)
          setIsPasswordRecovery(true)
        } else if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          writePasswordRecoveryFlag(false)
          setIsPasswordRecovery(false)
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

  function clearPasswordRecovery() {
    writePasswordRecoveryFlag(false)
    setIsPasswordRecovery(false)
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, authError, isPasswordRecovery, clearPasswordRecovery, retrySessionCheck }}>
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
