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

  const { data, error } = await supabase.rpc('create_personal_category', {
    p_espacio_id: spaceId,
    p_nombre: trimmedName,
  })

  if (error) {
    throw new Error(`No se pudo crear la categoría: ${error.message}`)
  }

  const category = (data as Array<{
    categoria_id: string
    categoria_nombre: string
    categoria_estado: string
  }> | null)?.[0]

  if (!category) {
    throw new Error('No se recibió la categoría creada.')
  }

  return {
    id: category.categoria_id,
    nombre: category.categoria_nombre,
    estado: category.categoria_estado,
  } as SpaceCategory
}
