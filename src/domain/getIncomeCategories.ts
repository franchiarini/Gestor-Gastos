import { supabase } from '../lib/supabase'

export type IncomeCategoryStatus = 'ACTIVA' | 'ARCHIVADA'

export type IncomeCategory = {
  id: string
  nombre: string
  estado: IncomeCategoryStatus
  fechaCreacion: string
  fechaModificacion: string
}

type IncomeCategoryRow = {
  id: string
  nombre: string
  estado: IncomeCategoryStatus
  fecha_creacion: string
  fecha_modificacion: string
}

export async function getIncomeCategories(): Promise<IncomeCategory[]> {
  const { data, error } = await supabase
    .from('categorias_ingreso')
    .select('id, nombre, estado, fecha_creacion, fecha_modificacion')
    .order('nombre', { ascending: true })
    .order('id', { ascending: true })

  if (error) {
    throw new Error('No se pudieron cargar las categorías de ingreso.')
  }

  return ((data ?? []) as IncomeCategoryRow[]).map((category) => ({
    id: category.id,
    nombre: category.nombre,
    estado: category.estado,
    fechaCreacion: category.fecha_creacion,
    fechaModificacion: category.fecha_modificacion,
  }))
}
