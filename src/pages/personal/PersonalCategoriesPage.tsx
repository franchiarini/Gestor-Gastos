import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router'
import { createCategory } from '../../domain/createCategory'
import { deleteCategory } from '../../domain/deleteCategory'
import { getCategoriesForSpace } from '../../domain/getCategoriesForSpace'
import type { SpaceCategory } from '../../domain/getCategoriesForSpace'
import { updateCategory } from '../../domain/updateCategory'
import type { PersonalSpaceLayoutContext } from '../../layouts/PersonalSpaceLayout'
import { SectionHeader } from '../../components/SectionHeader'
import { EmptyState } from '../../components/EmptyState'
import IncomeCategoriesPage from '../incomes/IncomeCategoriesPage'

type CategorySection = 'gastos' | 'ingresos'

export default function PersonalCategoriesPage() {
  const { spaceId } = useOutletContext<PersonalSpaceLayoutContext>()
  const { hash } = useLocation()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<CategorySection>(() => hash === '#ingresos' ? 'ingresos' : 'gastos')
  const [categories, setCategories] = useState<SpaceCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setLoadError('')
    getCategoriesForSpace(spaceId)
      .then((result) => { if (isMounted) setCategories(result) })
      .catch((error: unknown) => { if (isMounted) setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar las categorías.') })
      .finally(() => { if (isMounted) setIsLoading(false) })
    return () => { isMounted = false }
  }, [retryCount, spaceId])

  useEffect(() => {
    if (hash !== '#gastos' && hash !== '#ingresos') return
    const section = hash.slice(1) as CategorySection
    setActiveSection(section)
    const frameId = window.requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    return () => window.cancelAnimationFrame(frameId)
  }, [hash])

  function selectSection(section: CategorySection) {
    setActiveSection(section)
    navigate({ hash: section })
  }

  const activeCategories = categories.filter((category) => category.estado === 'ACTIVA')
  const archivedCategories = categories.filter((category) => category.estado === 'ARCHIVADA')

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setCategoryError('')
    setIsSubmitting(true)
    try {
      const category = await createCategory(spaceId, newCategoryName)
      setCategories((current) => [...current, category].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setNewCategoryName('')
    } catch (error: unknown) {
      setCategoryError(error instanceof Error ? error.message : 'No se pudo crear la categoría.')
    } finally { setIsSubmitting(false) }
  }

  function startEditing(category: SpaceCategory) {
    setCategoryError('')
    setEditingCategoryId(category.id)
    setEditingCategoryName(category.nombre)
  }

  function cancelEditing() {
    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  async function handleRename(categoryId: string) {
    if (isSubmitting) return
    setCategoryError('')
    setIsSubmitting(true)
    try {
      const updated = await updateCategory(categoryId, { nombre: editingCategoryName })
      setCategories((current) => current.map((category) => category.id === updated.id ? updated : category).sort((a, b) => a.nombre.localeCompare(b.nombre)))
      cancelEditing()
    } catch (error: unknown) {
      setCategoryError(error instanceof Error ? error.message : 'No se pudo renombrar la categoría.')
    } finally { setIsSubmitting(false) }
  }

  async function handleArchive(categoryId: string) {
    if (isSubmitting || !window.confirm('¿Archivar esta categoría?')) return
    setCategoryError('')
    setIsSubmitting(true)
    try {
      await updateCategory(categoryId, { estado: 'ARCHIVADA' })
      setCategories((current) => current.map((category) => category.id === categoryId ? { ...category, estado: 'ARCHIVADA' } : category))
    } catch (error: unknown) {
      setCategoryError(error instanceof Error ? error.message : 'No se pudo archivar la categoría.')
    } finally { setIsSubmitting(false) }
  }

  async function handleRestore(categoryId: string) {
    if (isSubmitting) return
    setCategoryError('')
    setIsSubmitting(true)
    try {
      await updateCategory(categoryId, { restaurar: true })
      setCategories(await getCategoriesForSpace(spaceId))
    } catch (error: unknown) {
      setCategoryError(error instanceof Error ? error.message : 'No se pudo desarchivar la categoría.')
    } finally { setIsSubmitting(false) }
  }

  async function handleDelete(categoryId: string) {
    if (isSubmitting || !window.confirm('¿Eliminar esta categoría?')) return
    setCategoryError('')
    setIsSubmitting(true)
    try {
      await deleteCategory(categoryId)
      setCategories((current) => current.filter((category) => category.id !== categoryId))
      if (editingCategoryId === categoryId) cancelEditing()
    } catch (error: unknown) {
      setCategoryError(error instanceof Error ? error.message : 'No se pudo eliminar la categoría.')
    } finally { setIsSubmitting(false) }
  }

  function renderCategory(category: SpaceCategory, archived: boolean) {
    return <li key={category.id} className="flex flex-col items-start gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
      {editingCategoryId === category.id ? <><input aria-label={`Nuevo nombre para ${category.nombre}`} value={editingCategoryName} onChange={(event) => setEditingCategoryName(event.target.value)} disabled={isSubmitting} className="app-control flex-1" /><span className="flex gap-1"><button type="button" onClick={() => handleRename(category.id)} disabled={isSubmitting} className="app-action">Guardar</button><button type="button" onClick={cancelEditing} disabled={isSubmitting} className="app-action">Cancelar</button></span></> : <><span>{category.nombre}</span><span className="flex flex-wrap gap-1"><button type="button" onClick={() => startEditing(category)} disabled={isSubmitting} className="app-action">Editar</button>{archived ? <button type="button" onClick={() => handleRestore(category.id)} disabled={isSubmitting} className="app-action">Desarchivar</button> : <button type="button" onClick={() => handleArchive(category.id)} disabled={isSubmitting} className="app-action">Archivar</button>}<button type="button" onClick={() => handleDelete(category.id)} disabled={isSubmitting} className="app-action-danger">Eliminar</button></span></>}
    </li>
  }

  const sectionTabs = <div className="mb-6 grid grid-cols-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1" role="tablist" aria-label="Tipo de categorías"><button type="button" role="tab" aria-selected={activeSection === 'gastos'} onClick={() => selectSection('gastos')} className={`rounded-lg px-3 py-2.5 font-semibold ${activeSection === 'gastos' ? 'bg-blue-600 text-white' : 'app-muted'}`}>Gastos</button><button type="button" role="tab" aria-selected={activeSection === 'ingresos'} onClick={() => selectSection('ingresos')} className={`rounded-lg px-3 py-2.5 font-semibold ${activeSection === 'ingresos' ? 'bg-emerald-600 text-white' : 'app-muted'}`}>Ingresos</button></div>

  if (activeSection === 'ingresos') return <><SectionHeader id="personal-categories-title" title="Categorías" description="Gestioná por separado las categorías de gastos e ingresos." />{sectionTabs}<section id="ingresos" className="scroll-mt-24"><IncomeCategoriesPage embedded /></section></>
  if (isLoading) return <><SectionHeader id="personal-categories-title" title="Categorías" description="Gestioná por separado las categorías de gastos e ingresos." />{sectionTabs}<p className="app-muted text-center">Cargando categorías...</p></>
  if (loadError) return <><SectionHeader id="personal-categories-title" title="Categorías" description="Gestioná por separado las categorías de gastos e ingresos." />{sectionTabs}<div className="app-panel mx-auto max-w-lg text-center"><p role="alert" className="app-error mb-4">{loadError}</p><button type="button" onClick={() => setRetryCount((count) => count + 1)} className="app-button-primary">Reintentar</button></div></>

  return <><SectionHeader id="personal-categories-title" title="Categorías" description="Gestioná por separado las categorías de gastos e ingresos." />{sectionTabs}<section id="gastos" className="app-panel mx-auto max-w-4xl scroll-mt-24" aria-labelledby="personal-categories-title">
    <form onSubmit={handleCreate} className="mb-6 flex flex-col gap-2 sm:flex-row"><input aria-label="Nombre de categoría" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Nombre de categoría" disabled={isSubmitting} className="app-control flex-1" /><button type="submit" disabled={isSubmitting} className="app-button-primary w-full sm:w-auto">{isSubmitting ? 'Guardando...' : 'Agregar categoría'}</button></form>
    {categoryError && <p role="alert" className="mb-4 text-sm text-red-600">{categoryError}</p>}
    {activeCategories.length === 0 ? <EmptyState title="No hay categorías activas." description="Podés crear una categoría para organizar tus gastos." compact className="mb-8" /> : <ul className="app-muted mb-8 space-y-3">{activeCategories.map((category) => renderCategory(category, false))}</ul>}
    <h3 className="mb-3 text-xl font-semibold text-gray-900">Categorías archivadas</h3>
    {archivedCategories.length === 0 ? <EmptyState title="No hay categorías archivadas." compact /> : <ul className="app-muted space-y-3">{archivedCategories.map((category) => renderCategory(category, true))}</ul>}
  </section></>
}
