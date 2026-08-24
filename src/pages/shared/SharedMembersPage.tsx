import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router'
import { expelSharedSpaceMember } from '../../domain/expelSharedSpaceMember'
import { getSharedSpaceManagement } from '../../domain/getSharedSpaceManagement'
import type { SharedSpaceManagement } from '../../domain/getSharedSpaceManagement'
import { getSharedSpaceMembers } from '../../domain/getSharedSpaceMembers'
import type { SharedSpaceMember } from '../../domain/getSharedSpaceMembers'
import { promoteSharedSpaceMember } from '../../domain/promoteSharedSpaceMember'
import type { SharedSpaceLayoutContext } from '../../layouts/SharedSpaceLayout'
import { SectionHeader } from '../../components/SectionHeader'

export default function SharedMembersPage() {
  const { spaceId, estado, rol } = useOutletContext<SharedSpaceLayoutContext>()
  const [members, setMembers] = useState<SharedSpaceMember[]>([])
  const [management, setManagement] = useState<SharedSpaceManagement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const isArchived = estado === 'ARCHIVADO'

  async function loadMembers() {
    const [loadedMembers, loadedManagement] = await Promise.all([
      getSharedSpaceMembers(spaceId),
      getSharedSpaceManagement(spaceId),
    ])
    setMembers(loadedMembers)
    setManagement(loadedManagement)
  }

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError('')
    Promise.all([getSharedSpaceMembers(spaceId), getSharedSpaceManagement(spaceId)])
      .then(([loadedMembers, loadedManagement]) => { if (isMounted) { setMembers(loadedMembers); setManagement(loadedManagement) } })
      .catch((loadError: unknown) => { if (isMounted) setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los integrantes.') })
      .finally(() => { if (isMounted) setIsLoading(false) })
    return () => { isMounted = false }
  }, [retryCount, spaceId])

  async function handlePromote(member: SharedSpaceMember) {
    if (isSubmitting || !window.confirm(`¿Promover a ${member.nombre} a administrador?`)) return
    setError(''); setMessage(''); setIsSubmitting(true)
    try { await promoteSharedSpaceMember(spaceId, member.membresiaId); await loadMembers(); setMessage('Integrante promovido correctamente.') }
    catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : 'No se pudo promover al integrante.') }
    finally { setIsSubmitting(false) }
  }

  async function handleExpel(member: SharedSpaceMember) {
    if (isSubmitting || !window.confirm(`¿Expulsar a ${member.nombre} del espacio?`)) return
    setError(''); setMessage(''); setIsSubmitting(true)
    try { await expelSharedSpaceMember(spaceId, member.membresiaId); await loadMembers(); setMessage('Integrante expulsado correctamente.') }
    catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : 'No se pudo expulsar al integrante.') }
    finally { setIsSubmitting(false) }
  }

  if (isLoading) return <p className="app-muted text-center">Cargando integrantes...</p>
  if (error && !management) return <div className="app-panel mx-auto max-w-lg text-center"><p role="alert" className="app-error mb-4">{error}</p><button type="button" onClick={() => setRetryCount((count) => count + 1)} className="app-button-primary">Reintentar</button></div>

  return <><SectionHeader id="shared-members-title" title="Integrantes" description="Consultá y administrá las personas que forman parte del espacio." /><section className="app-panel mx-auto max-w-4xl" aria-labelledby="shared-members-title">{error && <p role="alert" className="app-error mb-4 text-sm">{error}</p>}{message && <p role="status" className="app-success mb-4 text-sm">{message}</p>}<ul className="app-muted space-y-3">{members.map((member) => <li key={member.membresiaId} className="app-divider flex flex-col items-start gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between"><span className="min-w-0 break-words">{member.nombre} · {member.rol === 'ADMIN' ? 'Administrador' : 'Integrante'}</span>{!isArchived && rol === 'ADMIN' && <span className="flex flex-wrap gap-1 sm:justify-end">{member.rol === 'INTEGRANTE' && <button type="button" onClick={() => void handlePromote(member)} disabled={isSubmitting} className="app-action">Promover a administrador</button>}{member.membresiaId !== management?.membresiaId && <button type="button" onClick={() => void handleExpel(member)} disabled={isSubmitting} className="app-action-danger">Expulsar</button>}</span>}</li>)}</ul></section></>
}
