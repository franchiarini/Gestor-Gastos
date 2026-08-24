import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getPersonalSpace } from '../domain/getPersonalSpace'
import type { PersonalSpace } from '../domain/getPersonalSpace'
import { getCategoriesForSpace } from '../domain/getCategoriesForSpace'
import type { SpaceCategory } from '../domain/getCategoriesForSpace'
import { createCategory } from '../domain/createCategory'
import { updateCategory } from '../domain/updateCategory'
import { createPersonalExpense } from '../domain/createPersonalExpense'
import { updatePersonalExpense } from '../domain/updatePersonalExpense'
import { deletePersonalExpense } from '../domain/deletePersonalExpense'
import { deleteCategory } from '../domain/deleteCategory'
import { getPersonalExpenses } from '../domain/getPersonalExpenses'
import type { PersonalExpense } from '../domain/getPersonalExpenses'
import { appendUniqueExpenses, formatExpenseDateGroup, groupExpensesByDate } from '../domain/expensePagination'
import type { ExpenseCursor } from '../domain/expensePagination'
import { MonthlySummary } from '../components/MonthlySummary'
import { ExpenseEvolution } from '../components/ExpenseEvolution'

function getTodayLocalDate() {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${today.getFullYear()}-${month}-${day}`
}

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

function PersonalSpacePage() {
  const [space, setSpace] = useState<PersonalSpace | null>(null)
  const [categories, setCategories] = useState<SpaceCategory[]>([])
  const [expenses, setExpenses] = useState<PersonalExpense[]>([])
  const [expenseCursor, setExpenseCursor] = useState<ExpenseCursor | null>(null)
  const [hasMoreExpenses, setHasMoreExpenses] = useState(false)
  const [isLoadingMoreExpenses, setIsLoadingMoreExpenses] = useState(false)
  const [loadMoreExpenseError, setLoadMoreExpenseError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false)
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(getTodayLocalDate)
  const [expenseCategoryId, setExpenseCategoryId] = useState('')
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseError, setExpenseError] = useState('')
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false)
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editingExpenseAmount, setEditingExpenseAmount] = useState('')
  const [editingExpenseDate, setEditingExpenseDate] = useState('')
  const [editingExpenseCategoryId, setEditingExpenseCategoryId] = useState('')
  const [editingExpenseDescription, setEditingExpenseDescription] = useState('')

  const activeCategories = categories.filter((category) => category.estado === 'ACTIVA')
  const archivedCategories = categories.filter(
    (category) => category.estado === 'ARCHIVADA',
  )

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError('')

    getPersonalSpace()
      .then(async (personalSpace) => {
        const [personalSpaceCategories, personalSpaceExpenses] = await Promise.all([
          getCategoriesForSpace(personalSpace.id),
          getPersonalExpenses(personalSpace.id),
        ])

        if (isMounted) {
          setSpace(personalSpace)
          setCategories(personalSpaceCategories)
          setExpenses(personalSpaceExpenses.expenses)
          setExpenseCursor(personalSpaceExpenses.nextCursor)
          setHasMoreExpenses(personalSpaceExpenses.hasMore)
        }
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar tu espacio personal.',
          )
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [retryCount])

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!space || isCategorySubmitting) {
      return
    }

    setCategoryError('')
    setIsCategorySubmitting(true)

    try {
      const category = await createCategory(space.id, newCategoryName)
      setCategories((currentCategories) =>
        [...currentCategories, category].sort((first, second) =>
          first.nombre.localeCompare(second.nombre),
        ),
      )
      setNewCategoryName('')
    } catch (createError: unknown) {
      setCategoryError(
        createError instanceof Error
          ? createError.message
          : 'No se pudo crear la categoría.',
      )
    } finally {
      setIsCategorySubmitting(false)
    }
  }

  function startEditingCategory(category: SpaceCategory) {
    setCategoryError('')
    setEditingCategoryId(category.id)
    setEditingCategoryName(category.nombre)
  }

  function cancelEditingCategory() {
    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  async function handleRenameCategory(categoryId: string) {
    if (!space || isCategorySubmitting) {
      return
    }

    setCategoryError('')
    setIsCategorySubmitting(true)

    try {
      const updatedCategory = await updateCategory(categoryId, {
        nombre: editingCategoryName,
      })
      setCategories((currentCategories) =>
        currentCategories
          .map((category) =>
            category.id === updatedCategory.id ? updatedCategory : category,
          )
          .sort((first, second) => first.nombre.localeCompare(second.nombre)),
      )
      await refreshExpenses()
      setAnalyticsRefreshKey((current) => current + 1)
      cancelEditingCategory()
    } catch (updateError: unknown) {
      setCategoryError(
        updateError instanceof Error
          ? updateError.message
          : 'No se pudo renombrar la categoría.',
      )
    } finally {
      setIsCategorySubmitting(false)
    }
  }

  async function handleArchiveCategory(categoryId: string) {
    if (isCategorySubmitting || !window.confirm('¿Archivar esta categoría?')) {
      return
    }

    setCategoryError('')
    setIsCategorySubmitting(true)

    try {
      await updateCategory(categoryId, { estado: 'ARCHIVADA' })
      setCategories((currentCategories) =>
        currentCategories.map((category) =>
          category.id === categoryId
            ? { ...category, estado: 'ARCHIVADA' }
            : category,
        ),
      )
    } catch (archiveError: unknown) {
      setCategoryError(
        archiveError instanceof Error
          ? archiveError.message
          : 'No se pudo archivar la categoría.',
      )
    } finally {
      setIsCategorySubmitting(false)
    }
  }

  async function handleRestoreCategory(categoryId: string) {
    if (!space || isCategorySubmitting) {
      return
    }

    setCategoryError('')
    setIsCategorySubmitting(true)

    try {
      await updateCategory(categoryId, { restaurar: true })
      setCategories(await getCategoriesForSpace(space.id))
    } catch (restoreError: unknown) {
      setCategoryError(
        restoreError instanceof Error
          ? restoreError.message
          : 'No se pudo desarchivar la categoría.',
      )
    } finally {
      setIsCategorySubmitting(false)
    }
  }

  async function refreshExpenses() {
    if (!space) return
    const page = await getPersonalExpenses(space.id)
    setExpenses(page.expenses)
    setExpenseCursor(page.nextCursor)
    setHasMoreExpenses(page.hasMore)
    setLoadMoreExpenseError('')
  }

  async function handleLoadMoreExpenses() {
    if (!space || !expenseCursor || isLoadingMoreExpenses) return
    setLoadMoreExpenseError('')
    setIsLoadingMoreExpenses(true)
    try {
      const page = await getPersonalExpenses(space.id, expenseCursor)
      setExpenses((current) => appendUniqueExpenses(current, page.expenses))
      setExpenseCursor(page.nextCursor)
      setHasMoreExpenses(page.hasMore)
    } catch (loadError: unknown) {
      setLoadMoreExpenseError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar más gastos.')
    } finally {
      setIsLoadingMoreExpenses(false)
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    if (isCategorySubmitting || !window.confirm('¿Eliminar esta categoría?')) {
      return
    }

    setCategoryError('')
    setIsCategorySubmitting(true)

    try {
      await deleteCategory(categoryId)
      setCategories((currentCategories) =>
        currentCategories.filter((category) => category.id !== categoryId),
      )
      if (editingCategoryId === categoryId) {
        cancelEditingCategory()
      }
    } catch (deleteError: unknown) {
      setCategoryError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar la categoría.',
      )
    } finally {
      setIsCategorySubmitting(false)
    }
  }

  async function handleCreateExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!space || isExpenseSubmitting) {
      return
    }

    const trimmedAmount = expenseAmount.trim()

    if (!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(trimmedAmount) || Number(trimmedAmount) <= 0) {
      setExpenseError('El monto debe ser mayor a cero y tener como máximo dos decimales.')
      return
    }

    setExpenseError('')
    setIsExpenseSubmitting(true)

    try {
      await createPersonalExpense({
        categoriaId: expenseCategoryId,
        monto: trimmedAmount,
        fecha: expenseDate,
        descripcion: expenseDescription,
      })
      await refreshExpenses()
      setAnalyticsRefreshKey((current) => current + 1)
      setExpenseAmount('')
      setExpenseDescription('')
      setExpenseDate(getTodayLocalDate())
    } catch (createError: unknown) {
      setExpenseError(
        createError instanceof Error
          ? createError.message
          : 'No se pudo registrar el gasto.',
      )
    } finally {
      setIsExpenseSubmitting(false)
    }
  }

  function startEditingExpense(expense: PersonalExpense) {
    setExpenseError('')
    setEditingExpenseId(expense.id)
    setEditingExpenseAmount(expense.monto)
    setEditingExpenseDate(expense.fecha)
    setEditingExpenseCategoryId(expense.categoriaId)
    setEditingExpenseDescription(expense.descripcion ?? '')
  }

  function cancelEditingExpense() {
    setEditingExpenseId(null)
    setEditingExpenseAmount('')
    setEditingExpenseDate('')
    setEditingExpenseCategoryId('')
    setEditingExpenseDescription('')
  }

  async function handleUpdateExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!space || !editingExpenseId || isExpenseSubmitting) {
      return
    }

    const trimmedAmount = editingExpenseAmount.trim()

    if (!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(trimmedAmount) || Number(trimmedAmount) <= 0) {
      setExpenseError('El monto debe ser mayor a cero y tener como máximo dos decimales.')
      return
    }

    setExpenseError('')
    setIsExpenseSubmitting(true)

    try {
      await updatePersonalExpense({
        gastoId: editingExpenseId,
        categoriaId: editingExpenseCategoryId,
        monto: trimmedAmount,
        fecha: editingExpenseDate,
        descripcion: editingExpenseDescription,
      })
      await refreshExpenses()
      setAnalyticsRefreshKey((current) => current + 1)
      cancelEditingExpense()
    } catch (updateError: unknown) {
      setExpenseError(
        updateError instanceof Error
          ? updateError.message
          : 'No se pudo actualizar el gasto.',
      )
    } finally {
      setIsExpenseSubmitting(false)
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    if (isExpenseSubmitting || !window.confirm('¿Eliminar este gasto?')) {
      return
    }

    setExpenseError('')
    setIsExpenseSubmitting(true)

    try {
      await deletePersonalExpense(expenseId)
      await refreshExpenses()
      setAnalyticsRefreshKey((current) => current + 1)
      if (editingExpenseId === expenseId) {
        cancelEditingExpense()
      }
    } catch (deleteError: unknown) {
      setExpenseError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar el gasto.',
      )
    } finally {
      setIsExpenseSubmitting(false)
    }
  }

  if (isLoading) {
    return <main className="app-page flex items-center justify-center"><p className="text-gray-600">{space ? 'Cargando categorías...' : 'Cargando Mis gastos...'}</p></main>
  }

  if (error || !space) {
    return (
      <main className="app-page flex items-center justify-center">
        <div className="app-panel w-full max-w-lg text-center">
          <p role="alert" className="mb-4 text-red-600">
            {error || 'No se pudo cargar tu espacio personal.'}
          </p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="app-button-primary"
          >
            Reintentar
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="app-page overflow-x-hidden">
      <div className="app-container text-center">
        <h1 className="mb-4 break-words text-4xl font-bold text-gray-900 sm:text-5xl">{space.nombre}</h1>
        <p className="text-lg text-gray-600 mb-6">Este es tu espacio personal.</p>
        <MonthlySummary spaceId={space.id} showMembers={false} refreshKey={analyticsRefreshKey} />
        <ExpenseEvolution spaceId={space.id} refreshKey={analyticsRefreshKey} />
        <section className="app-panel mx-auto mb-6 max-w-4xl text-left">
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">Categorías</h2>
        <form onSubmit={handleCreateCategory} className="mb-6 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="Nombre de categoría"
            aria-label="Nombre de categoría"
            disabled={isCategorySubmitting}
            className="app-control"
          />
          <button
            type="submit"
            disabled={isCategorySubmitting}
            className="app-button-primary w-full sm:w-auto"
          >
            {isCategorySubmitting ? 'Guardando...' : 'Agregar categoría'}
          </button>
        </form>
        {categoryError && (
          <p role="alert" className="mb-4 text-sm text-red-600">
            {categoryError}
          </p>
        )}
        <ul className="mb-8 space-y-3 text-gray-600">
          {activeCategories.map((category) => (
            <li key={category.id} className="flex flex-col items-start gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
              {editingCategoryId === category.id ? (
                <>
                  <input
                    type="text"
                    value={editingCategoryName}
                    onChange={(event) => setEditingCategoryName(event.target.value)}
                    aria-label={`Nuevo nombre para ${category.nombre}`}
                    disabled={isCategorySubmitting}
                    className="app-control flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => handleRenameCategory(category.id)}
                    disabled={isCategorySubmitting}
                    className="app-action"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditingCategory}
                    disabled={isCategorySubmitting}
                    className="app-action text-gray-700 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span>{category.nombre}</span>
                  <span className="flex flex-wrap gap-1 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => startEditingCategory(category)}
                      disabled={isCategorySubmitting}
                      className="app-action"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchiveCategory(category.id)}
                      disabled={isCategorySubmitting}
                      className="app-action"
                    >
                      Archivar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(category.id)}
                      disabled={isCategorySubmitting}
                      className="app-action-danger"
                    >
                      Eliminar
                    </button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Categorías archivadas
        </h2>
        {archivedCategories.length === 0 ? (
          <p className="mb-8 text-gray-600">No hay categorías archivadas.</p>
        ) : (
          <ul className="mb-8 space-y-3 text-gray-600">
            {archivedCategories.map((category) => (
              <li key={category.id} className="flex flex-col items-start gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                {editingCategoryId === category.id ? (
                  <>
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={(event) => setEditingCategoryName(event.target.value)}
                      aria-label={`Nuevo nombre para ${category.nombre}`}
                      disabled={isCategorySubmitting}
                      className="app-control flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleRenameCategory(category.id)}
                      disabled={isCategorySubmitting}
                      className="app-action"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditingCategory}
                      disabled={isCategorySubmitting}
                      className="app-action text-gray-700 hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span>{category.nombre}</span>
                    <span className="flex flex-wrap gap-1 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => startEditingCategory(category)}
                        disabled={isCategorySubmitting}
                        className="app-action"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRestoreCategory(category.id)}
                        disabled={isCategorySubmitting}
                        className="app-action"
                      >
                        Desarchivar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category.id)}
                        disabled={isCategorySubmitting}
                      className="app-action"
                      >
                        Eliminar
                      </button>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        </section>
        <section className="app-panel mx-auto mb-6 max-w-4xl text-left">
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">Agregar gasto</h2>
        <form onSubmit={handleCreateExpense} className="mb-8 space-y-4 text-left">
          <div>
            <label htmlFor="expense-amount" className="block text-sm font-semibold text-gray-700 mb-1">
              Monto
            </label>
            <input
              id="expense-amount"
              type="text"
              inputMode="decimal"
              value={expenseAmount}
              onChange={(event) => setExpenseAmount(event.target.value)}
              required
              disabled={isExpenseSubmitting}
              className="app-control"
            />
          </div>
          <div>
            <label htmlFor="expense-date" className="block text-sm font-semibold text-gray-700 mb-1">
              Fecha
            </label>
            <input
              id="expense-date"
              type="date"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
              required
              disabled={isExpenseSubmitting}
              className="app-control"
            />
          </div>
          <div>
            <label htmlFor="expense-category" className="block text-sm font-semibold text-gray-700 mb-1">
              Categoría
            </label>
            <select
              id="expense-category"
              value={expenseCategoryId}
              onChange={(event) => setExpenseCategoryId(event.target.value)}
              required
              disabled={isExpenseSubmitting}
              className="app-control"
            >
              <option value="">Seleccioná una categoría</option>
              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="expense-description" className="block text-sm font-semibold text-gray-700 mb-1">
              Descripción (opcional)
            </label>
            <input
              id="expense-description"
              type="text"
              value={expenseDescription}
              onChange={(event) => setExpenseDescription(event.target.value)}
              disabled={isExpenseSubmitting}
              className="app-control"
            />
          </div>
          {expenseError && (
            <p role="alert" className="text-sm text-red-600">
              {expenseError}
            </p>
          )}
          <button
            type="submit"
            disabled={isExpenseSubmitting || activeCategories.length === 0}
            className="app-button-primary w-full"
          >
            {isExpenseSubmitting ? 'Guardando gasto...' : 'Agregar gasto'}
          </button>
        </form>
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">Gastos</h2>
        {expenses.length === 0 ? (
          <p className="mb-8 text-gray-600">Todavía no registraste gastos.</p>
        ) : (
          <ul className="mb-8 space-y-4 text-left text-gray-600">
            {groupExpensesByDate(expenses).map((group) => (
              <li key={group.fecha} className="list-none">
                <h3 className="mb-3 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:border-slate-700">
                  {formatExpenseDateGroup(group.fecha)}
                </h3>
                <ul className="space-y-4">
                {group.expenses.map((expense) => (
              <li key={expense.id} className="border-b border-gray-200 pb-3">
                {editingExpenseId === expense.id ? (
                  <form onSubmit={handleUpdateExpense} className="space-y-3">
                    <input
                      aria-label="Monto"
                      type="text"
                      inputMode="decimal"
                      value={editingExpenseAmount}
                      onChange={(event) => setEditingExpenseAmount(event.target.value)}
                      required
                      disabled={isExpenseSubmitting}
                      className="app-control"
                    />
                    <input
                      aria-label="Fecha"
                      type="date"
                      value={editingExpenseDate}
                      onChange={(event) => setEditingExpenseDate(event.target.value)}
                      required
                      disabled={isExpenseSubmitting}
                      className="app-control"
                    />
                    <select
                      aria-label="Categoría"
                      value={editingExpenseCategoryId}
                      onChange={(event) => setEditingExpenseCategoryId(event.target.value)}
                      required
                      disabled={isExpenseSubmitting}
                      className="app-control"
                    >
                      <option value="">Seleccioná una categoría activa</option>
                      {activeCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.nombre}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label="Descripción (opcional)"
                      type="text"
                      value={editingExpenseDescription}
                      onChange={(event) => setEditingExpenseDescription(event.target.value)}
                      disabled={isExpenseSubmitting}
                      className="app-control"
                    />
                    <div className="flex flex-wrap gap-1">
                      <button type="submit" disabled={isExpenseSubmitting} className="app-action">
                        Guardar
                      </button>
                      <button type="button" onClick={cancelEditingExpense} disabled={isExpenseSubmitting} className="app-action text-gray-700 hover:bg-slate-100">
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                <p className="min-w-0 break-words font-semibold text-gray-900">
                  {currencyFormatter.format(Number(expense.monto))}
                </p>
                <p>{expense.fecha} · {expense.categoria.nombre}</p>
                {expense.descripcion && <p>{expense.descripcion}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      <button type="button" onClick={() => startEditingExpense(expense)} disabled={isExpenseSubmitting} className="app-action">
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDeleteExpense(expense.id)} disabled={isExpenseSubmitting} className="app-action-danger">
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </li>
                ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
        {loadMoreExpenseError && <p role="alert" className="mb-3 text-sm text-red-600">{loadMoreExpenseError}</p>}
        {hasMoreExpenses && (
          <button type="button" onClick={handleLoadMoreExpenses} disabled={isLoadingMoreExpenses} className="app-button-secondary mb-8">
            {isLoadingMoreExpenses ? 'Cargando...' : 'Mostrar más'}
          </button>
        )}
        </section>
      </div>
    </main>
  )
}

export default PersonalSpacePage
