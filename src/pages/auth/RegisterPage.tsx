import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '../../lib/supabase'

function RegisterPage() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
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

    const normalizedName = nombre.trim()

    if (!normalizedName) {
      setError('El nombre no puede estar vacío.')
      return
    }

    setIsSubmitting(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre: normalizedName },
        emailRedirectTo: `${window.location.origin}/auth/confirmed`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setIsSubmitting(false)
      return
    }

    navigate('/check-email')
  }

  return (
    <main className="app-page flex items-center justify-center">
      <div className="app-panel w-full max-w-md">
        <h1 className="app-text mb-4 text-4xl font-bold">Crear cuenta</h1>
        <p className="app-muted mb-6 text-lg">
          Registrate para comenzar a usar la aplicación.
        </p>

        <form onSubmit={handleSubmit} className="text-left space-y-4">
          <div>
            <label htmlFor="nombre" className="app-muted mb-1 block text-sm font-semibold">
              Nombre
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              required
              disabled={isSubmitting}
              className="app-control"
            />
          </div>

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
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <Link to="/login" className="app-link mt-5">
          Iniciar sesión
        </Link>
      </div>
    </main>
  )
}

export default RegisterPage
