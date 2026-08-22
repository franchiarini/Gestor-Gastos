import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase'
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
import { createSharedSpace } from '../domain/createSharedSpace'
import { getSharedSpaces } from '../domain/getSharedSpaces'
import type { SharedSpace } from '../domain/getSharedSpaces'
import { previewSharedSpaceByCode } from '../domain/previewSharedSpaceByCode'
import type { SharedSpacePreview } from '../domain/previewSharedSpaceByCode'
import { joinSharedSpaceByCode } from '../domain/joinSharedSpaceByCode'
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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
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
  const [sharedSpaces, setSharedSpaces] = useState<SharedSpace[]>([])
  const [newSharedSpaceName, setNewSharedSpaceName] = useState('')
  const [createdAccessCode, setCreatedAccessCode] = useState('')
  const [sharedSpaceError, setSharedSpaceError] = useState('')
  const [isSharedSpaceSubmitting, setIsSharedSpaceSubmitting] = useState(false)
  const [accessCode, setAccessCode] = useState('')
  const [sharedSpacePreview, setSharedSpacePreview] = useState<SharedSpacePreview | null>(null)
  const [joinError, setJoinError] = useState('')
  const [joinMessage, setJoinMessage] = useState('')
  const [isJoinSubmitting, setIsJoinSubmitting] = useState(false)

  const activeCategories = categories.filter((category) => category.estado === 'ACTIVA')
  const archivedCategories = categories.filter(
    (category) => category.estado === 'ARCHIVADA',
  )
  const activeSharedSpaces = sharedSpaces.filter((sharedSpace) => sharedSpace.estado === 'ACTIVO')
  const archivedSharedSpaces = sharedSpaces.filter((sharedSpace) => sharedSpace.estado === 'ARCHIVADO')

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError('')

    getPersonalSpace()
      .then(async (personalSpace) => {
        const [personalSpaceCategories, personalSpaceExpenses, userSharedSpaces] = await Promise.all([
          getCategoriesForSpace(personalSpace.id),
          getPersonalExpenses(personalSpace.id),
          getSharedSpaces(),
        ])

        if (isMounted) {
          setSpace(personalSpace)
          setCategories(personalSpaceCategories)
          setExpenses(personalSpaceExpenses)
          setSharedSpaces(userSharedSpaces)
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

  async function handleSignOut() {
    if (isSigningOut) {
      return
    }

    setSignOutError('')
    setIsSigningOut(true)

    const { error: logoutError } = await supabase.auth.signOut()

    if (logoutError) {
      setSignOutError(logoutError.message)
      setIsSigningOut(false)
    }
  }

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
      setExpenses(await getPersonalExpenses(space.id))
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
      setExpenses(await getPersonalExpenses(space.id))
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
      setExpenses(await getPersonalExpenses(space.id))
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
      setExpenses((currentExpenses) =>
        currentExpenses.filter((expense) => expense.id !== expenseId),
      )
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

  async function handleCreateSharedSpace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSharedSpaceSubmitting) {
      return
    }

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
      setSharedSpaces((currentSpaces) =>
        [
          ...currentSpaces,
          {
            id: createdSpace.id,
            nombre: createdSpace.nombre,
            estado: 'ACTIVO',
          },
        ].sort((first, second) =>
          first.nombre.localeCompare(second.nombre) || first.id.localeCompare(second.id),
        ),
      )
      setCreatedAccessCode(createdSpace.codigoAcceso)
      setNewSharedSpaceName('')
    } catch (createError: unknown) {
      setSharedSpaceError(
        createError instanceof Error
          ? createError.message
          : 'No se pudo crear el espacio compartido.',
      )
    } finally {
      setIsSharedSpaceSubmitting(false)
    }
  }

  async function handlePreviewSharedSpace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isJoinSubmitting) {
      return
    }

    setJoinError('')
    setJoinMessage('')
    setSharedSpacePreview(null)
    setIsJoinSubmitting(true)

    try {
      setSharedSpacePreview(await previewSharedSpaceByCode(accessCode))
    } catch (previewError: unknown) {
      setJoinError(
        previewError instanceof Error
          ? previewError.message
          : 'No se pudo buscar el espacio compartido.',
      )
    } finally {
      setIsJoinSubmitting(false)
    }
  }

  async function handleJoinSharedSpace() {
    if (!sharedSpacePreview || isJoinSubmitting) {
      return
    }

    setJoinError('')
    setJoinMessage('')
    setIsJoinSubmitting(true)

    try {
      const result = await joinSharedSpaceByCode(accessCode)
      setSharedSpaces(await getSharedSpaces())

      if (result.resultado === 'ALREADY_MEMBER') {
        setJoinMessage('Ya pertenecés a este espacio.')
      } else {
        setJoinMessage(
          result.resultado === 'REACTIVATED'
            ? 'Tu membresía fue reactivada correctamente.'
            : 'Te uniste al espacio correctamente.',
        )
      }

      setAccessCode('')
      setSharedSpacePreview(null)
    } catch (joinRequestError: unknown) {
      setJoinError(
        joinRequestError instanceof Error
          ? joinRequestError.message
          : 'No se pudo completar la unión al espacio.',
      )
    } finally {
      setIsJoinSubmitting(false)
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
            {expenses.map((expense) => (
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
        )}
        </section>
        <section className="app-panel mx-auto mb-6 max-w-4xl text-left">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            Espacios compartidos
          </h2>
          {activeSharedSpaces.length === 0 ? (
            <p className="mb-4 text-gray-600">
              Todavía no pertenecés a ningún espacio compartido.
            </p>
          ) : (
            <ul className="mb-4 space-y-2 text-left text-gray-600">
              {activeSharedSpaces.map((sharedSpace) => (
                <li key={sharedSpace.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 break-words">{sharedSpace.nombre}</span>
                  <Link
                    to={`/spaces/${sharedSpace.id}`}
                    className="app-link"
                  >
                    Abrir
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleCreateSharedSpace} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newSharedSpaceName}
              onChange={(event) => setNewSharedSpaceName(event.target.value)}
              placeholder="Nombre del espacio"
              aria-label="Nombre del espacio"
              required
              disabled={isSharedSpaceSubmitting}
              className="app-control flex-1"
            />
            <button
              type="submit"
              disabled={isSharedSpaceSubmitting}
              className="app-button-primary w-full sm:w-auto"
            >
              {isSharedSpaceSubmitting ? 'Creando...' : 'Crear espacio'}
            </button>
          </form>
          {sharedSpaceError && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {sharedSpaceError}
            </p>
          )}
          {createdAccessCode && (
            <p className="mt-3 text-gray-700">
              Código de acceso:{' '}
              <span className="font-semibold">
                {createdAccessCode.slice(0, 4)}-{createdAccessCode.slice(4)}
              </span>
              . Podés compartirlo con otras personas.
            </p>
          )}
          <div className="mt-6 border-t border-gray-200 pt-6">
            <form onSubmit={handlePreviewSharedSpace} className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={accessCode}
                onChange={(event) => {
                  setAccessCode(event.target.value)
                  setSharedSpacePreview(null)
                  setJoinError('')
                  setJoinMessage('')
                }}
                placeholder="Código de acceso"
                aria-label="Código de acceso"
                required
                disabled={isJoinSubmitting}
                className="app-control flex-1"
              />
              <button
                type="submit"
                disabled={isJoinSubmitting}
                className="app-button-primary w-full sm:w-auto"
              >
                {isJoinSubmitting ? 'Buscando...' : 'Buscar'}
              </button>
            </form>
            {joinError && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {joinError}
              </p>
            )}
            {joinMessage && (
              <p role="status" className="app-success mt-3 text-sm">
                {joinMessage}
              </p>
            )}
            {sharedSpacePreview && (
              <div className="mt-4 text-gray-700">
                <p className="font-semibold">{sharedSpacePreview.nombre}</p>
                {sharedSpacePreview.membresiaEstado === 'ACTIVA' ? (
                  <p>Ya pertenecés a este espacio.</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleJoinSharedSpace}
                    disabled={isJoinSubmitting}
                    className="app-button-primary mt-2"
                  >
                    {isJoinSubmitting ? 'Uniéndome...' : 'Unirme'}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
        <section className="app-panel mx-auto mb-6 max-w-4xl text-left">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Espacios archivados</h2>
          {archivedSharedSpaces.length === 0 ? (
            <p className="text-gray-600">No tenés espacios compartidos archivados.</p>
          ) : (
            <ul className="space-y-2 text-left text-gray-600">
              {archivedSharedSpaces.map((sharedSpace) => (
                <li key={sharedSpace.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 break-words">{sharedSpace.nombre}</span>
                  <Link to={`/spaces/${sharedSpace.id}`} className="app-link">
                    Abrir
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="app-button-secondary"
        >
          {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>
        {signOutError && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {signOutError}
          </p>
        )}
      </div>
    </main>
  )
}

export default PersonalSpacePage
