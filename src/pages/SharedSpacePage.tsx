import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getSharedSpaceContext } from '../domain/getSharedSpaceContext'
import type { SharedSpaceContext } from '../domain/getSharedSpaceContext'
import { getSharedSpaceMembers } from '../domain/getSharedSpaceMembers'
import type { SharedSpaceMember } from '../domain/getSharedSpaceMembers'
import { getSharedExpenses } from '../domain/getSharedExpenses'
import type { SharedExpense } from '../domain/getSharedExpenses'
import { createSharedExpense } from '../domain/createSharedExpense'
import { updateSharedExpense } from '../domain/updateSharedExpense'
import { deleteSharedExpense } from '../domain/deleteSharedExpense'
import { createSharedCategory } from '../domain/createSharedCategory'
import { updateSharedCategory } from '../domain/updateSharedCategory'
import { deleteSharedCategory } from '../domain/deleteSharedCategory'
import { getSharedSpaceManagement } from '../domain/getSharedSpaceManagement'
import type { SharedSpaceManagement } from '../domain/getSharedSpaceManagement'
import { regenerateSharedSpaceCode } from '../domain/regenerateSharedSpaceCode'
import { promoteSharedSpaceMember } from '../domain/promoteSharedSpaceMember'
import { leaveSharedSpace } from '../domain/leaveSharedSpace'
import { expelSharedSpaceMember } from '../domain/expelSharedSpaceMember'
import { archiveSharedSpace } from '../domain/archiveSharedSpace'
import { reactivateSharedSpace } from '../domain/reactivateSharedSpace'
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

function isValidAmount(amount: string) {
  return /^[0-9]+(?:\.[0-9]{1,2})?$/.test(amount) && Number(amount) > 0
}

function SharedSpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>()
  const navigate = useNavigate()
  const [context, setContext] = useState<SharedSpaceContext | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [members, setMembers] = useState<SharedSpaceMember[]>([])
  const [expenses, setExpenses] = useState<SharedExpense[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(getTodayLocalDate)
  const [categoryId, setCategoryId] = useState('')
  const [payerId, setPayerId] = useState('')
  const [description, setDescription] = useState('')
  const [expenseError, setExpenseError] = useState('')
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false)
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editingAmount, setEditingAmount] = useState('')
  const [editingDate, setEditingDate] = useState('')
  const [editingExpenseCategoryId, setEditingExpenseCategoryId] = useState('')
  const [editingPayerId, setEditingPayerId] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [management, setManagement] = useState<SharedSpaceManagement | null>(null)
  const [managementError, setManagementError] = useState('')
  const [managementMessage, setManagementMessage] = useState('')
  const [isManagementSubmitting, setIsManagementSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError('')
    setContext(null)

    if (!spaceId) {
      setError('No se indicó un espacio compartido válido.')
      setIsLoading(false)
      return () => {
        isMounted = false
      }
    }

    Promise.all([
      getSharedSpaceContext(spaceId),
      getSharedSpaceMembers(spaceId),
      getSharedExpenses(spaceId),
      getSharedSpaceManagement(spaceId),
    ])
      .then(([sharedSpaceContext, activeMembers, sharedExpenses, sharedManagement]) => {
        if (isMounted) {
          setContext(sharedSpaceContext)
          setMembers(activeMembers)
          setExpenses(sharedExpenses)
          setManagement(sharedManagement)
        }
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar el espacio compartido.',
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
  }, [spaceId])

  async function refreshCategories() {
    if (spaceId) setContext(await getSharedSpaceContext(spaceId))
  }

  async function refreshExpenses() {
    if (spaceId) setExpenses(await getSharedExpenses(spaceId))
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!spaceId || isCategorySubmitting) return
    setCategoryError('')
    setIsCategorySubmitting(true)
    try {
      await createSharedCategory(spaceId, newCategoryName)
      await refreshCategories()
      setNewCategoryName('')
    } catch (requestError: unknown) {
      setCategoryError(requestError instanceof Error ? requestError.message : 'No se pudo crear la categoría.')
    } finally {
      setIsCategorySubmitting(false)
    }
  }

  function startEditingCategory(category: SharedSpaceContext['categorias'][number]) {
    setCategoryError('')
    setEditingCategoryId(category.id)
    setEditingCategoryName(category.nombre)
  }

  function cancelEditingCategory() {
    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  async function handleRenameCategory(categoryToUpdate: string) {
    if (isCategorySubmitting) return
    setCategoryError('')
    setIsCategorySubmitting(true)
    try {
      await updateSharedCategory(categoryToUpdate, { nombre: editingCategoryName })
      await Promise.all([refreshCategories(), refreshExpenses()])
      setAnalyticsRefreshKey((current) => current + 1)
      cancelEditingCategory()
    } catch (requestError: unknown) {
      setCategoryError(requestError instanceof Error ? requestError.message : 'No se pudo renombrar la categoría.')
    } finally {
      setIsCategorySubmitting(false)
    }
  }

  async function handleArchiveCategory(categoryToArchive: string) {
    if (isCategorySubmitting || !window.confirm('¿Archivar esta categoría?')) return
    setCategoryError('')
    setIsCategorySubmitting(true)
    try {
      await updateSharedCategory(categoryToArchive, { archivar: true })
      await refreshCategories()
    } catch (requestError: unknown) {
      setCategoryError(requestError instanceof Error ? requestError.message : 'No se pudo archivar la categoría.')
    } finally {
      setIsCategorySubmitting(false)
    }
  }

  async function handleRestoreCategory(categoryToRestore: string) {
    if (isCategorySubmitting) return
    setCategoryError('')
    setIsCategorySubmitting(true)
    try {
      await updateSharedCategory(categoryToRestore, { restaurar: true })
      await refreshCategories()
    } catch (requestError: unknown) {
      setCategoryError(requestError instanceof Error ? requestError.message : 'No se pudo desarchivar la categoría.')
    } finally {
      setIsCategorySubmitting(false)
    }
  }

  async function handleDeleteCategory(categoryToDelete: string) {
    if (isCategorySubmitting || !window.confirm('¿Eliminar esta categoría?')) return
    setCategoryError('')
    setIsCategorySubmitting(true)
    try {
      await deleteSharedCategory(categoryToDelete)
      await refreshCategories()
      if (editingCategoryId === categoryToDelete) cancelEditingCategory()
    } catch (requestError: unknown) {
      setCategoryError(requestError instanceof Error ? requestError.message : 'No se pudo eliminar la categoría.')
    } finally {
      setIsCategorySubmitting(false)
    }
  }

  async function handleCreateExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!spaceId || isExpenseSubmitting) return
    const trimmedAmount = amount.trim()
    if (!isValidAmount(trimmedAmount)) {
      setExpenseError('El monto debe ser mayor a cero y tener como máximo dos decimales.')
      return
    }
    setExpenseError('')
    setIsExpenseSubmitting(true)
    try {
      await createSharedExpense({ espacioId: spaceId, categoriaId: categoryId, pagadoPorMembresiaId: payerId, monto: trimmedAmount, fecha: date, descripcion: description })
      await refreshExpenses()
      setAnalyticsRefreshKey((current) => current + 1)
      setAmount('')
      setDescription('')
      setDate(getTodayLocalDate())
    } catch (requestError: unknown) {
      setExpenseError(requestError instanceof Error ? requestError.message : 'No se pudo registrar el gasto.')
    } finally {
      setIsExpenseSubmitting(false)
    }
  }

  function startEditingExpense(expense: SharedExpense) {
    setExpenseError('')
    setEditingExpenseId(expense.id)
    setEditingAmount(expense.monto)
    setEditingDate(expense.fecha)
    setEditingExpenseCategoryId(expense.categoriaId)
    setEditingPayerId(expense.pagadoPorMembresiaId)
    setEditingDescription(expense.descripcion ?? '')
  }

  function cancelEditingExpense() {
    setEditingExpenseId(null)
    setEditingAmount('')
    setEditingDate('')
    setEditingExpenseCategoryId('')
    setEditingPayerId('')
    setEditingDescription('')
  }

  async function handleUpdateExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingExpenseId || isExpenseSubmitting) return
    const trimmedAmount = editingAmount.trim()
    if (!isValidAmount(trimmedAmount)) {
      setExpenseError('El monto debe ser mayor a cero y tener como máximo dos decimales.')
      return
    }
    setExpenseError('')
    setIsExpenseSubmitting(true)
    try {
      await updateSharedExpense({ gastoId: editingExpenseId, categoriaId: editingExpenseCategoryId, pagadoPorMembresiaId: editingPayerId, monto: trimmedAmount, fecha: editingDate, descripcion: editingDescription })
      await refreshExpenses()
      setAnalyticsRefreshKey((current) => current + 1)
      cancelEditingExpense()
    } catch (requestError: unknown) {
      setExpenseError(requestError instanceof Error ? requestError.message : 'No se pudo actualizar el gasto.')
    } finally {
      setIsExpenseSubmitting(false)
    }
  }

  async function handleDeleteExpense(expenseToDelete: string) {
    if (isExpenseSubmitting || !window.confirm('¿Eliminar este gasto?')) return
    setExpenseError('')
    setIsExpenseSubmitting(true)
    try {
      await deleteSharedExpense(expenseToDelete)
      await refreshExpenses()
      setAnalyticsRefreshKey((current) => current + 1)
      if (editingExpenseId === expenseToDelete) cancelEditingExpense()
    } catch (requestError: unknown) {
      setExpenseError(requestError instanceof Error ? requestError.message : 'No se pudo eliminar el gasto.')
    } finally {
      setIsExpenseSubmitting(false)
    }
  }

  async function handleCopyAccessCode() {
    if (!management) return
    setManagementError('')
    setManagementMessage('')
    const formattedCode = `${management.codigoAcceso.slice(0, 4)}-${management.codigoAcceso.slice(4)}`
    try {
      await navigator.clipboard.writeText(formattedCode)
      setManagementMessage('Código copiado.')
    } catch {
      setManagementError('No se pudo copiar el código. Seleccionalo y copialo manualmente.')
    }
  }

  async function handleRegenerateAccessCode() {
    if (!spaceId || !management || isManagementSubmitting) return
    if (!window.confirm('¿Regenerar el código? El código anterior dejará de funcionar.')) return
    setManagementError('')
    setManagementMessage('')
    setIsManagementSubmitting(true)
    try {
      const newCode = await regenerateSharedSpaceCode(spaceId)
      setManagement({ ...management, codigoAcceso: newCode })
      setManagementMessage('Código regenerado correctamente.')
    } catch (requestError: unknown) {
      setManagementError(requestError instanceof Error ? requestError.message : 'No se pudo regenerar el código.')
    } finally {
      setIsManagementSubmitting(false)
    }
  }

  async function handlePromoteMember(member: SharedSpaceMember) {
    if (!spaceId || isManagementSubmitting) return
    if (!window.confirm(`¿Promover a ${member.nombre} a administrador?`)) return
    setManagementError('')
    setManagementMessage('')
    setIsManagementSubmitting(true)
    try {
      await promoteSharedSpaceMember(spaceId, member.membresiaId)
      setMembers(await getSharedSpaceMembers(spaceId))
      setManagementMessage('Integrante promovido correctamente.')
    } catch (requestError: unknown) {
      setManagementError(requestError instanceof Error ? requestError.message : 'No se pudo promover al integrante.')
    } finally {
      setIsManagementSubmitting(false)
    }
  }

  async function handleExpelMember(member: SharedSpaceMember) {
    if (!spaceId || isManagementSubmitting) return
    if (!window.confirm(`¿Expulsar a ${member.nombre} del espacio?`)) return
    setManagementError('')
    setManagementMessage('')
    setIsManagementSubmitting(true)
    try {
      await expelSharedSpaceMember(spaceId, member.membresiaId)
      const [activeMembers, sharedExpenses] = await Promise.all([
        getSharedSpaceMembers(spaceId),
        getSharedExpenses(spaceId),
      ])
      setMembers(activeMembers)
      setExpenses(sharedExpenses)
      setManagementMessage('Integrante expulsado correctamente.')
    } catch (requestError: unknown) {
      setManagementError(requestError instanceof Error ? requestError.message : 'No se pudo expulsar al integrante.')
    } finally {
      setIsManagementSubmitting(false)
    }
  }

  async function handleLeaveSpace() {
    if (!spaceId || isManagementSubmitting) return
    if (!window.confirm('¿Abandonar este espacio compartido?')) return
    setManagementError('')
    setManagementMessage('')
    setIsManagementSubmitting(true)
    try {
      await leaveSharedSpace(spaceId)
      navigate('/')
    } catch (requestError: unknown) {
      setManagementError(requestError instanceof Error ? requestError.message : 'No se pudo abandonar el espacio.')
      setIsManagementSubmitting(false)
    }
  }

  async function handleArchiveSpace() {
    if (!spaceId || isManagementSubmitting) return
    if (!window.confirm('¿Archivar este espacio compartido?')) return
    setManagementError('')
    setManagementMessage('')
    setIsManagementSubmitting(true)
    try {
      await archiveSharedSpace(spaceId)
      setContext(await getSharedSpaceContext(spaceId))
      cancelEditingCategory()
      cancelEditingExpense()
      setManagementMessage('Espacio archivado correctamente.')
    } catch (requestError: unknown) {
      setManagementError(requestError instanceof Error ? requestError.message : 'No se pudo archivar el espacio.')
    } finally {
      setIsManagementSubmitting(false)
    }
  }

  async function handleReactivateSpace() {
    if (!spaceId || isManagementSubmitting) return
    if (!window.confirm('¿Reactivar este espacio compartido?')) return
    setManagementError('')
    setManagementMessage('')
    setIsManagementSubmitting(true)
    try {
      await reactivateSharedSpace(spaceId)
      setContext(await getSharedSpaceContext(spaceId))
      setManagementMessage('Espacio reactivado correctamente.')
    } catch (requestError: unknown) {
      setManagementError(requestError instanceof Error ? requestError.message : 'No se pudo reactivar el espacio.')
    } finally {
      setIsManagementSubmitting(false)
    }
  }

  if (isLoading) {
    return <main className="app-page flex items-center justify-center"><p className="text-gray-600">Cargando espacio compartido...</p></main>
  }

  if (error || !context) {
    return (
      <main className="app-page flex items-center justify-center text-center">
        <div className="app-panel w-full max-w-lg">
        <p role="alert" className="mb-4 text-red-700">
          {error || 'No se pudo cargar el espacio compartido.'}
        </p>
        <Link to="/" className="app-button-primary">
          Volver a Mis gastos
        </Link>
        </div>
      </main>
    )
  }

  const activeCategories = context.categorias.filter(
    (category) => category.estado === 'ACTIVA',
  )
  const archivedCategories = context.categorias.filter(
    (category) => category.estado === 'ARCHIVADA',
  )
  const isArchived = context.estado === 'ARCHIVADO'
  const activeAdminCount = members.filter((member) => member.rol === 'ADMIN').length
  const isOnlyActiveAdmin = management?.rol === 'ADMIN' && activeAdminCount === 1

  return (
    <main className="app-page overflow-x-hidden">
      <div className="app-container">
        <h1 className="mb-2 break-words text-4xl font-bold text-gray-900 sm:text-5xl">{context.nombre}</h1>
        <p className="mb-8 text-gray-600">
          Rol: {context.rol === 'ADMIN' ? 'Administrador' : 'Integrante'}
        </p>
        <MonthlySummary spaceId={context.id} showMembers refreshKey={analyticsRefreshKey} />
        <ExpenseEvolution spaceId={context.id} refreshKey={analyticsRefreshKey} />
        {isArchived && (
          <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950/60">
            <p className="font-bold text-amber-950 dark:text-amber-100">Espacio archivado</p>
            <p className="text-amber-900 dark:text-amber-200">Modo sólo lectura. El historial permanece disponible.</p>
          </div>
        )}
        {management?.rol === 'ADMIN' && (
          <button
            type="button"
            onClick={isArchived ? handleReactivateSpace : handleArchiveSpace}
            disabled={isManagementSubmitting}
            className="app-button-secondary mb-8"
          >
            {isArchived ? 'Reactivar espacio' : 'Archivar espacio'}
          </button>
        )}

        {management && (
          <>
            {!isArchived && <section className="app-panel mx-auto mb-6 max-w-4xl">
              <h2 className="mb-3 text-2xl font-semibold text-gray-900">Código de acceso</h2>
              <p className="mb-3 font-mono text-xl text-gray-800">
                {management.codigoAcceso.slice(0, 4)}-{management.codigoAcceso.slice(4)}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={handleCopyAccessCode} className="app-button-secondary w-full sm:w-auto">
                  Copiar
                </button>
                {management.rol === 'ADMIN' && (
                  <button type="button" onClick={handleRegenerateAccessCode} disabled={isManagementSubmitting} className="app-button-secondary w-full border-amber-300 text-amber-900 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-950/50 sm:w-auto">
                    {isManagementSubmitting ? 'Procesando...' : 'Regenerar código'}
                  </button>
                )}
              </div>
            </section>}

            <section className="app-panel mx-auto mb-6 max-w-4xl">
              <h2 className="mb-3 text-2xl font-semibold text-gray-900">Integrantes</h2>
              <ul className="space-y-3 text-gray-600">
                {members.map((member) => (
                  <li key={member.membresiaId} className="flex flex-col items-start gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0 break-words">
                      {member.nombre} · {member.rol === 'ADMIN' ? 'Administrador' : 'Integrante'}
                    </span>
                    <span className="flex flex-wrap gap-1 sm:justify-end">
                      {!isArchived && management.rol === 'ADMIN' && member.rol === 'INTEGRANTE' && (
                        <button type="button" onClick={() => handlePromoteMember(member)} disabled={isManagementSubmitting} className="app-action">
                          Promover a administrador
                        </button>
                      )}
                      {!isArchived && management.rol === 'ADMIN' && member.membresiaId !== management.membresiaId && (
                        <button type="button" onClick={() => handleExpelMember(member)} disabled={isManagementSubmitting} className="app-action-danger">
                          Expulsar
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {managementError && <p role="alert" className="app-error mb-4 text-sm">{managementError}</p>}
            {managementMessage && <p role="status" className="app-success mb-4 text-sm">{managementMessage}</p>}
          </>
        )}

        <section className="app-panel mx-auto mb-6 max-w-4xl">
          <h2 className="mb-3 text-2xl font-semibold text-gray-900">Categorías</h2>
          {!isArchived && <form onSubmit={handleCreateCategory} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input aria-label="Nombre de categoría" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Nombre de categoría" required disabled={isCategorySubmitting} className="app-control flex-1" />
            <button type="submit" disabled={isCategorySubmitting} className="app-button-primary w-full sm:w-auto">{isCategorySubmitting ? 'Guardando...' : 'Agregar categoría'}</button>
          </form>}
          {categoryError && <p role="alert" className="mb-3 text-sm text-red-600">{categoryError}</p>}
          {activeCategories.length === 0 ? (
            <p className="text-gray-600">No hay categorías activas.</p>
          ) : (
            <ul className="space-y-3 text-gray-600">
              {activeCategories.map((category) => (
                <li key={category.id} className="flex flex-col items-start gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  {!isArchived && editingCategoryId === category.id ? (
                    <>
                      <input aria-label={`Nuevo nombre para ${category.nombre}`} value={editingCategoryName} onChange={(event) => setEditingCategoryName(event.target.value)} disabled={isCategorySubmitting} className="app-control flex-1" />
                      <button type="button" onClick={() => handleRenameCategory(category.id)} disabled={isCategorySubmitting} className="app-action">Guardar</button>
                      <button type="button" onClick={cancelEditingCategory} disabled={isCategorySubmitting} className="app-action text-gray-700 hover:bg-slate-100">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <span>{category.nombre}</span>
                      {!isArchived && <span className="flex flex-wrap gap-1 sm:justify-end">
                        <button type="button" onClick={() => startEditingCategory(category)} disabled={isCategorySubmitting} className="app-action">Editar</button>
                        <button type="button" onClick={() => handleArchiveCategory(category.id)} disabled={isCategorySubmitting} className="app-action">Archivar</button>
                        <button type="button" onClick={() => handleDeleteCategory(category.id)} disabled={isCategorySubmitting} className="app-action-danger">Eliminar</button>
                      </span>}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {archivedCategories.length > 0 && (
          <section className="app-panel mx-auto mb-6 max-w-4xl bg-slate-50">
            <h2 className="mb-3 text-2xl font-semibold text-gray-900">
              Categorías archivadas
            </h2>
            <ul className="space-y-2 text-gray-600">
              {archivedCategories.map((category) => (
                <li key={category.id} className="flex flex-col items-start gap-2 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  {!isArchived && editingCategoryId === category.id ? (
                    <>
                      <input aria-label={`Nuevo nombre para ${category.nombre}`} value={editingCategoryName} onChange={(event) => setEditingCategoryName(event.target.value)} disabled={isCategorySubmitting} className="app-control flex-1" />
                      <button type="button" onClick={() => handleRenameCategory(category.id)} disabled={isCategorySubmitting} className="app-action">Guardar</button>
                      <button type="button" onClick={cancelEditingCategory} disabled={isCategorySubmitting} className="app-action text-gray-700 hover:bg-slate-100">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <span>{category.nombre}</span>
                      {!isArchived && <span className="flex flex-wrap gap-1 sm:justify-end">
                        <button type="button" onClick={() => startEditingCategory(category)} disabled={isCategorySubmitting} className="app-action">Editar</button>
                        <button type="button" onClick={() => handleRestoreCategory(category.id)} disabled={isCategorySubmitting} className="app-action">Desarchivar</button>
                        <button type="button" onClick={() => handleDeleteCategory(category.id)} disabled={isCategorySubmitting} className="app-action-danger">Eliminar</button>
                      </span>}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {!isArchived && <section className="app-panel mx-auto mb-6 max-w-4xl">
          <h2 className="mb-3 text-2xl font-semibold text-gray-900">Registrar gasto</h2>
          <form onSubmit={handleCreateExpense} className="space-y-3">
            <input aria-label="Monto" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Monto" inputMode="decimal" required disabled={isExpenseSubmitting} className="app-control" />
            <input aria-label="Fecha" type="date" value={date} onChange={(event) => setDate(event.target.value)} required disabled={isExpenseSubmitting} className="app-control" />
            <select aria-label="Categoría" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required disabled={isExpenseSubmitting} className="app-control">
              <option value="">Seleccioná una categoría</option>
              {activeCategories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}
            </select>
            <select aria-label="Quién pagó" value={payerId} onChange={(event) => setPayerId(event.target.value)} required disabled={isExpenseSubmitting} className="app-control">
              <option value="">Seleccioná quién pagó</option>
              {members.map((member) => <option key={member.membresiaId} value={member.membresiaId}>{member.nombre}</option>)}
            </select>
            <input aria-label="Descripción (opcional)" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descripción (opcional)" disabled={isExpenseSubmitting} className="app-control" />
            {expenseError && <p role="alert" className="text-sm text-red-600">{expenseError}</p>}
            <button type="submit" disabled={isExpenseSubmitting || activeCategories.length === 0 || members.length === 0} className="app-button-primary w-full">{isExpenseSubmitting ? 'Guardando...' : 'Registrar gasto'}</button>
          </form>
        </section>}

        <section className={`app-panel mx-auto mb-6 max-w-4xl ${isArchived ? 'bg-slate-50' : ''}`}>
          <h2 className="mb-3 text-2xl font-semibold text-gray-900">Gastos</h2>
          {expenses.length === 0 ? <p className="text-gray-600">Todavía no hay gastos compartidos.</p> : (
            <ul className="space-y-5 text-gray-600">
              {expenses.map((expense) => (
                <li key={expense.id} className="min-w-0 border-b pb-4">
                  {!isArchived && editingExpenseId === expense.id ? (
                    <form onSubmit={handleUpdateExpense} className="space-y-3">
                      <input aria-label="Monto" value={editingAmount} onChange={(event) => setEditingAmount(event.target.value)} inputMode="decimal" required disabled={isExpenseSubmitting} className="app-control" />
                      <input aria-label="Fecha" type="date" value={editingDate} onChange={(event) => setEditingDate(event.target.value)} required disabled={isExpenseSubmitting} className="app-control" />
                      <select aria-label="Categoría" value={editingExpenseCategoryId} onChange={(event) => setEditingExpenseCategoryId(event.target.value)} required disabled={isExpenseSubmitting} className="app-control">
                        <option value="">Seleccioná una categoría activa</option>
                        {activeCategories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}
                      </select>
                      <select aria-label="Quién pagó" value={editingPayerId} onChange={(event) => setEditingPayerId(event.target.value)} required disabled={isExpenseSubmitting} className="app-control">
                        <option value="">Seleccioná un integrante activo</option>
                        {members.map((member) => <option key={member.membresiaId} value={member.membresiaId}>{member.nombre}</option>)}
                      </select>
                      <input aria-label="Descripción (opcional)" value={editingDescription} onChange={(event) => setEditingDescription(event.target.value)} disabled={isExpenseSubmitting} className="app-control" />
                      <div className="flex flex-wrap gap-1">
                        <button type="submit" disabled={isExpenseSubmitting} className="app-action">Guardar</button>
                        <button type="button" onClick={cancelEditingExpense} disabled={isExpenseSubmitting} className="app-action text-gray-700 hover:bg-slate-100">Cancelar</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="min-w-0 break-words font-semibold text-gray-900">{currencyFormatter.format(Number(expense.monto))}</p>
                      <p>{expense.fecha} · {expense.categoriaNombre}</p>
                      <p>Pagado por: {expense.pagadoPorNombre}</p>
                      <p>Registrado por: {expense.registradoPorNombre}</p>
                      {expense.descripcion && <p>{expense.descripcion}</p>}
                      {!isArchived && <div className="mt-2 flex flex-wrap gap-1">
                        <button type="button" onClick={() => startEditingExpense(expense)} disabled={isExpenseSubmitting} className="app-action">Editar</button>
                        <button type="button" onClick={() => handleDeleteExpense(expense.id)} disabled={isExpenseSubmitting} className="app-action-danger">Eliminar</button>
                      </div>}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link to="/" className="app-link">
          Volver a Mis gastos
        </Link>
        {!isArchived && (
          <>
            <button type="button" onClick={handleLeaveSpace} disabled={isManagementSubmitting || isOnlyActiveAdmin} className="app-action-danger sm:ml-2">
              Abandonar espacio
            </button>
            {isOnlyActiveAdmin && (
              <p className="mt-2 text-sm text-gray-600">
                Promové a otro integrante a ADMIN antes de abandonar el espacio.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export default SharedSpacePage
