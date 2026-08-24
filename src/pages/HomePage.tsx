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
        <header className="relative mb-8 overflow-hidden rounded-3xl border border-blue-200/70 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-6 dark:border-blue-900/70 dark:from-blue-950/45 dark:via-slate-950 dark:to-violet-950/35 sm:p-8 md:min-h-52">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] opacity-50 dark:opacity-70 dark:brightness-110 md:block">
            <img src="/dragon-brand.png" alt="" aria-hidden="true" className="h-full w-full object-contain object-right" />
          </div>
          <div className="relative z-10 max-w-2xl md:pr-[42%]">
            <h1 className="mb-3 text-4xl font-bold text-gray-900 sm:text-5xl">Inicio</h1>
            <p className="text-lg leading-relaxed text-gray-600">Organizá tus gastos personales y compartidos desde un solo lugar.</p>
          </div>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-2" aria-label="Accesos principales">
          <article className="app-panel flex min-h-48 flex-col border-blue-200/80 dark:border-blue-900/70">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Personal</p>
            <h2 className="mb-2 text-2xl font-semibold text-gray-900">Espacio personal</h2>
            <p className="mb-6 flex-1 text-gray-600">Consultá tus categorías, resumen y evolución personal.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link to="/personal/resumen" className="app-button-primary w-full sm:w-fit">Abrir espacio personal</Link>
              <Link to="/gastos" className="app-button-secondary w-full sm:w-fit">Registrar gasto</Link>
            </div>
          </article>
          <article className="app-panel flex min-h-48 flex-col border-violet-200/80 dark:border-violet-900/70">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">Compartidos</p>
            <h2 className="mb-2 text-2xl font-semibold text-gray-900">Espacios compartidos</h2>
            <p className="mb-6 flex-1 text-gray-600">{activeSpaces.length === 1 ? '1 espacio activo' : `${activeSpaces.length} espacios activos`}</p>
            <a href="#tus-espacios" className="app-button-secondary w-full sm:w-fit">Ver espacios</a>
          </article>
        </section>

        <section id="tus-espacios" className="app-panel mx-auto mb-8 scroll-mt-20">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Tus espacios</h2>
            <p className="mt-1 text-sm text-gray-600">Accedé a los espacios que compartís con otras personas.</p>
          </div>
          {sharedSpaces.length === 0 ? <p className="text-gray-600">Todavía no pertenecés a ningún espacio compartido.</p> : (
            <ul className="space-y-2">
              {activeSpaces.map((space) => <li key={space.id} className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] px-4 py-2"><span className="min-w-0 break-words font-semibold text-gray-900">{space.nombre}</span><Link to={`/spaces/${space.id}/resumen`} className="app-link min-h-10 shrink-0 px-2 py-2">Abrir</Link></li>)}
              {archivedSpaces.map((space) => <li key={space.id} className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-slate-50 px-4 py-2 opacity-80 dark:bg-slate-900"><span className="min-w-0"><span className="block break-words font-semibold text-gray-900">{space.nombre}</span><span className="text-xs text-gray-600">Archivado</span></span><Link to={`/spaces/${space.id}/resumen`} className="app-link min-h-10 shrink-0 px-2 py-2">Abrir</Link></li>)}
            </ul>
          )}
        </section>

        <section aria-labelledby="quick-actions-title">
          <h2 id="quick-actions-title" className="mb-4 text-2xl font-semibold text-gray-900">Acciones rápidas</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="app-panel border-emerald-200/80 dark:border-emerald-900/70">
              <h3 className="mb-2 text-xl font-semibold text-gray-900">Crear espacio</h3>
              <p className="mb-4 text-sm text-gray-600">Creá un espacio y compartí el código de acceso.</p>
              <form onSubmit={handleCreateSharedSpace} className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                <input aria-label="Nombre del espacio" value={newSharedSpaceName} onChange={(event) => setNewSharedSpaceName(event.target.value)} placeholder="Nombre del espacio" required disabled={isSharedSpaceSubmitting} className="app-control flex-1" />
                <button type="submit" disabled={isSharedSpaceSubmitting} className="app-button-primary w-full sm:w-auto lg:w-full xl:w-auto">{isSharedSpaceSubmitting ? 'Creando...' : 'Crear espacio'}</button>
              </form>
              {sharedSpaceError && <p role="alert" className="mt-3 text-sm text-red-600">{sharedSpaceError}</p>}
              {createdAccessCode && <p className="mt-3 text-gray-700">Código de acceso: <span className="font-semibold">{createdAccessCode.slice(0, 4)}-{createdAccessCode.slice(4)}</span>. Podés compartirlo con otras personas.</p>}
            </article>

            <article className="app-panel border-violet-200/80 dark:border-violet-900/70">
              <h3 className="mb-2 text-xl font-semibold text-gray-900">Unirme por código</h3>
              <p className="mb-4 text-sm text-gray-600">Buscá el espacio antes de confirmar tu ingreso.</p>
              <div>
            <form onSubmit={handlePreviewSharedSpace} className="flex flex-col gap-2 sm:flex-row">
              <input aria-label="Código de acceso" value={accessCode} onChange={(event) => { setAccessCode(event.target.value); setSharedSpacePreview(null); setJoinError(''); setJoinMessage('') }} placeholder="Código de acceso" required disabled={isJoinSubmitting} className="app-control flex-1" />
              <button type="submit" disabled={isJoinSubmitting} className="app-button-primary w-full sm:w-auto">{isJoinSubmitting ? 'Buscando...' : 'Buscar'}</button>
            </form>
            {joinError && <p role="alert" className="mt-3 text-sm text-red-600">{joinError}</p>}
            {joinMessage && <p role="status" className="app-success mt-3 text-sm">{joinMessage}</p>}
            {sharedSpacePreview && <div className="mt-4 text-gray-700"><p className="font-semibold">{sharedSpacePreview.nombre}</p>{sharedSpacePreview.membresiaEstado === 'ACTIVA' ? <p>Ya pertenecés a este espacio.</p> : <button type="button" onClick={handleJoinSharedSpace} disabled={isJoinSubmitting} className="app-button-primary mt-2">{isJoinSubmitting ? 'Uniéndome...' : 'Unirme'}</button>}</div>}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}
