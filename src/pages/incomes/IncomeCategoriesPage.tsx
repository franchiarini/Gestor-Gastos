import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { SectionHeader } from '../../components/SectionHeader'
import { archiveIncomeCategory } from '../../domain/archiveIncomeCategory'
import { createIncomeCategory } from '../../domain/createIncomeCategory'
import { deleteIncomeCategory } from '../../domain/deleteIncomeCategory'
import { getIncomeCategories } from '../../domain/getIncomeCategories'
import type { IncomeCategory } from '../../domain/getIncomeCategories'
import { renameIncomeCategory } from '../../domain/renameIncomeCategory'
import { restoreIncomeCategory } from '../../domain/restoreIncomeCategory'

function sortCategories(categories: IncomeCategory[]) {
  return [...categories].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export default function IncomeCategoriesPage() {
  const [categories, setCategories] = useState<IncomeCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [categoryMessage, setCategoryMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setLoadError('')
    getIncomeCategories()
      .then((result) => { if (isMounted) setCategories(result) })
      .catch((error: unknown) => {
        if (isMounted) setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar las categorías de ingreso.')
      })
      .finally(() => { if (isMounted) setIsLoading(false) })
    return () => { isMounted = false }
  }, [retryCount])

  const activeCategories = categories.filter((category) => category.estado === 'ACTIVA')
  const archivedCategories = categories.filter((category) => category.estado === 'ARCHIVADA')

  function clearFeedback() {
    setCategoryError('')
    setCategoryMessage('')
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    clearFeedback()
    setIsSubmitting(true)
    try {
      const category = await createIncomeCategory(newCategoryName)
      setCategories((current) => sortCategories([...current, category]))
      setNewCategoryName('')
      setCategoryMessage('Categoría de ingreso creada.')
    } catch (error: unknown) {
      setCategoryError(error instanceof Error ? error.message : 'No se pudo crear la categoría de ingreso.')
    } finally { setIsSubmitting(false) }
  }

  function startEditing(category: IncomeCategory) {
    clearFeedback()
    setEditingCategoryId(category.id)
    setEditingCategoryName(category.nombre)
  }

  function cancelEditing() {
    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  async function handleRename(categoryId: string) {
    if (isSubmitting) return
    clearFeedback()
    setIsSubmitting(true)
    try {
      const updated = await renameIncomeCategory(categoryId, editingCategoryName)
      setCategories((current) => sortCategories(current.map((category) => category.id === updated.id ? updated : category)))
      cancelEditing()
      setCategoryMessage('Categoría de ingreso renombrada.')
    } catch (error: unknown) {
      setCategoryError(error instanceof Error ? error.message : 'No se pudo renombrar la categoría de ingreso.')
    } finally { setIsSubmitting(false) }
  }

  async function handleArchive(categoryId: string) {
    if (isSubmitting || !window.confirm('¿Archivar esta categoría de ingreso?')) return
    clearFeedback()
    setIsSubmitting(true)
    try {
      const updated = await archiveIncomeCategory(categoryId)
      setCategories((current) => sortCategories(current.map((category) => category.id === updated.id ? updated : category)))
      setCategoryMessage('Categoría archivada.')
    } catch (error: unknown) {
      setCategoryError(error instanceof Error ? error.message : 'No se pudo archivar la categoría de ingreso.')
    } finally { setIsSubmitting(false) }
  }

  async function handleRestore(categoryId: string) {
    if (isSubmitting) return
    clearFeedback()
    setIsSubmitting(true)
    try {
      const updated = await restoreIncomeCategory(categoryId)
      setCategories((current) => sortCategories(current.map((category) => category.id === updated.id ? updated : category)))
      setCategoryMessage('Categoría restaurada.')
    } catch (error: unknown) {
      setCategoryError(error instanceof Error ? error.message : 'No se pudo restaurar la categoría de ingreso.')
    } finally { setIsSubmitting(false) }
  }

  async function handleDelete(categoryId: string) {
    if (isSubmitting || !window.confirm('¿Eliminar esta categoría de ingreso?')) return
    clearFeedback()
    setIsSubmitting(true)
    try {
      await deleteIncomeCategory(categoryId)
      setCategories((current) => current.filter((category) => category.id !== categoryId))
      if (editingCategoryId === categoryId) cancelEditing()
      setCategoryMessage('Categoría eliminada.')
    } catch (error: unknown) {
      setCategoryError(error instanceof Error ? error.message : 'No se pudo eliminar la categoría de ingreso.')
    } finally { setIsSubmitting(false) }
  }

  function renderCategory(category: IncomeCategory, archived: boolean) {
    return (
      <li key={category.id} className="app-divider flex flex-col items-start gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        {editingCategoryId === category.id ? (
          <>
            <input aria-label={`Nuevo nombre para ${category.nombre}`} value={editingCategoryName} onChange={(event) => setEditingCategoryName(event.target.value)} disabled={isSubmitting} className="app-control flex-1" />
            <span className="flex flex-wrap gap-1">
              <button type="button" onClick={() => void handleRename(category.id)} disabled={isSubmitting} className="app-action">Guardar</button>
              <button type="button" onClick={cancelEditing} disabled={isSubmitting} className="app-action">Cancelar</button>
            </span>
          </>
        ) : (
          <>
            <span className="app-text break-words font-medium">{category.nombre}</span>
            <span className="flex flex-wrap gap-1">
              <button type="button" onClick={() => startEditing(category)} disabled={isSubmitting} className="app-action">Editar</button>
              {archived
                ? <button type="button" onClick={() => void handleRestore(category.id)} disabled={isSubmitting} className="app-action">Restaurar</button>
                : <button type="button" onClick={() => void handleArchive(category.id)} disabled={isSubmitting} className="app-action">Archivar</button>}
              <button type="button" onClick={() => void handleDelete(category.id)} disabled={isSubmitting} className="app-action-danger">Eliminar</button>
            </span>
          </>
        )}
      </li>
    )
  }

  if (isLoading) return <p className="app-muted text-center">Cargando categorías de ingreso...</p>
  if (loadError) return <div className="app-panel mx-auto max-w-lg text-center"><p role="alert" className="app-error mb-4">{loadError}</p><button type="button" onClick={() => setRetryCount((count) => count + 1)} className="app-button-primary">Reintentar</button></div>

  return (
    <>
      <SectionHeader id="income-categories-title" title="Categorías" description="Organizá el origen de tus ingresos con categorías propias." />
      <section className="app-panel mx-auto max-w-4xl" aria-labelledby="income-categories-title">
        <form onSubmit={handleCreate} className="mb-6 flex flex-col gap-2 sm:flex-row">
          <input aria-label="Nombre de categoría de ingreso" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Nombre de categoría" disabled={isSubmitting} className="app-control flex-1" />
          <button type="submit" disabled={isSubmitting} className="app-button-primary w-full sm:w-auto">{isSubmitting ? 'Guardando...' : 'Agregar categoría'}</button>
        </form>
        {categoryError && <p role="alert" className="app-error mb-4 text-sm">{categoryError}</p>}
        {categoryMessage && <p role="status" className="app-success mb-4 text-sm">{categoryMessage}</p>}
        <h3 className="app-text mb-3 text-xl font-semibold">Categorías activas</h3>
        {activeCategories.length === 0 ? <p className="app-muted mb-8">No hay categorías activas.</p> : <ul className="mb-8 space-y-3">{activeCategories.map((category) => renderCategory(category, false))}</ul>}
        <h3 className="app-text mb-3 text-xl font-semibold">Categorías archivadas</h3>
        {archivedCategories.length === 0 ? <p className="app-muted">No hay categorías archivadas.</p> : <ul className="space-y-3">{archivedCategories.map((category) => renderCategory(category, true))}</ul>}
      </section>
    </>
  )
}
