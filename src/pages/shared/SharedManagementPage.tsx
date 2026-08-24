import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router'
import { archiveSharedSpace } from '../../domain/archiveSharedSpace'
import { deleteSharedSpace } from '../../domain/deleteSharedSpace'
import { getSharedSpaceManagement } from '../../domain/getSharedSpaceManagement'
import type { SharedSpaceManagement } from '../../domain/getSharedSpaceManagement'
import { getSharedSpaceMembers } from '../../domain/getSharedSpaceMembers'
import type { SharedSpaceMember } from '../../domain/getSharedSpaceMembers'
import { leaveSharedSpace } from '../../domain/leaveSharedSpace'
import { reactivateSharedSpace } from '../../domain/reactivateSharedSpace'
import { regenerateSharedSpaceCode } from '../../domain/regenerateSharedSpaceCode'
import type { SharedSpaceLayoutContext } from '../../layouts/SharedSpaceLayout'
import { SectionHeader } from '../../components/SectionHeader'

export default function SharedManagementPage() {
  const navigate = useNavigate()
  const { spaceId, estado, rol, refreshSpaceContext, refreshSharedSpaces } = useOutletContext<SharedSpaceLayoutContext>()
  const [management, setManagement] = useState<SharedSpaceManagement | null>(null)
  const [members, setMembers] = useState<SharedSpaceMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const isArchived = estado === 'ARCHIVADO'
  const activeAdminCount = members.filter((member) => member.rol === 'ADMIN').length
  const isOnlyActiveAdmin = rol === 'ADMIN' && activeAdminCount === 1

  useEffect(() => {
    let isMounted = true
    setIsLoading(true); setError('')
    Promise.all([getSharedSpaceManagement(spaceId), getSharedSpaceMembers(spaceId)])
      .then(([loadedManagement, loadedMembers]) => { if (isMounted) { setManagement(loadedManagement); setMembers(loadedMembers) } })
      .catch((loadError: unknown) => { if (isMounted) setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la gestión del espacio.') })
      .finally(() => { if (isMounted) setIsLoading(false) })
    return () => { isMounted = false }
  }, [retryCount, spaceId])

  async function handleCopy() {
    if (!management) return
    setError(''); setMessage('')
    const code = `${management.codigoAcceso.slice(0, 4)}-${management.codigoAcceso.slice(4)}`
    try { await navigator.clipboard.writeText(code); setMessage('Código copiado.') }
    catch { setError('No se pudo copiar el código. Seleccionalo y copialo manualmente.') }
  }

  async function handleRegenerate() {
    if (!management || isSubmitting || !window.confirm('¿Regenerar el código? El código anterior dejará de funcionar.')) return
    setError(''); setMessage(''); setIsSubmitting(true)
    try { const code = await regenerateSharedSpaceCode(spaceId); setManagement({ ...management, codigoAcceso: code }); setMessage('Código regenerado correctamente.') }
    catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : 'No se pudo regenerar el código.') }
    finally { setIsSubmitting(false) }
  }

  async function handleArchive() {
    if (isSubmitting || !window.confirm('¿Archivar este espacio compartido?')) return
    setError(''); setMessage(''); setIsSubmitting(true)
    try { await archiveSharedSpace(spaceId); await Promise.all([refreshSpaceContext(), refreshSharedSpaces()]); setMessage('Espacio archivado correctamente.') }
    catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : 'No se pudo archivar el espacio.') }
    finally { setIsSubmitting(false) }
  }

  async function handleReactivate() {
    if (isSubmitting || !window.confirm('¿Reactivar este espacio compartido?')) return
    setError(''); setMessage(''); setIsSubmitting(true)
    try { await reactivateSharedSpace(spaceId); await Promise.all([refreshSpaceContext(), refreshSharedSpaces()]); setMessage('Espacio reactivado correctamente.') }
    catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : 'No se pudo reactivar el espacio.') }
    finally { setIsSubmitting(false) }
  }

  async function handleLeave() {
    if (isSubmitting || !window.confirm('¿Abandonar este espacio compartido?')) return
    setError(''); setMessage(''); setIsSubmitting(true)
    try { await leaveSharedSpace(spaceId); await refreshSharedSpaces(); navigate('/') }
    catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : 'No se pudo abandonar el espacio.'); setIsSubmitting(false) }
  }

  async function handleDelete() {
    if (isSubmitting) return
    setError(''); setMessage(''); setIsSubmitting(true)
    try { await deleteSharedSpace(spaceId); await refreshSharedSpaces(); navigate('/') }
    catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : 'No se pudo eliminar el espacio.'); setIsSubmitting(false) }
  }

  if (isLoading) return <p className="app-muted text-center">Cargando gestión...</p>
  if (error && !management) return <div className="app-panel mx-auto max-w-lg text-center"><p role="alert" className="app-error mb-4">{error}</p><button type="button" onClick={() => setRetryCount((count) => count + 1)} className="app-button-primary">Reintentar</button></div>

  return <div><SectionHeader id="shared-management-title" title="Gestión" description="Administrá el acceso, estado y acciones generales del espacio." /><div className="mx-auto max-w-4xl" aria-labelledby="shared-management-title">{!isArchived && management && <section className="app-panel mb-6"><h3 className="app-text mb-3 text-xl font-semibold">Código de acceso</h3><p className="app-text mb-3 font-mono text-xl">{management.codigoAcceso.slice(0, 4)}-{management.codigoAcceso.slice(4)}</p><div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => void handleCopy()} className="app-button-secondary w-full sm:w-auto">Copiar</button>{rol === 'ADMIN' && <button type="button" onClick={() => void handleRegenerate()} disabled={isSubmitting} className="app-button-secondary w-full sm:w-auto">Regenerar código</button>}</div></section>}
    {rol === 'ADMIN' && <section className="app-panel mb-6"><h3 className="app-text mb-3 text-xl font-semibold">Estado del espacio</h3><button type="button" onClick={() => void (isArchived ? handleReactivate() : handleArchive())} disabled={isSubmitting} className="app-button-secondary">{isArchived ? 'Reactivar espacio' : 'Archivar espacio'}</button></section>}
    {!isArchived && <section className="app-panel mb-6"><h3 className="app-text mb-3 text-xl font-semibold">Abandonar espacio</h3><button type="button" onClick={() => void handleLeave()} disabled={isSubmitting || isOnlyActiveAdmin} className="app-action-danger">Abandonar espacio</button>{isOnlyActiveAdmin && <p className="app-muted mt-2 text-sm">Promové a otro integrante a ADMIN antes de abandonar el espacio.</p>}</section>}
    {rol === 'ADMIN' && <section className="app-panel border-red-300 bg-red-50/60 dark:border-red-900 dark:bg-red-950/25"><h3 className="mb-2 text-xl font-semibold text-red-800 dark:text-red-200">Zona de peligro</h3><p className="mb-4 text-sm text-red-700 dark:text-red-300">Se eliminarán permanentemente todos los gastos, categorías, integrantes e historial asociados. Esta acción no se puede deshacer.</p>{!isDeleteOpen ? <button type="button" onClick={() => { setError(''); setIsDeleteOpen(true) }} disabled={isSubmitting} className="app-action-danger">Eliminar espacio</button> : <div className="rounded-xl border border-red-300 bg-white p-4 dark:border-red-800 dark:bg-slate-950"><p className="font-semibold text-red-800 dark:text-red-200">¿Eliminar este espacio definitivamente?</p><p className="app-muted mt-2 text-sm">Se eliminarán permanentemente todos los gastos, categorías, integrantes e historial asociados. Esta acción no se puede deshacer.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => setIsDeleteOpen(false)} disabled={isSubmitting} className="app-button-secondary">Cancelar</button><button type="button" onClick={() => void handleDelete()} disabled={isSubmitting} className="app-action-danger">{isSubmitting ? 'Eliminando...' : 'Eliminar definitivamente'}</button></div></div>}</section>}
    {error && <p role="alert" className="app-error mt-4 text-sm">{error}</p>}{message && <p role="status" className="app-success mt-4 text-sm">{message}</p>}
  </div></div>
}
