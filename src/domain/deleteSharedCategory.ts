import { supabase } from '../lib/supabase'

export async function deleteSharedCategory(categoryId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_shared_category', {
    p_categoria_id: categoryId,
  })
  if (error) throw new Error(`No se pudo eliminar la categoría: ${error.message}`)
}
