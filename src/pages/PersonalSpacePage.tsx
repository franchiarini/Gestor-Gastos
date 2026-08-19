import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { getPersonalSpace } from '../domain/getPersonalSpace'
import type { PersonalSpace } from '../domain/getPersonalSpace'
import { getCategoriesForSpace } from '../domain/getCategoriesForSpace'
import type { SpaceCategory } from '../domain/getCategoriesForSpace'
import { createCategory } from '../domain/createCategory'
import { updateCategory } from '../domain/updateCategory'

function PersonalSpacePage() {
  const [space, setSpace] = useState<PersonalSpace | null>(null)
  const [categories, setCategories] = useState<SpaceCategory[]>([])
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

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError('')

    getPersonalSpace()
      .then(async (personalSpace) => {
        const personalSpaceCategories = await getCategoriesForSpace(personalSpace.id)

        if (isMounted) {
          setSpace(personalSpace)
          setCategories(personalSpaceCategories)
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
    if (isCategorySubmitting) {
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
        currentCategories.filter((category) => category.id !== categoryId),
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

  if (isLoading) {
    return <p>{space ? 'Cargando categorías...' : 'Cargando Mis gastos...'}</p>
  }

  if (error || !space) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center py-8 px-6">
          <p role="alert" className="mb-4 text-red-600">
            {error || 'No se pudo cargar tu espacio personal.'}
          </p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center py-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">{space.nombre}</h1>
        <p className="text-lg text-gray-600 mb-6">Este es tu espacio personal.</p>
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">Categorías</h2>
        <form onSubmit={handleCreateCategory} className="mb-6 flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="Nombre de categoría"
            disabled={isCategorySubmitting}
            className="rounded border border-gray-300 px-3 py-2 text-gray-900"
          />
          <button
            type="submit"
            disabled={isCategorySubmitting}
            className="rounded bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between gap-3">
              {editingCategoryId === category.id ? (
                <>
                  <input
                    type="text"
                    value={editingCategoryName}
                    onChange={(event) => setEditingCategoryName(event.target.value)}
                    disabled={isCategorySubmitting}
                    className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleRenameCategory(category.id)}
                    disabled={isCategorySubmitting}
                    className="text-blue-600 font-semibold hover:underline disabled:opacity-60"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditingCategory}
                    disabled={isCategorySubmitting}
                    className="text-gray-600 font-semibold hover:underline disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span>{category.nombre}</span>
                  <span className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => startEditingCategory(category)}
                      disabled={isCategorySubmitting}
                      className="text-blue-600 font-semibold hover:underline disabled:opacity-60"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchiveCategory(category.id)}
                      disabled={isCategorySubmitting}
                      className="text-red-600 font-semibold hover:underline disabled:opacity-60"
                    >
                      Archivar
                    </button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>
        {signOutError && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {signOutError}
          </p>
        )}
      </div>
    </div>
  )
}

export default PersonalSpacePage
