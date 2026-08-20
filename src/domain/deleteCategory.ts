import { supabase } from '../lib/supabase'

export async function deleteCategory(categoriaId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_personal_category', {
    p_categoria_id: categoriaId,
  })

  if (error) {
    throw new Error(`No se pudo eliminar la categoría: ${error.message}`)
  }
}
