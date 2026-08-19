import { supabase } from '../lib/supabase'

export type PersonalSpace = {
  id: string
  nombre: string
  tipo: string
  estado: string
}

export async function getPersonalSpace(): Promise<PersonalSpace> {
  const { data, error } = await supabase
    .from('espacios')
    .select('id, nombre, tipo, estado')
    .eq('tipo', 'PERSONAL')
    .eq('estado', 'ACTIVO')
    .single()

  if (error) {
    throw new Error(`No se pudo cargar tu espacio personal: ${error.message}`)
  }

  if (!data) {
    throw new Error('No se encontró un espacio personal activo.')
  }

  return data as PersonalSpace
}
