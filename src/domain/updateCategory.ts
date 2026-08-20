import { supabase } from '../lib/supabase'
import type { SpaceCategory } from './getCategoriesForSpace'

type CategoryUpdate = {
  nombre?: string
  estado?: 'ARCHIVADA'
  restaurar?: boolean
}

type UpdatedCategoryRow = {
  categoria_id: string
  categoria_nombre: string
  categoria_estado: string
}

export async function updateCategory(
  categoryId: string,
  updates: CategoryUpdate,
): Promise<SpaceCategory> {
  let nombre: string | undefined

  if (updates.nombre !== undefined) {
    const trimmedName = updates.nombre.trim()

    if (!trimmedName) {
      throw new Error('El nombre de la categoría no puede estar vacío.')
    }

    nombre = trimmedName
  }

  if (updates.estado !== undefined && updates.restaurar) {
    throw new Error('No se puede archivar y restaurar una categoría simultáneamente.')
  }

  if (nombre === undefined && updates.estado === undefined && !updates.restaurar) {
    throw new Error('No se indicó ningún cambio para la categoría.')
  }

  const { data, error } = await supabase.rpc('update_personal_category', {
    p_categoria_id: categoryId,
    p_nombre: nombre,
    p_archivar: updates.estado === 'ARCHIVADA',
    p_restaurar: updates.restaurar ?? false,
  })

  if (error) {
    throw new Error(`No se pudo actualizar la categoría: ${error.message}`)
  }

  const row = (data as UpdatedCategoryRow[] | null)?.[0]

  if (!row) {
    throw new Error('No se recibió la categoría actualizada.')
  }

  return {
    id: row.categoria_id,
    nombre: row.categoria_nombre,
    estado: row.categoria_estado,
  } as SpaceCategory
}
