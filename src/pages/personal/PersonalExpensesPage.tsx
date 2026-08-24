import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useOutletContext } from 'react-router'
import { createPersonalExpense } from '../../domain/createPersonalExpense'
import { deletePersonalExpense } from '../../domain/deletePersonalExpense'
import { appendUniqueExpenses, formatExpenseDateGroup, groupExpensesByDate } from '../../domain/expensePagination'
import type { ExpenseCursor } from '../../domain/expensePagination'
import { getCategoriesForSpace } from '../../domain/getCategoriesForSpace'
import type { SpaceCategory } from '../../domain/getCategoriesForSpace'
import { getPersonalExpenses } from '../../domain/getPersonalExpenses'
import type { PersonalExpense } from '../../domain/getPersonalExpenses'
import { updatePersonalExpense } from '../../domain/updatePersonalExpense'
import type { PersonalSpaceLayoutContext } from '../../layouts/PersonalSpaceLayout'

function getTodayLocalDate() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

const currencyFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })

function isValidAmount(amount: string) {
  return /^[0-9]+(?:\.[0-9]{1,2})?$/.test(amount) && Number(amount) > 0
}

export default function PersonalExpensesPage() {
  const { spaceId } = useOutletContext<PersonalSpaceLayoutContext>()
  const [categories, setCategories] = useState<SpaceCategory[]>([])
  const [expenses, setExpenses] = useState<PersonalExpense[]>([])
  const [cursor, setCursor] = useState<ExpenseCursor | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(getTodayLocalDate)
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [expenseError, setExpenseError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingAmount, setEditingAmount] = useState('')
  const [editingDate, setEditingDate] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [editingDescription, setEditingDescription] = useState('')

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setLoadError('')
    Promise.all([getCategoriesForSpace(spaceId), getPersonalExpenses(spaceId)])
      .then(([loadedCategories, page]) => {
        if (!isMounted) return
        setCategories(loadedCategories)
        setExpenses(page.expenses)
        setCursor(page.nextCursor)
        setHasMore(page.hasMore)
      })
      .catch((error: unknown) => { if (isMounted) setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los gastos.') })
      .finally(() => { if (isMounted) setIsLoading(false) })
    return () => { isMounted = false }
  }, [retryCount, spaceId])

  const activeCategories = categories.filter((category) => category.estado === 'ACTIVA')

  async function refreshExpenses() {
    const page = await getPersonalExpenses(spaceId)
    setExpenses(page.expenses)
    setCursor(page.nextCursor)
    setHasMore(page.hasMore)
    setLoadMoreError('')
  }

  async function handleLoadMore() {
    if (!cursor || isLoadingMore) return
    setLoadMoreError('')
    setIsLoadingMore(true)
    try {
      const page = await getPersonalExpenses(spaceId, cursor)
      setExpenses((current) => appendUniqueExpenses(current, page.expenses))
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch (error: unknown) {
      setLoadMoreError(error instanceof Error ? error.message : 'No se pudieron cargar más gastos.')
    } finally { setIsLoadingMore(false) }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    const trimmedAmount = amount.trim()
    if (!isValidAmount(trimmedAmount)) { setExpenseError('El monto debe ser mayor a cero y tener como máximo dos decimales.'); return }
    setExpenseError('')
    setIsSubmitting(true)
    try {
      await createPersonalExpense({ categoriaId: categoryId, monto: trimmedAmount, fecha: date, descripcion: description })
      await refreshExpenses()
      setAmount('')
      setDescription('')
      setDate(getTodayLocalDate())
    } catch (error: unknown) {
      setExpenseError(error instanceof Error ? error.message : 'No se pudo registrar el gasto.')
    } finally { setIsSubmitting(false) }
  }

  function startEditing(expense: PersonalExpense) {
    setExpenseError('')
    setEditingId(expense.id)
    setEditingAmount(expense.monto)
    setEditingDate(expense.fecha)
    setEditingCategoryId(expense.categoriaId)
    setEditingDescription(expense.descripcion ?? '')
  }

  function cancelEditing() {
    setEditingId(null)
    setEditingAmount('')
    setEditingDate('')
    setEditingCategoryId('')
    setEditingDescription('')
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingId || isSubmitting) return
    const trimmedAmount = editingAmount.trim()
    if (!isValidAmount(trimmedAmount)) { setExpenseError('El monto debe ser mayor a cero y tener como máximo dos decimales.'); return }
    setExpenseError('')
    setIsSubmitting(true)
    try {
      await updatePersonalExpense({ gastoId: editingId, categoriaId: editingCategoryId, monto: trimmedAmount, fecha: editingDate, descripcion: editingDescription })
      await refreshExpenses()
      cancelEditing()
    } catch (error: unknown) {
      setExpenseError(error instanceof Error ? error.message : 'No se pudo actualizar el gasto.')
    } finally { setIsSubmitting(false) }
  }

  async function handleDelete(expenseId: string) {
    if (isSubmitting || !window.confirm('¿Eliminar este gasto?')) return
    setExpenseError('')
    setIsSubmitting(true)
    try {
      await deletePersonalExpense(expenseId)
      await refreshExpenses()
      if (editingId === expenseId) cancelEditing()
    } catch (error: unknown) {
      setExpenseError(error instanceof Error ? error.message : 'No se pudo eliminar el gasto.')
    } finally { setIsSubmitting(false) }
  }

  if (isLoading) return <p className="app-muted text-center">Cargando gastos...</p>
  if (loadError) return <div className="app-panel mx-auto max-w-lg text-center"><p role="alert" className="app-error mb-4">{loadError}</p><button type="button" onClick={() => setRetryCount((count) => count + 1)} className="app-button-primary">Reintentar</button></div>

  return <div className="mx-auto max-w-4xl">
    <section className="app-panel mb-6">
      <h2 className="mb-3 text-2xl font-semibold text-gray-900">Agregar gasto</h2>
      <form onSubmit={handleCreate} className="space-y-4">
        <label className="block text-sm font-semibold text-gray-700">Monto<input aria-label="Monto" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required disabled={isSubmitting} className="app-control mt-1" /></label>
        <label className="block text-sm font-semibold text-gray-700">Fecha<input aria-label="Fecha" type="date" value={date} onChange={(event) => setDate(event.target.value)} required disabled={isSubmitting} className="app-control mt-1" /></label>
        <label className="block text-sm font-semibold text-gray-700">Categoría<select aria-label="Categoría" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required disabled={isSubmitting} className="app-control mt-1"><option value="">Seleccioná una categoría</option>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select></label>
        <label className="block text-sm font-semibold text-gray-700">Descripción (opcional)<input aria-label="Descripción (opcional)" value={description} onChange={(event) => setDescription(event.target.value)} disabled={isSubmitting} className="app-control mt-1" /></label>
        {expenseError && <p role="alert" className="text-sm text-red-600">{expenseError}</p>}
        <button type="submit" disabled={isSubmitting || activeCategories.length === 0} className="app-button-primary w-full">{isSubmitting ? 'Guardando gasto...' : 'Agregar gasto'}</button>
      </form>
    </section>

    <section className="app-panel">
      <h2 className="mb-3 text-2xl font-semibold text-gray-900">Gastos</h2>
      {expenses.length === 0 ? <p className="text-gray-600">Todavía no registraste gastos.</p> : <ul className="space-y-5 text-gray-600">{groupExpensesByDate(expenses).map((group) => <li key={group.fecha} className="list-none"><h3 className="mb-3 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:border-slate-700">{formatExpenseDateGroup(group.fecha)}</h3><ul className="space-y-4">{group.expenses.map((expense) => <li key={expense.id} className="border-b border-gray-200 pb-3">{editingId === expense.id ? <form onSubmit={handleUpdate} className="space-y-3"><input aria-label="Monto" inputMode="decimal" value={editingAmount} onChange={(event) => setEditingAmount(event.target.value)} required disabled={isSubmitting} className="app-control" /><input aria-label="Fecha" type="date" value={editingDate} onChange={(event) => setEditingDate(event.target.value)} required disabled={isSubmitting} className="app-control" /><select aria-label="Categoría" value={editingCategoryId} onChange={(event) => setEditingCategoryId(event.target.value)} required disabled={isSubmitting} className="app-control"><option value="">Seleccioná una categoría activa</option>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select><input aria-label="Descripción (opcional)" value={editingDescription} onChange={(event) => setEditingDescription(event.target.value)} disabled={isSubmitting} className="app-control" /><div className="flex gap-1"><button type="submit" disabled={isSubmitting} className="app-action">Guardar</button><button type="button" onClick={cancelEditing} disabled={isSubmitting} className="app-action">Cancelar</button></div></form> : <><p className="font-semibold text-gray-900">{currencyFormatter.format(Number(expense.monto))}</p><p>{expense.fecha} · {expense.categoria.nombre}</p>{expense.descripcion && <p>{expense.descripcion}</p>}<div className="mt-2 flex gap-1"><button type="button" onClick={() => startEditing(expense)} disabled={isSubmitting} className="app-action">Editar</button><button type="button" onClick={() => handleDelete(expense.id)} disabled={isSubmitting} className="app-action-danger">Eliminar</button></div></>}</li>)}</ul></li>)}</ul>}
      {loadMoreError && <p role="alert" className="mt-3 text-sm text-red-600">{loadMoreError}</p>}
      {hasMore && <button type="button" onClick={handleLoadMore} disabled={isLoadingMore} className="app-button-secondary mt-4">{isLoadingMore ? 'Cargando...' : 'Mostrar más'}</button>}
    </section>
  </div>
}
