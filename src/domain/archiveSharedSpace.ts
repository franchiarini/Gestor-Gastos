import { supabase } from '../lib/supabase'

export async function archiveSharedSpace(spaceId: string): Promise<void> {
  const { error } = await supabase.rpc('archive_shared_space', { p_espacio_id: spaceId })
  if (error) throw new Error(`No se pudo archivar el espacio: ${error.message}`)
}
