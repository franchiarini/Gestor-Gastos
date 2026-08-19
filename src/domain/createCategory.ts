import { supabase } from '../lib/supabase'
import type { SpaceCategory } from './getCategoriesForSpace'

export async function createCategory(
  spaceId: string,
  nombre: string,
): Promise<SpaceCategory> {
  const trimmedName = nombre.trim()

  if (!trimmedName) {
    throw new Error('El nombre de la categoría no puede estar vacío.')
  }

  const { data, error } = await supabase
    .from('categorias')
    .insert({
      espacio_id: spaceId,
      nombre: trimmedName,
      estado: 'ACTIVA',
    })
    .select('id, nombre, estado')
    .single()

  if (error) {
    throw new Error(`No se pudo crear la categoría: ${error.message}`)
  }

  if (!data) {
    throw new Error('No se recibió la categoría creada.')
  }

  return data as SpaceCategory
}
