import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { isValidPassword, MIN_PASSWORD_LENGTH, PASSWORD_REQUIREMENT_MESSAGE } from '../auth/passwordPolicy'
import { SectionHeader } from '../components/SectionHeader'
import { supabase } from '../lib/supabase'

export default function ProfilePage() {
  const { user } = useAuth()
  const email = user?.email ?? ''
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setError('')
    setMessage('')

    if (!currentPassword) {
      setError('Ingresá tu contraseña actual.')
      return
    }
    if (!isValidPassword(newPassword)) {
      setError(PASSWORD_REQUIREMENT_MESSAGE)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!email) {
      setError('No pudimos identificar el email de tu cuenta.')
      return
    }

    setIsSubmitting(true)
    try {
      const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })

      if (reauthenticationError) {
        setError(reauthenticationError.code === 'invalid_credentials' ? 'La contraseña actual no es correcta.' : 'No pudimos verificar tu contraseña actual. Intentá nuevamente.')
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) {
        setError('No pudimos actualizar la contraseña. Intentá nuevamente.')
        return
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage('Contraseña actualizada correctamente.')
    } catch {
      setError('No pudimos actualizar la contraseña. Intentá nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-page">
      <div className="app-container max-w-4xl">
        <SectionHeader id="profile-title" title="Perfil" description="Gestioná la información y seguridad de tu cuenta." />

        <div className="space-y-6">
          <section className="app-panel" aria-labelledby="account-information-title">
            <h2 id="account-information-title" className="app-text text-xl font-bold">Información de cuenta</h2>
            <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 sm:p-5">
              <p className="app-muted text-sm font-semibold">Email</p>
              <p className="app-text mt-1 break-all font-semibold">{email || 'Email no disponible'}</p>
              <p className="app-muted mt-2 text-sm">Este es el email asociado a tu cuenta.</p>
            </div>
          </section>

          <section className="app-panel" aria-labelledby="account-security-title">
            <h2 id="account-security-title" className="app-text text-xl font-bold">Seguridad</h2>
            <p className="app-muted mt-2">Cambiá tu contraseña confirmando primero la contraseña actual.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" aria-describedby="password-requirement">
              <label className="app-text block text-sm font-semibold">Contraseña actual<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required disabled={isSubmitting} className="app-control mt-1" /></label>
              <label className="app-text block text-sm font-semibold">Nueva contraseña<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={MIN_PASSWORD_LENGTH} disabled={isSubmitting} className="app-control mt-1" /></label>
              <label className="app-text block text-sm font-semibold">Confirmar nueva contraseña<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={MIN_PASSWORD_LENGTH} disabled={isSubmitting} className="app-control mt-1" /></label>
              <p id="password-requirement" className="app-muted text-sm">{PASSWORD_REQUIREMENT_MESSAGE}</p>
              {error && <p role="alert" className="app-error text-sm">{error}</p>}
              {message && <p role="status" className="app-success text-sm">{message}</p>}
              <button type="submit" disabled={isSubmitting} className="app-button-primary w-full sm:w-auto">{isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}</button>
            </form>
          </section>
        </div>
      </div>
    </main>
  )
}
