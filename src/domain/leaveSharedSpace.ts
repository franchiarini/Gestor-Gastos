import { supabase } from '../lib/supabase'

export async function leaveSharedSpace(spaceId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_shared_space', { p_espacio_id: spaceId })
  if (error) throw new Error(`No se pudo abandonar el espacio: ${error.message}`)
}
