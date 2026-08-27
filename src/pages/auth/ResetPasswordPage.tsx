import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../../auth/AuthContext'
import { isValidPassword, MIN_PASSWORD_LENGTH, PASSWORD_REQUIREMENT_MESSAGE } from '../../auth/passwordPolicy'
import { AuthBackground } from '../../components/AuthBackground'
import { supabase } from '../../lib/supabase'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { session, loading, isPasswordRecovery, clearPasswordRecovery } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canResetPassword = Boolean(session && isPasswordRecovery)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting || !canResetPassword) return

    setError('')

    if (!isValidPassword(newPassword)) {
      setError(PASSWORD_REQUIREMENT_MESSAGE)
      return
    }
    if (!confirmPassword || newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setIsSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) {
        setError('No pudimos actualizar la contraseña. Intentá nuevamente.')
        return
      }

      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      if (signOutError) {
        setError('La contraseña se actualizó, pero no pudimos cerrar la sesión. Intentá iniciar sesión nuevamente.')
        return
      }

      clearPasswordRecovery()
      navigate('/login', { replace: true, state: { passwordReset: true } })
    } catch {
      setError('No pudimos actualizar la contraseña. Intentá nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <AuthBackground><div className="app-panel w-full max-w-md text-center"><p className="app-muted" role="status">Validando enlace...</p></div></AuthBackground>
  }

  if (!canResetPassword) {
    return (
      <AuthBackground>
        <div className="app-panel w-full max-w-md text-center">
          <h1 className="app-text mb-4 text-3xl font-bold">Este enlace de recuperación ya no es válido.</h1>
          <p className="app-muted mb-6">Solicitá un nuevo enlace para continuar.</p>
          <Link to="/forgot-password" className="app-button-primary">Solicitar otro enlace</Link>
        </div>
      </AuthBackground>
    )
  }

  return (
    <AuthBackground>
      <div className="app-panel w-full max-w-md">
        <h1 className="app-text mb-4 text-4xl font-bold">Crear nueva contraseña</h1>
        <p className="app-muted mb-6 text-lg">Elegí una nueva contraseña para tu cuenta.</p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left" aria-describedby="reset-password-requirement">
          <label className="app-muted block text-sm font-semibold">Nueva contraseña<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={MIN_PASSWORD_LENGTH} disabled={isSubmitting} className="app-control mt-1" /></label>
          <label className="app-muted block text-sm font-semibold">Confirmar contraseña<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={MIN_PASSWORD_LENGTH} disabled={isSubmitting} className="app-control mt-1" /></label>
          <p id="reset-password-requirement" className="app-muted text-sm">{PASSWORD_REQUIREMENT_MESSAGE}</p>
          {error && <p role="alert" className="app-error text-sm">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="app-button-primary w-full">{isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}</button>
        </form>
      </div>
    </AuthBackground>
  )
}
