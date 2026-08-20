import { supabase } from '../lib/supabase'

export type SharedCategoryUpdate = {
  nombre?: string
  archivar?: boolean
}

export async function updateSharedCategory(
  categoryId: string,
  updates: SharedCategoryUpdate,
): Promise<void> {
  const nombre = updates.nombre?.trim()
  if (updates.nombre !== undefined && !nombre) {
    throw new Error('El nombre de la categoría no puede estar vacío.')
  }

  const { error } = await supabase.rpc('update_shared_category', {
    p_categoria_id: categoryId,
    p_nombre: nombre,
    p_archivar: updates.archivar ?? false,
  })

  if (error) throw new Error(`No se pudo actualizar la categoría: ${error.message}`)
}
