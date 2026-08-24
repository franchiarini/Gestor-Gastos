import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useOutletContext } from 'react-router'
import { createSharedSpace } from '../domain/createSharedSpace'
import { joinSharedSpaceByCode } from '../domain/joinSharedSpaceByCode'
import { previewSharedSpaceByCode } from '../domain/previewSharedSpaceByCode'
import type { SharedSpacePreview } from '../domain/previewSharedSpaceByCode'
import type { AppLayoutContext } from '../layouts/AppLayout'

export default function HomePage() {
  const { sharedSpaces, refreshSharedSpaces } = useOutletContext<AppLayoutContext>()
  const [newSharedSpaceName, setNewSharedSpaceName] = useState('')
  const [createdAccessCode, setCreatedAccessCode] = useState('')
  const [sharedSpaceError, setSharedSpaceError] = useState('')
  const [isSharedSpaceSubmitting, setIsSharedSpaceSubmitting] = useState(false)
  const [accessCode, setAccessCode] = useState('')
  const [sharedSpacePreview, setSharedSpacePreview] = useState<SharedSpacePreview | null>(null)
  const [joinError, setJoinError] = useState('')
  const [joinMessage, setJoinMessage] = useState('')
  const [isJoinSubmitting, setIsJoinSubmitting] = useState(false)

  const activeSpaces = sharedSpaces.filter((space) => space.estado === 'ACTIVO')
  const archivedSpaces = sharedSpaces.filter((space) => space.estado === 'ARCHIVADO')

  async function handleCreateSharedSpace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSharedSpaceSubmitting) return
    const trimmedName = newSharedSpaceName.trim()
    if (!trimmedName) {
      setSharedSpaceError('El nombre del espacio no puede estar vacío.')
      return
    }
    setSharedSpaceError('')
    setCreatedAccessCode('')
    setIsSharedSpaceSubmitting(true)
    try {
      const createdSpace = await createSharedSpace(trimmedName)
      setCreatedAccessCode(createdSpace.codigoAcceso)
      setNewSharedSpaceName('')
      await refreshSharedSpaces()
    } catch (error: unknown) {
      setSharedSpaceError(error instanceof Error ? error.message : 'No se pudo crear el espacio compartido.')
    } finally {
      setIsSharedSpaceSubmitting(false)
    }
  }

  async function handlePreviewSharedSpace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isJoinSubmitting) return
    setJoinError('')
    setJoinMessage('')
    setSharedSpacePreview(null)
    setIsJoinSubmitting(true)
    try {
      setSharedSpacePreview(await previewSharedSpaceByCode(accessCode))
    } catch (error: unknown) {
      setJoinError(error instanceof Error ? error.message : 'No se pudo buscar el espacio compartido.')
    } finally {
      setIsJoinSubmitting(false)
    }
  }

  async function handleJoinSharedSpace() {
    if (isJoinSubmitting) return
    setJoinError('')
    setJoinMessage('')
    setIsJoinSubmitting(true)
    try {
      const result = await joinSharedSpaceByCode(accessCode)
      setJoinMessage(
        result.resultado === 'ALREADY_MEMBER'
          ? 'Ya pertenecés a este espacio.'
          : result.resultado === 'REACTIVATED'
            ? 'Tu membresía fue reactivada correctamente.'
            : 'Te uniste al espacio correctamente.',
      )
      setSharedSpacePreview(null)
      setAccessCode('')
      await refreshSharedSpaces()
    } catch (error: unknown) {
      setJoinError(error instanceof Error ? error.message : 'No se pudo completar la unión al espacio.')
    } finally {
      setIsJoinSubmitting(false)
    }
  }

  return (
    <main className="app-page overflow-x-hidden">
      <div className="app-container">
        <h1 className="mb-2 text-4xl font-bold text-gray-900 sm:text-5xl">Inicio</h1>
        <p className="mb-8 text-gray-600">Accedé a tus gastos y espacios compartidos.</p>

        <section className="app-panel mx-auto mb-6 max-w-4xl">
          <h2 className="mb-3 text-2xl font-semibold text-gray-900">Mis gastos</h2>
          <Link to="/personal/gastos" className="app-button-primary">Abrir Mis gastos</Link>
        </section>

        <section className="app-panel mx-auto mb-6 max-w-4xl">
          <h2 className="mb-3 text-2xl font-semibold text-gray-900">Espacios compartidos</h2>
          {activeSpaces.length === 0 ? <p className="mb-4 text-gray-600">Todavía no pertenecés a ningún espacio compartido.</p> : (
            <ul className="mb-5 space-y-2 text-gray-600">
              {activeSpaces.map((space) => <li key={space.id} className="flex flex-wrap items-center justify-between gap-2"><span>{space.nombre}</span><Link to={`/spaces/${space.id}/gastos`} className="app-link">Abrir</Link></li>)}
            </ul>
          )}
          <form onSubmit={handleCreateSharedSpace} className="flex flex-col gap-2 sm:flex-row">
            <input aria-label="Nombre del espacio" value={newSharedSpaceName} onChange={(event) => setNewSharedSpaceName(event.target.value)} placeholder="Nombre del espacio" required disabled={isSharedSpaceSubmitting} className="app-control flex-1" />
            <button type="submit" disabled={isSharedSpaceSubmitting} className="app-button-primary w-full sm:w-auto">{isSharedSpaceSubmitting ? 'Creando...' : 'Crear espacio'}</button>
          </form>
          {sharedSpaceError && <p role="alert" className="mt-3 text-sm text-red-600">{sharedSpaceError}</p>}
          {createdAccessCode && <p className="mt-3 text-gray-700">Código de acceso: <span className="font-semibold">{createdAccessCode.slice(0, 4)}-{createdAccessCode.slice(4)}</span>. Podés compartirlo con otras personas.</p>}

          <div className="mt-6 border-t border-gray-200 pt-6">
            <form onSubmit={handlePreviewSharedSpace} className="flex flex-col gap-2 sm:flex-row">
              <input aria-label="Código de acceso" value={accessCode} onChange={(event) => { setAccessCode(event.target.value); setSharedSpacePreview(null); setJoinError(''); setJoinMessage('') }} placeholder="Código de acceso" required disabled={isJoinSubmitting} className="app-control flex-1" />
              <button type="submit" disabled={isJoinSubmitting} className="app-button-primary w-full sm:w-auto">{isJoinSubmitting ? 'Buscando...' : 'Buscar'}</button>
            </form>
            {joinError && <p role="alert" className="mt-3 text-sm text-red-600">{joinError}</p>}
            {joinMessage && <p role="status" className="app-success mt-3 text-sm">{joinMessage}</p>}
            {sharedSpacePreview && <div className="mt-4 text-gray-700"><p className="font-semibold">{sharedSpacePreview.nombre}</p>{sharedSpacePreview.membresiaEstado === 'ACTIVA' ? <p>Ya pertenecés a este espacio.</p> : <button type="button" onClick={handleJoinSharedSpace} disabled={isJoinSubmitting} className="app-button-primary mt-2">{isJoinSubmitting ? 'Uniéndome...' : 'Unirme'}</button>}</div>}
          </div>
        </section>

        {archivedSpaces.length > 0 && <section className="app-panel mx-auto max-w-4xl bg-slate-50"><h2 className="mb-3 text-2xl font-semibold text-gray-900">Espacios archivados</h2><ul className="space-y-2 text-gray-600">{archivedSpaces.map((space) => <li key={space.id} className="flex flex-wrap items-center justify-between gap-2"><span>{space.nombre}</span><Link to={`/spaces/${space.id}/gastos`} className="app-link">Abrir</Link></li>)}</ul></section>}
      </div>
    </main>
  )
}
