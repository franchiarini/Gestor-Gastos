import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useOutletContext, useSearchParams } from 'react-router'
import { FinancialSectionLinks } from '../components/FinancialSectionLinks'
import { createPersonalExpense } from '../domain/createPersonalExpense'
import { createSharedExpense } from '../domain/createSharedExpense'
import { deletePersonalExpense } from '../domain/deletePersonalExpense'
import { deleteSharedExpense } from '../domain/deleteSharedExpense'
import {
  appendUniqueExpenses,
  formatExpenseDateGroup,
  groupExpensesByDate,
} from '../domain/expensePagination'
import type { ExpenseCursor } from '../domain/expensePagination'
import { getCategoriesForSpace } from '../domain/getCategoriesForSpace'
import type { SpaceCategory } from '../domain/getCategoriesForSpace'
import { getExpensesPage } from '../domain/getExpensesPage'
import type { GlobalExpense } from '../domain/getExpensesPage'
import { getPersonalSpace } from '../domain/getPersonalSpace'
import type { PersonalSpace } from '../domain/getPersonalSpace'
import { getSharedSpaceContext } from '../domain/getSharedSpaceContext'
import { getSharedSpaceMembers } from '../domain/getSharedSpaceMembers'
import type { SharedSpaceMember } from '../domain/getSharedSpaceMembers'
import { updatePersonalExpense } from '../domain/updatePersonalExpense'
import { updateSharedExpense } from '../domain/updateSharedExpense'
import type { AppLayoutContext } from '../layouts/AppLayout'

type Destination = { id: string; type: 'PERSONAL' | 'COMPARTIDO'; name: string }

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

export default function ExpensesPage() {
  const { sharedSpaces } = useOutletContext<AppLayoutContext>()
  const [searchParams] = useSearchParams()
  const requestedSpace = searchParams.get('space')
  const [personalSpace, setPersonalSpace] = useState<PersonalSpace | null>(null)
  const [isContextLoading, setIsContextLoading] = useState(true)
  const [contextError, setContextError] = useState('')
  const [contextRetry, setContextRetry] = useState(0)
  const [destinationId, setDestinationId] = useState('')
  const [historyFilter, setHistoryFilter] = useState<string | null>(null)
  const [categories, setCategories] = useState<SpaceCategory[]>([])
  const [members, setMembers] = useState<SharedSpaceMember[]>([])
  const [isFormContextLoading, setIsFormContextLoading] = useState(false)
  const [formContextError, setFormContextError] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(getTodayLocalDate)
  const [categoryId, setCategoryId] = useState('')
  const [payerId, setPayerId] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expenses, setExpenses] = useState<GlobalExpense[]>([])
  const [cursor, setCursor] = useState<ExpenseCursor | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')
  const [historyRetry, setHistoryRetry] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState('')
  const [editingExpense, setEditingExpense] = useState<GlobalExpense | null>(null)
  const [editingCategories, setEditingCategories] = useState<SpaceCategory[]>([])
  const [editingMembers, setEditingMembers] = useState<SharedSpaceMember[]>([])
  const [isEditingContextLoading, setIsEditingContextLoading] = useState(false)
  const [editingAmount, setEditingAmount] = useState('')
  const [editingDate, setEditingDate] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [editingPayerId, setEditingPayerId] = useState('')
  const [editingDescription, setEditingDescription] = useState('')

  const activeSharedSpaces = sharedSpaces.filter((space) => space.estado === 'ACTIVO')
  const archivedSharedSpaces = sharedSpaces.filter((space) => space.estado === 'ARCHIVADO')
  const destination: Destination | null = personalSpace && destinationId === personalSpace.id
    ? { id: personalSpace.id, type: 'PERSONAL', name: 'Espacio personal' }
    : activeSharedSpaces.find((space) => space.id === destinationId)
      ? { id: destinationId, type: 'COMPARTIDO', name: activeSharedSpaces.find((space) => space.id === destinationId)?.nombre ?? '' }
      : null
  const activeCategories = categories.filter((category) => category.estado === 'ACTIVA')

  useEffect(() => {
    let isMounted = true
    setIsContextLoading(true)
    setContextError('')
    getPersonalSpace()
      .then((space) => {
        if (!isMounted) return
        setPersonalSpace(space)
        setDestinationId((current) => current || space.id)
      })
      .catch((error: unknown) => {
        if (isMounted) setContextError(error instanceof Error ? error.message : 'No se pudieron cargar tus espacios.')
      })
      .finally(() => { if (isMounted) setIsContextLoading(false) })
    return () => { isMounted = false }
  }, [contextRetry])

  useEffect(() => {
    if (!personalSpace) return

    if (!requestedSpace) {
      setDestinationId(personalSpace.id)
      setHistoryFilter(null)
      return
    }

    if (requestedSpace === 'personal') {
      setDestinationId(personalSpace.id)
      setHistoryFilter(personalSpace.id)
      return
    }

    const requestedShared = sharedSpaces.find((space) => space.id === requestedSpace)

    if (!requestedShared) {
      setDestinationId(personalSpace.id)
      setHistoryFilter(null)
      return
    }

    setHistoryFilter(requestedShared.id)
    setDestinationId(
      requestedShared.estado === 'ACTIVO'
        ? requestedShared.id
        : personalSpace.id,
    )
  }, [personalSpace, requestedSpace, sharedSpaces])

  useEffect(() => {
    if (!destination) return
    let isMounted = true
    setCategoryId('')
    setPayerId('')
    setCategories([])
    setMembers([])
    setFormError('')
    setFormMessage('')
    setFormContextError('')
    setIsFormContextLoading(true)
    const request = destination.type === 'PERSONAL'
      ? getCategoriesForSpace(destination.id).then((loadedCategories) => ({ loadedCategories, loadedMembers: [] as SharedSpaceMember[] }))
      : Promise.all([getSharedSpaceContext(destination.id), getSharedSpaceMembers(destination.id)])
          .then(([context, loadedMembers]) => ({ loadedCategories: context.categorias, loadedMembers }))
    request
      .then(({ loadedCategories, loadedMembers }) => {
        if (!isMounted) return
        setCategories(loadedCategories)
        setMembers(loadedMembers)
      })
      .catch((error: unknown) => {
        if (isMounted) setFormContextError(error instanceof Error ? error.message : 'No se pudo preparar el formulario.')
      })
      .finally(() => { if (isMounted) setIsFormContextLoading(false) })
    return () => { isMounted = false }
  }, [destinationId, destination?.id, destination?.type])

  useEffect(() => {
    let isMounted = true
    setIsHistoryLoading(true)
    setHistoryError('')
    setLoadMoreError('')
    setExpenses([])
    setCursor(null)
    setHasMore(false)
    getExpensesPage(historyFilter)
      .then((page) => {
        if (!isMounted) return
        setExpenses(page.expenses)
        setCursor(page.nextCursor)
        setHasMore(page.hasMore)
      })
      .catch((error: unknown) => {
        if (isMounted) setHistoryError(error instanceof Error ? error.message : 'No se pudo cargar el historial.')
      })
      .finally(() => { if (isMounted) setIsHistoryLoading(false) })
    return () => { isMounted = false }
  }, [historyFilter, historyRetry])

  async function refreshHistory() {
    const page = await getExpensesPage(historyFilter)
    setExpenses(page.expenses)
    setCursor(page.nextCursor)
    setHasMore(page.hasMore)
    setLoadMoreError('')
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!destination || isSubmitting) return
    const trimmedAmount = amount.trim()
    if (!isValidAmount(trimmedAmount)) {
      setFormError('El monto debe ser mayor a cero y tener como máximo dos decimales.')
      return
    }
    setFormError('')
    setFormMessage('')
    setIsSubmitting(true)
    try {
      if (destination.type === 'PERSONAL') {
        await createPersonalExpense({ categoriaId: categoryId, monto: trimmedAmount, fecha: date, descripcion: description })
      } else {
        await createSharedExpense({ espacioId: destination.id, categoriaId: categoryId, pagadoPorMembresiaId: payerId, monto: trimmedAmount, fecha: date, descripcion: description })
      }
      await refreshHistory()
      setAmount('')
      setDate(getTodayLocalDate())
      setDescription('')
      setFormMessage(`Gasto registrado en ${destination.name}.`)
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'No se pudo registrar el gasto.')
    } finally { setIsSubmitting(false) }
  }

  async function handleLoadMore() {
    if (!cursor || isLoadingMore) return
    setLoadMoreError('')
    setIsLoadingMore(true)
    try {
      const page = await getExpensesPage(historyFilter, cursor)
      setExpenses((current) => appendUniqueExpenses(current, page.expenses))
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch (error: unknown) {
      setLoadMoreError(error instanceof Error ? error.message : 'No se pudieron cargar más gastos.')
    } finally { setIsLoadingMore(false) }
  }

  async function startEditing(expense: GlobalExpense) {
    if (expense.spaceStatus === 'ARCHIVADO') return
    setEditingExpense(expense)
    setEditingAmount(expense.amount)
    setEditingDate(expense.date)
    setEditingCategoryId(expense.categoryId)
    setEditingPayerId(expense.paidByMembershipId)
    setEditingDescription(expense.description ?? '')
    setFormError('')
    setIsEditingContextLoading(true)
    try {
      if (expense.spaceType === 'PERSONAL') {
        setEditingCategories(await getCategoriesForSpace(expense.spaceId))
        setEditingMembers([])
      } else {
        const [context, loadedMembers] = await Promise.all([
          getSharedSpaceContext(expense.spaceId),
          getSharedSpaceMembers(expense.spaceId),
        ])
        setEditingCategories(context.categorias)
        setEditingMembers(loadedMembers)
      }
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'No se pudo preparar la edición.')
      cancelEditing()
    } finally { setIsEditingContextLoading(false) }
  }

  function cancelEditing() {
    setEditingExpense(null)
    setEditingCategories([])
    setEditingMembers([])
    setEditingAmount('')
    setEditingDate('')
    setEditingCategoryId('')
    setEditingPayerId('')
    setEditingDescription('')
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingExpense || isSubmitting) return
    const trimmedAmount = editingAmount.trim()
    if (!isValidAmount(trimmedAmount)) {
      setFormError('El monto debe ser mayor a cero y tener como máximo dos decimales.')
      return
    }
    setFormError('')
    setIsSubmitting(true)
    try {
      if (editingExpense.spaceType === 'PERSONAL') {
        await updatePersonalExpense({ gastoId: editingExpense.id, categoriaId: editingCategoryId, monto: trimmedAmount, fecha: editingDate, descripcion: editingDescription })
      } else {
        await updateSharedExpense({ gastoId: editingExpense.id, categoriaId: editingCategoryId, pagadoPorMembresiaId: editingPayerId, monto: trimmedAmount, fecha: editingDate, descripcion: editingDescription })
      }
      await refreshHistory()
      cancelEditing()
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'No se pudo actualizar el gasto.')
    } finally { setIsSubmitting(false) }
  }

  async function handleDelete(expense: GlobalExpense) {
    if (expense.spaceStatus === 'ARCHIVADO' || isSubmitting || !window.confirm('¿Eliminar este gasto?')) return
    setFormError('')
    setIsSubmitting(true)
    try {
      if (expense.spaceType === 'PERSONAL') await deletePersonalExpense(expense.id)
      else await deleteSharedExpense(expense.id)
      await refreshHistory()
      if (editingExpense?.id === expense.id) cancelEditing()
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'No se pudo eliminar el gasto.')
    } finally { setIsSubmitting(false) }
  }

  if (isContextLoading) return <main className="app-page"><p className="app-muted text-center">Cargando espacios...</p></main>
  if (contextError || !personalSpace) return <main className="app-page"><div className="app-panel mx-auto max-w-lg text-center"><p role="alert" className="app-error mb-4">{contextError || 'No se encontró el espacio personal.'}</p><button type="button" onClick={() => setContextRetry((value) => value + 1)} className="app-button-primary">Reintentar</button></div></main>

  const currentCategoryIsActive = editingCategories.some((category) => category.id === editingCategoryId && category.estado === 'ACTIVA')
  const currentPayerIsActive = editingMembers.some((member) => member.membresiaId === editingPayerId)

  return (
    <main className="app-page">
      <div className="app-container">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">Centro de gastos</p>
          <h1 className="app-text text-3xl font-bold sm:text-4xl">Gastos</h1>
          <p className="app-muted mt-2">Registrá un gasto y consultá el historial de todos tus espacios.</p>
        </header>

        <div className="mb-6"><FinancialSectionLinks section="gastos" /></div>

        <section className="app-panel mb-6">
          <h2 className="app-text mb-4 text-2xl font-semibold">Registrar gasto</h2>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
            <label className="app-text block text-sm font-semibold md:col-span-2">Guardar en<select value={destinationId} onChange={(event) => setDestinationId(event.target.value)} disabled={isSubmitting} className="app-control mt-1"><option value={personalSpace.id}>Espacio personal</option>{activeSharedSpaces.map((space) => <option key={space.id} value={space.id}>{space.nombre}</option>)}</select></label>
            <label className="app-text block text-sm font-semibold">Monto<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required disabled={isSubmitting || isFormContextLoading} className="app-control mt-1" /></label>
            <label className="app-text block text-sm font-semibold">Fecha<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required disabled={isSubmitting || isFormContextLoading} className="app-control mt-1" /></label>
            <label className="app-text block text-sm font-semibold">Categoría<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required disabled={isSubmitting || isFormContextLoading} className="app-control mt-1"><option value="">Seleccioná una categoría</option>{activeCategories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select></label>
            {destination?.type === 'COMPARTIDO' && <label className="app-text block text-sm font-semibold">Quién pagó<select value={payerId} onChange={(event) => setPayerId(event.target.value)} required disabled={isSubmitting || isFormContextLoading} className="app-control mt-1"><option value="">Seleccioná quién pagó</option>{members.map((member) => <option key={member.membresiaId} value={member.membresiaId}>{member.nombre}</option>)}</select></label>}
            <label className="app-text block text-sm font-semibold md:col-span-2">Descripción (opcional)<input value={description} onChange={(event) => setDescription(event.target.value)} disabled={isSubmitting || isFormContextLoading} className="app-control mt-1" /></label>
            <div className="md:col-span-2">
              {formContextError && <p role="alert" className="app-error mb-3 text-sm">{formContextError}</p>}
              {formError && <p role="alert" className="app-error mb-3 text-sm">{formError}</p>}
              {formMessage && <p role="status" className="app-success mb-3 text-sm">{formMessage}</p>}
              <button type="submit" disabled={isSubmitting || isFormContextLoading || !!formContextError || activeCategories.length === 0 || (destination?.type === 'COMPARTIDO' && members.length === 0)} className="app-button-primary w-full sm:w-auto">{isSubmitting ? 'Guardando...' : 'Registrar gasto'}</button>
            </div>
          </form>
        </section>

        <section className="app-panel">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="app-text text-2xl font-semibold">Historial de gastos</h2>
            <label className="app-text block text-sm font-semibold sm:w-72">Ver<select value={historyFilter ?? ''} onChange={(event) => setHistoryFilter(event.target.value || null)} className="app-control mt-1"><option value="">Todos</option><option value={personalSpace.id}>Espacio personal</option>{activeSharedSpaces.length > 0 && <optgroup label="Activos">{activeSharedSpaces.map((space) => <option key={space.id} value={space.id}>{space.nombre}</option>)}</optgroup>}{archivedSharedSpaces.length > 0 && <optgroup label="Archivados">{archivedSharedSpaces.map((space) => <option key={space.id} value={space.id}>{space.nombre}</option>)}</optgroup>}</select></label>
          </div>

          {formError && !editingExpense && <p role="alert" className="app-error mb-4 text-sm">{formError}</p>}
          {isHistoryLoading ? <p className="app-muted">Cargando historial...</p> : historyError ? <div><p role="alert" className="app-error mb-3">{historyError}</p><button type="button" onClick={() => setHistoryRetry((value) => value + 1)} className="app-button-primary">Reintentar</button></div> : expenses.length === 0 ? <p className="app-muted">{historyFilter ? 'No hay gastos registrados en este espacio.' : 'Aún no hay gastos registrados.'}</p> : (
            <ul className="space-y-6">
              {groupExpensesByDate(expenses).map((group) => <li key={group.fecha} className="list-none"><h3 className="app-divider app-muted mb-3 border-b pb-2 text-sm font-semibold uppercase tracking-wide">{formatExpenseDateGroup(group.fecha)}</h3><ul className="space-y-4">{group.expenses.map((expense) => <li key={expense.id} className="app-divider min-w-0 border-b pb-4">{editingExpense?.id === expense.id ? (
                <form onSubmit={handleUpdate} className="space-y-3">
                  <div className="app-muted text-sm"><span className="font-semibold">Espacio:</span> {expense.spaceType === 'PERSONAL' ? 'Espacio personal' : expense.spaceName}</div>
                  {isEditingContextLoading ? <p className="app-muted">Preparando edición...</p> : <>
                    <input aria-label="Monto" inputMode="decimal" value={editingAmount} onChange={(event) => setEditingAmount(event.target.value)} required disabled={isSubmitting} className="app-control" />
                    <input aria-label="Fecha" type="date" value={editingDate} onChange={(event) => setEditingDate(event.target.value)} required disabled={isSubmitting} className="app-control" />
                    <select aria-label="Categoría" value={editingCategoryId} onChange={(event) => setEditingCategoryId(event.target.value)} required disabled={isSubmitting} className="app-control"><option value="">Seleccioná una categoría activa</option>{!currentCategoryIsActive && <option value={expense.categoryId} disabled>{expense.categoryName} (archivada)</option>}{editingCategories.filter((category) => category.estado === 'ACTIVA').map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select>
                    {expense.spaceType === 'COMPARTIDO' && <select aria-label="Quién pagó" value={editingPayerId} onChange={(event) => setEditingPayerId(event.target.value)} required disabled={isSubmitting} className="app-control"><option value="">Seleccioná un integrante activo</option>{!currentPayerIsActive && <option value={expense.paidByMembershipId} disabled>{expense.paidByName} (ya no es integrante activo)</option>}{editingMembers.map((member) => <option key={member.membresiaId} value={member.membresiaId}>{member.nombre}</option>)}</select>}
                    <input aria-label="Descripción (opcional)" value={editingDescription} onChange={(event) => setEditingDescription(event.target.value)} disabled={isSubmitting} className="app-control" />
                    {formError && <p role="alert" className="app-error text-sm">{formError}</p>}
                    <div className="flex flex-wrap gap-1"><button type="submit" disabled={isSubmitting || !currentCategoryIsActive || (expense.spaceType === 'COMPARTIDO' && !currentPayerIsActive)} className="app-action">Guardar</button><button type="button" onClick={cancelEditing} disabled={isSubmitting} className="app-action">Cancelar</button></div>
                  </>}
                </form>
              ) : <><div className="flex min-w-0 flex-wrap items-center gap-2"><p className="app-text break-words text-lg font-semibold">{currencyFormatter.format(Number(expense.amount))}</p>{expense.spaceStatus === 'ARCHIVADO' && <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--color-text-muted)]">ARCHIVADO</span>}</div><p className="app-muted">{expense.categoryName}</p><p className="app-muted text-sm">{expense.spaceType === 'PERSONAL' ? 'Espacio personal' : expense.spaceName}</p>{expense.spaceType === 'COMPARTIDO' && <><p className="app-muted text-sm">Pagó: {expense.paidByName}</p><p className="app-muted text-sm">Registrado por: {expense.registeredByName}</p></>}{expense.description && <p className="app-muted mt-1 break-words">{expense.description}</p>}{expense.spaceStatus !== 'ARCHIVADO' && <div className="mt-2 flex flex-wrap gap-1"><button type="button" onClick={() => void startEditing(expense)} disabled={isSubmitting || !!editingExpense} className="app-action">Editar</button><button type="button" onClick={() => void handleDelete(expense)} disabled={isSubmitting} className="app-action-danger">Eliminar</button></div>}</>}</li>)}</ul></li>)}
            </ul>
          )}
          {loadMoreError && <p role="alert" className="app-error mt-3 text-sm">{loadMoreError}</p>}
          {!isHistoryLoading && !historyError && hasMore && <button type="button" onClick={() => void handleLoadMore()} disabled={isLoadingMore} className="app-button-secondary mt-5">{isLoadingMore ? 'Cargando...' : 'Mostrar más'}</button>}
        </section>
      </div>
    </main>
  )
}
