import { supabase } from '../lib/supabase'

export type SharedCategoryUpdate = {
  nombre?: string
  archivar?: boolean
  restaurar?: boolean
}

export async function updateSharedCategory(
  categoryId: string,
  updates: SharedCategoryUpdate,
): Promise<void> {
  const nombre = updates.nombre?.trim()
  if (updates.nombre !== undefined && !nombre) {
    throw new Error('El nombre de la categoría no puede estar vacío.')
  }

  if (updates.archivar && updates.restaurar) {
    throw new Error('No se puede archivar y restaurar una categoría simultáneamente.')
  }

  const { error } = await supabase.rpc('update_shared_category', {
    p_categoria_id: categoryId,
    p_nombre: nombre,
    p_archivar: updates.archivar ?? false,
    p_restaurar: updates.restaurar ?? false,
  })

  if (error) throw new Error(`No se pudo actualizar la categoría: ${error.message}`)
}
