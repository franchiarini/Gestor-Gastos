import { supabase } from '../lib/supabase'

export async function expelSharedSpaceMember(spaceId: string, membershipId: string): Promise<void> {
  const { error } = await supabase.rpc('expel_shared_space_member', {
    p_espacio_id: spaceId,
    p_membresia_id: membershipId,
  })
  if (error) throw new Error(`No se pudo expulsar al integrante: ${error.message}`)
}
