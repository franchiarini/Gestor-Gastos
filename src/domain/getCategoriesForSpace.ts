import { supabase } from '../lib/supabase'

export type SpaceCategory = {
  id: string
  nombre: string
  estado: string
}

export async function getCategoriesForSpace(
  spaceId: string,
): Promise<SpaceCategory[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nombre, estado')
    .eq('espacio_id', spaceId)
    .order('nombre', { ascending: true })

  if (error) {
    throw new Error(`No se pudieron cargar las categorías: ${error.message}`)
  }

  return data as SpaceCategory[]
}
