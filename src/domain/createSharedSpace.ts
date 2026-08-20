import { supabase } from '../lib/supabase'

export type CreatedSharedSpace = {
  id: string
  nombre: string
  codigoAcceso: string
}

type CreatedSharedSpaceRow = {
  id: string
  nombre: string
  codigo_acceso: string
}

export async function createSharedSpace(nombre: string): Promise<CreatedSharedSpace> {
  const trimmedName = nombre.trim()

  if (!trimmedName) {
    throw new Error('El nombre del espacio no puede estar vacío.')
  }

  const { data, error } = await supabase.rpc('create_shared_space', {
    p_nombre: trimmedName,
  })

  if (error) {
    throw new Error(`No se pudo crear el espacio compartido: ${error.message}`)
  }

  const row = (data as CreatedSharedSpaceRow[] | null)?.[0]

  if (!row) {
    throw new Error('No se recibieron los datos del espacio compartido creado.')
  }

  return {
    id: row.id,
    nombre: row.nombre,
    codigoAcceso: row.codigo_acceso,
  }
}
