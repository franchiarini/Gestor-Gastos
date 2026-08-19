import { supabase } from '../lib/supabase'
import type { SpaceCategory } from './getCategoriesForSpace'

type CategoryUpdate = {
  nombre?: string
  estado?: 'ARCHIVADA'
}

export async function updateCategory(
  categoryId: string,
  updates: CategoryUpdate,
): Promise<SpaceCategory> {
  const payload: CategoryUpdate = {}

  if (updates.nombre !== undefined) {
    const trimmedName = updates.nombre.trim()

    if (!trimmedName) {
      throw new Error('El nombre de la categoría no puede estar vacío.')
    }

    payload.nombre = trimmedName
  }

  if (updates.estado !== undefined) {
    payload.estado = updates.estado
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('No se indicó ningún cambio para la categoría.')
  }

  const { data, error } = await supabase
    .from('categorias')
    .update(payload)
    .eq('id', categoryId)
    .select('id, nombre, estado')
    .single()

  if (error) {
    throw new Error(`No se pudo actualizar la categoría: ${error.message}`)
  }

  if (!data) {
    throw new Error('No se recibió la categoría actualizada.')
  }

  return data as SpaceCategory
}
