import { supabase } from '../lib/supabase'

export async function deleteSharedSpace(spaceId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_shared_space', {
    p_espacio_id: spaceId,
  })

  if (error) {
    throw new Error(`No se pudo eliminar el espacio: ${error.message}`)
  }
}
