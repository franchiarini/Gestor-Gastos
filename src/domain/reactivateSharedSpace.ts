import { supabase } from '../lib/supabase'

export async function reactivateSharedSpace(spaceId: string): Promise<void> {
  const { error } = await supabase.rpc('reactivate_shared_space', { p_espacio_id: spaceId })
  if (error) throw new Error(`No se pudo reactivar el espacio: ${error.message}`)
}
