import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { SectionHeader } from '../../components/SectionHeader'
import { FinancialSectionLinks } from '../../components/FinancialSectionLinks'
import { EmptyState } from '../../components/EmptyState'
import { createIncome } from '../../domain/createIncome'
import { deleteIncome } from '../../domain/deleteIncome'
import { getIncomeCategories } from '../../domain/getIncomeCategories'
import type { IncomeCategory } from '../../domain/getIncomeCategories'
import { getIncomesPage } from '../../domain/getIncomesPage'
import type { Income } from '../../domain/getIncomesPage'
import { appendUniqueIncomes, formatIncomeDateGroup, groupIncomesByDate } from '../../domain/incomePagination'
import type { IncomeCursor } from '../../domain/incomePagination'
import { updateIncome } from '../../domain/updateIncome'

function getTodayLocalDate() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function isValidAmount(amount: string) {
  return /^[0-9]+(?:\.[0-9]{1,2})?$/.test(amount) && Number(amount) > 0
}

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

export default function IncomeMovementsPage() {
  const today = getTodayLocalDate()
  const [categories, setCategories] = useState<IncomeCategory[]>([])
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState('')
  const [categoriesRetry, setCategoriesRetry] = useState(0)
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(today)
  const [description, setDescription] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [incomes, setIncomes] = useState<Income[]>([])
  const [cursor, setCursor] = useState<IncomeCursor | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')
  const [historyRetry, setHistoryRetry] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState('')
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  const [editingAmount, setEditingAmount] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [editingDate, setEditingDate] = useState('')
  const [editingDescription, setEditingDescription] = useState('')

  const activeCategories = categories.filter((category) => category.estado === 'ACTIVA')

  useEffect(() => {
    let isMounted = true
    setIsCategoriesLoading(true)
    setCategoriesError('')
    getIncomeCategories()
      .then((loadedCategories) => {
        if (!isMounted) return
        setCategories(loadedCategories)
        const firstActiveCategory = loadedCategories.find((category) => category.estado === 'ACTIVA')
        setCategoryId((current) => loadedCategories.some((category) => category.id === current && category.estado === 'ACTIVA') ? current : firstActiveCategory?.id ?? '')
      })
      .catch((error: unknown) => {
        if (isMounted) setCategoriesError(error instanceof Error ? error.message : 'No se pudieron cargar las categorías de ingreso.')
      })
      .finally(() => { if (isMounted) setIsCategoriesLoading(false) })
    return () => { isMounted = false }
  }, [categoriesRetry])

  useEffect(() => {
    let isMounted = true
    setIsHistoryLoading(true)
    setHistoryError('')
    setLoadMoreError('')
    setIncomes([])
    setCursor(null)
    setHasMore(false)
    getIncomesPage()
      .then((page) => {
        if (!isMounted) return
        setIncomes(page.incomes)
        setCursor(page.nextCursor)
        setHasMore(page.hasMore)
      })
      .catch((error: unknown) => {
        if (isMounted) setHistoryError(error instanceof Error ? error.message : 'No se pudo cargar el historial de ingresos.')
      })
      .finally(() => { if (isMounted) setIsHistoryLoading(false) })
    return () => { isMounted = false }
  }, [historyRetry])

  async function refreshHistory() {
    const page = await getIncomesPage()
    setIncomes(page.incomes)
    setCursor(page.nextCursor)
    setHasMore(page.hasMore)
    setLoadMoreError('')
  }

  function validateIncome(amountValue: string, dateValue: string) {
    if (!isValidAmount(amountValue)) return 'El monto debe ser mayor a cero y tener como máximo dos decimales.'
    if (!dateValue) return 'La fecha es obligatoria.'
    if (dateValue > today) return 'La fecha del ingreso no puede ser futura.'
    return ''
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    const trimmedAmount = amount.trim()
    const validationError = validateIncome(trimmedAmount, date)
    if (validationError) {
      setActionError(validationError)
      return
    }
    setActionError('')
    setActionMessage('')
    setIsSubmitting(true)
    try {
      await createIncome({ categoriaIngresoId: categoryId, monto: trimmedAmount, fecha: date, descripcion: description })
      await refreshHistory()
      setAmount('')
      setDate(getTodayLocalDate())
      setDescription('')
      setActionMessage('Ingreso registrado.')
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'No se pudo registrar el ingreso.')
    } finally { setIsSubmitting(false) }
  }

  async function handleLoadMore() {
    if (!cursor || isLoadingMore) return
    setLoadMoreError('')
    setIsLoadingMore(true)
    try {
      const page = await getIncomesPage(cursor)
      setIncomes((current) => appendUniqueIncomes(current, page.incomes))
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch (error: unknown) {
      setLoadMoreError(error instanceof Error ? error.message : 'No se pudieron cargar más ingresos.')
    } finally { setIsLoadingMore(false) }
  }

  function startEditing(income: Income) {
    setActionError('')
    setActionMessage('')
    setEditingIncome(income)
    setEditingAmount(income.monto)
    setEditingCategoryId(income.categoriaIngresoId)
    setEditingDate(income.fecha)
    setEditingDescription(income.descripcion ?? '')
  }

  function cancelEditing() {
    setActionError('')
    setEditingIncome(null)
    setEditingAmount('')
    setEditingCategoryId('')
    setEditingDate('')
    setEditingDescription('')
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingIncome || isSubmitting) return
    const trimmedAmount = editingAmount.trim()
    const validationError = validateIncome(trimmedAmount, editingDate)
    const selectedCategoryIsActive = activeCategories.some((category) => category.id === editingCategoryId)
    if (validationError || !selectedCategoryIsActive) {
      setActionError(validationError || 'Elegí una categoría activa para guardar los cambios.')
      return
    }
    setActionError('')
    setActionMessage('')
    setIsSubmitting(true)
    try {
      await updateIncome({ ingresoId: editingIncome.id, categoriaIngresoId: editingCategoryId, monto: trimmedAmount, fecha: editingDate, descripcion: editingDescription })
      await refreshHistory()
      cancelEditing()
      setActionMessage('Ingreso actualizado.')
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'No se pudo actualizar el ingreso.')
    } finally { setIsSubmitting(false) }
  }

  async function handleDelete(incomeId: string) {
    if (isSubmitting || !window.confirm('¿Eliminar este ingreso?')) return
    setActionError('')
    setActionMessage('')
    setIsSubmitting(true)
    try {
      await deleteIncome(incomeId)
      await refreshHistory()
      if (editingIncome?.id === incomeId) cancelEditing()
      setActionMessage('Ingreso eliminado.')
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'No se pudo eliminar el ingreso.')
    } finally { setIsSubmitting(false) }
  }

  const editingCategoryIsActive = activeCategories.some((category) => category.id === editingCategoryId)

  return (
    <>
      <SectionHeader id="income-movements-title" title="Movimientos" description="Registrá tus ingresos y consultá el historial de dinero recibido." />
      <div className="mb-6"><FinancialSectionLinks section="ingresos" /></div>
      <section className="app-panel mb-6" aria-labelledby="new-income-title">
        <h3 id="new-income-title" className="app-text mb-4 text-2xl font-semibold">Registrar ingreso</h3>
        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
          <label className="app-text block text-sm font-semibold">Monto<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required disabled={isSubmitting} className="app-control mt-1" /></label>
          <label className="app-text block text-sm font-semibold">Fecha<input type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} required disabled={isSubmitting} className="app-control mt-1" /></label>
          <label className="app-text block text-sm font-semibold md:col-span-2">Categoría<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required disabled={isSubmitting || isCategoriesLoading} className="app-control mt-1"><option value="">Seleccioná una categoría</option>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select></label>
          <label className="app-text block text-sm font-semibold md:col-span-2">Descripción (opcional)<input value={description} onChange={(event) => setDescription(event.target.value)} disabled={isSubmitting} className="app-control mt-1" /></label>
          <div className="md:col-span-2">
            {categoriesError && <div className="mb-3"><p role="alert" className="app-error mb-2 text-sm">{categoriesError}</p><button type="button" onClick={() => setCategoriesRetry((count) => count + 1)} className="app-action">Reintentar categorías</button></div>}
            {!isCategoriesLoading && !categoriesError && activeCategories.length === 0 && <p className="app-muted mb-3 text-sm">No tenés categorías activas. <Link to="/personal/categorias#ingresos" className="app-link">Administrar categorías</Link></p>}
            {actionError && !editingIncome && <p role="alert" className="app-error mb-3 text-sm">{actionError}</p>}
            {actionMessage && <p role="status" className="app-success mb-3 text-sm">{actionMessage}</p>}
            <button type="submit" disabled={isSubmitting || isCategoriesLoading || !!categoriesError || activeCategories.length === 0} className="app-button-primary w-full sm:w-auto">{isSubmitting ? 'Guardando...' : 'Registrar ingreso'}</button>
          </div>
        </form>
      </section>

      <section className="app-panel" aria-labelledby="income-history-title">
        <h3 id="income-history-title" className="app-text mb-5 text-2xl font-semibold">Historial de ingresos</h3>
        {isHistoryLoading ? <p className="app-muted">Cargando historial...</p> : historyError ? <div><p role="alert" className="app-error mb-3">{historyError}</p><button type="button" onClick={() => setHistoryRetry((count) => count + 1)} className="app-button-primary">Reintentar</button></div> : incomes.length === 0 ? (
          <EmptyState title="No hay ingresos registrados" description="Agregá tu primer ingreso para empezar a ver cómo evoluciona." />
        ) : (
          <ul className="space-y-6">
            {groupIncomesByDate(incomes).map((group) => <li key={group.fecha} className="list-none"><h4 className="app-divider app-muted mb-3 border-b pb-2 text-sm font-semibold uppercase tracking-wide">{formatIncomeDateGroup(group.fecha)}</h4><ul className="space-y-4">{group.incomes.map((income) => <li key={income.id} className="app-divider min-w-0 border-b pb-4">{editingIncome?.id === income.id ? (
              <form onSubmit={handleUpdate} className="space-y-3">
                <input aria-label="Monto" inputMode="decimal" value={editingAmount} onChange={(event) => setEditingAmount(event.target.value)} required disabled={isSubmitting} className="app-control" />
                <input aria-label="Fecha" type="date" max={today} value={editingDate} onChange={(event) => setEditingDate(event.target.value)} required disabled={isSubmitting} className="app-control" />
                <select aria-label="Categoría" value={editingCategoryId} onChange={(event) => setEditingCategoryId(event.target.value)} required disabled={isSubmitting} className="app-control"><option value="">Seleccioná una categoría activa</option>{income.categoriaEstado === 'ARCHIVADA' && <option value={income.categoriaIngresoId} disabled>{income.categoriaNombre} (archivada)</option>}{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select>
                {income.categoriaEstado === 'ARCHIVADA' && !editingCategoryIsActive && <p className="app-muted text-sm">Esta categoría está archivada. Elegí una categoría activa para guardar los cambios.</p>}
                <input aria-label="Descripción (opcional)" value={editingDescription} onChange={(event) => setEditingDescription(event.target.value)} disabled={isSubmitting} className="app-control" />
                {actionError && <p role="alert" className="app-error text-sm">{actionError}</p>}
                <div className="flex flex-wrap gap-1"><button type="submit" disabled={isSubmitting || !editingCategoryIsActive} className="app-action">Guardar</button><button type="button" onClick={cancelEditing} disabled={isSubmitting} className="app-action">Cancelar</button></div>
              </form>
            ) : (
              <><div className="flex min-w-0 flex-wrap items-center gap-2"><p className="break-words text-lg font-bold text-emerald-700 dark:text-emerald-300">+ {currencyFormatter.format(Number(income.monto))}</p>{income.categoriaEstado === 'ARCHIVADA' && <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--color-text-muted)]">ARCHIVADA</span>}</div><p className="app-muted">{income.categoriaNombre}</p>{income.descripcion && <p className="app-muted mt-1 break-words">{income.descripcion}</p>}<div className="mt-2 flex flex-wrap gap-1"><button type="button" onClick={() => startEditing(income)} disabled={isSubmitting || !!editingIncome} className="app-action">Editar</button><button type="button" onClick={() => void handleDelete(income.id)} disabled={isSubmitting} className="app-action-danger">Eliminar</button></div></>
            )}</li>)}</ul></li>)}
          </ul>
        )}
        {loadMoreError && <p role="alert" className="app-error mt-3 text-sm">{loadMoreError}</p>}
        {!isHistoryLoading && !historyError && hasMore && <button type="button" onClick={() => void handleLoadMore()} disabled={isLoadingMore} className="app-button-secondary mt-5">{isLoadingMore ? 'Cargando...' : 'Mostrar más'}</button>}
      </section>
    </>
  )
}
