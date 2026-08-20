import { supabase } from '../lib/supabase'

export async function createSharedCategory(spaceId: string, nombre: string): Promise<string> {
  const trimmedName = nombre.trim()
  if (!trimmedName) throw new Error('El nombre de la categoría no puede estar vacío.')

  const { data, error } = await supabase.rpc('create_shared_category', {
    p_espacio_id: spaceId,
    p_nombre: trimmedName,
  })

  if (error) throw new Error(`No se pudo crear la categoría: ${error.message}`)
  if (!data) throw new Error('No se recibió el identificador de la categoría creada.')
  return data as string
}
