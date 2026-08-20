import { supabase } from '../lib/supabase'

export type SharedSpace = {
  id: string
  nombre: string
  estado: string
}

export async function getSharedSpaces(): Promise<SharedSpace[]> {
  const { data, error } = await supabase
    .from('espacios')
    .select('id, nombre, estado')
    .eq('tipo', 'COMPARTIDO')
    .eq('estado', 'ACTIVO')
    .order('nombre', { ascending: true })
    .order('id', { ascending: true })

  if (error) {
    throw new Error(`No se pudieron cargar los espacios compartidos: ${error.message}`)
  }

  return data as SharedSpace[]
}
