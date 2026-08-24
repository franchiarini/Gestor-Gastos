import { useState } from 'react'
import type { FormEvent } from 'react'
import { useOutletContext } from 'react-router'
import { createSharedCategory } from '../../domain/createSharedCategory'
import { deleteSharedCategory } from '../../domain/deleteSharedCategory'
import { updateSharedCategory } from '../../domain/updateSharedCategory'
import type { SharedSpaceCategory } from '../../domain/getSharedSpaceContext'
import type { SharedSpaceLayoutContext } from '../../layouts/SharedSpaceLayout'
import { SectionHeader } from '../../components/SectionHeader'

export default function SharedCategoriesPage() {
  const { spaceId, estado, categorias, refreshSpaceContext } = useOutletContext<SharedSpaceLayoutContext>()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isArchived = estado === 'ARCHIVADO'
  const activeCategories = categorias.filter((category) => category.estado === 'ACTIVA')
  const archivedCategories = categorias.filter((category) => category.estado === 'ARCHIVADA')

  async function run(action: () => Promise<void>, fallback: string) {
    if (isSubmitting) return
    setError('')
    setIsSubmitting(true)
    try { await action(); await refreshSpaceContext() }
    catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : fallback) }
    finally { setIsSubmitting(false) }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await run(async () => { await createSharedCategory(spaceId, newName); setNewName('') }, 'No se pudo crear la categoría.')
  }

  function startEditing(category: SharedSpaceCategory) {
    setError('')
    setEditingId(category.id)
    setEditingName(category.nombre)
  }

  function cancelEditing() { setEditingId(null); setEditingName('') }

  async function handleRename(categoryId: string) {
    await run(async () => { await updateSharedCategory(categoryId, { nombre: editingName }); cancelEditing() }, 'No se pudo renombrar la categoría.')
  }

  async function handleArchive(categoryId: string) {
    if (!window.confirm('¿Archivar esta categoría?')) return
    await run(() => updateSharedCategory(categoryId, { archivar: true }), 'No se pudo archivar la categoría.')
  }

  async function handleRestore(categoryId: string) {
    await run(() => updateSharedCategory(categoryId, { restaurar: true }), 'No se pudo desarchivar la categoría.')
  }

  async function handleDelete(categoryId: string) {
    if (!window.confirm('¿Eliminar esta categoría?')) return
    await run(async () => { await deleteSharedCategory(categoryId); if (editingId === categoryId) cancelEditing() }, 'No se pudo eliminar la categoría.')
  }

  function renderCategory(category: SharedSpaceCategory, archived: boolean) {
    return <li key={category.id} className="app-divider flex flex-col items-start gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">{!isArchived && editingId === category.id ? <><input aria-label={`Nuevo nombre para ${category.nombre}`} value={editingName} onChange={(event) => setEditingName(event.target.value)} disabled={isSubmitting} className="app-control flex-1" /><span className="flex gap-1"><button type="button" onClick={() => void handleRename(category.id)} disabled={isSubmitting} className="app-action">Guardar</button><button type="button" onClick={cancelEditing} disabled={isSubmitting} className="app-action">Cancelar</button></span></> : <><span>{category.nombre}</span>{!isArchived && <span className="flex flex-wrap gap-1"><button type="button" onClick={() => startEditing(category)} disabled={isSubmitting} className="app-action">Editar</button>{archived ? <button type="button" onClick={() => void handleRestore(category.id)} disabled={isSubmitting} className="app-action">Desarchivar</button> : <button type="button" onClick={() => void handleArchive(category.id)} disabled={isSubmitting} className="app-action">Archivar</button>}<button type="button" onClick={() => void handleDelete(category.id)} disabled={isSubmitting} className="app-action-danger">Eliminar</button></span>}</>}</li>
  }

  return <><SectionHeader id="shared-categories-title" title="Categorías" description="Organizá los gastos del espacio mediante categorías." /><section className="app-panel mx-auto max-w-4xl" aria-labelledby="shared-categories-title">{!isArchived && <form onSubmit={handleCreate} className="mb-6 flex flex-col gap-2 sm:flex-row"><input aria-label="Nombre de categoría" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nombre de categoría" required disabled={isSubmitting} className="app-control flex-1" /><button type="submit" disabled={isSubmitting} className="app-button-primary w-full sm:w-auto">{isSubmitting ? 'Guardando...' : 'Agregar categoría'}</button></form>}{error && <p role="alert" className="app-error mb-4 text-sm">{error}</p>}{activeCategories.length === 0 ? <p className="app-muted mb-8">No hay categorías activas.</p> : <ul className="app-muted mb-8 space-y-3">{activeCategories.map((category) => renderCategory(category, false))}</ul>}<h3 className="app-text mb-3 text-xl font-semibold">Categorías archivadas</h3>{archivedCategories.length === 0 ? <p className="app-muted">No hay categorías archivadas.</p> : <ul className="app-muted space-y-3">{archivedCategories.map((category) => renderCategory(category, true))}</ul>}</section></>
}
