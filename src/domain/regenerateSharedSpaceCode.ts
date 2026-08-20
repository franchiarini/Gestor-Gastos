import { supabase } from '../lib/supabase'

export async function regenerateSharedSpaceCode(spaceId: string): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_shared_space_code', {
    p_espacio_id: spaceId,
  })

  if (error) throw new Error(`No se pudo regenerar el código de acceso: ${error.message}`)
  if (!data) throw new Error('No se recibió el nuevo código de acceso.')
  return data as string
}
