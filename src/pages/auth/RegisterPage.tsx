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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md px-6 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Crear cuenta</h1>
        <p className="text-lg text-gray-600 mb-6">
          Registrate para comenzar a usar la aplicación.
        </p>

        <form onSubmit={handleSubmit} className="text-left space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-semibold text-gray-700 mb-1">
              Nombre
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              required
              disabled={isSubmitting}
              className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isSubmitting}
              className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isSubmitting}
              className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <Link to="/login" className="mt-6 inline-block text-blue-600 font-semibold hover:underline">
          Iniciar sesión
        </Link>
      </div>
    </div>
  )
}

export default RegisterPage
