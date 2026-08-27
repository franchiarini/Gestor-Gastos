import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { AuthBackground } from '../../components/AuthBackground'
import { supabase } from '../../lib/supabase'

const NEUTRAL_SUCCESS_MESSAGE = 'Si existe una cuenta asociada a ese email, te enviamos un enlace para recuperar tu contraseña.'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) {
        setError('No pudimos enviar el enlace. Intentá nuevamente.')
        return
      }

      setMessage(NEUTRAL_SUCCESS_MESSAGE)
    } catch {
      setError('No pudimos enviar el enlace. Intentá nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthBackground>
      <div className="app-panel w-full max-w-md">
        <h1 className="app-text mb-4 text-4xl font-bold">Recuperar contraseña</h1>
        <p className="app-muted mb-6 text-lg">Ingresá el email asociado a tu cuenta.</p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label htmlFor="recovery-email" className="app-muted mb-1 block text-sm font-semibold">Email</label>
            <input id="recovery-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isSubmitting} className="app-control" />
          </div>

          {error && <p role="alert" className="app-error text-sm">{error}</p>}
          {message && <p role="status" aria-live="polite" className="app-success text-sm">{message}</p>}

          <button type="submit" disabled={isSubmitting} className="app-button-primary w-full">
            {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>

        <Link to="/login" className="app-link mt-5">Volver a iniciar sesión</Link>
      </div>
    </AuthBackground>
  )
}
