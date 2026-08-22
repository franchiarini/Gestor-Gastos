import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '../../lib/supabase'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setError('')
    setIsSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError('No se pudo iniciar sesión. Verificá tus datos e intentá nuevamente.')
      setIsSubmitting(false)
      return
    }

    navigate('/')
  }

  return (
    <main className="app-page flex items-center justify-center">
      <div className="app-panel w-full max-w-md">
        <h1 className="app-text mb-4 text-4xl font-bold">Iniciar sesión</h1>
        <p className="app-muted mb-6 text-lg">
          Accedé a tu cuenta para continuar.
        </p>

        <form onSubmit={handleSubmit} className="text-left space-y-4">
          <div>
            <label htmlFor="email" className="app-muted mb-1 block text-sm font-semibold">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isSubmitting}
              className="app-control"
            />
          </div>

          <div>
            <label htmlFor="password" className="app-muted mb-1 block text-sm font-semibold">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isSubmitting}
              className="app-control"
            />
          </div>

          {error && (
            <p role="alert" className="app-error text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="app-button-primary w-full"
          >
            {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <Link to="/register" className="app-link mt-5">
          Crear una cuenta
        </Link>
      </div>
    </main>
  )
}

export default LoginPage
