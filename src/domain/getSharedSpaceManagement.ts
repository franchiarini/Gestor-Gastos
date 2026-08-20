import { supabase } from '../lib/supabase'

export type SharedSpaceManagement = {
  espacioId: string
  nombre: string
  codigoAcceso: string
  membresiaId: string
  rol: 'ADMIN' | 'INTEGRANTE'
}

type ManagementRow = {
  espacio_id: string
  nombre: string
  codigo_acceso: string
  membresia_id: string
  rol: 'ADMIN' | 'INTEGRANTE'
}

export async function getSharedSpaceManagement(spaceId: string): Promise<SharedSpaceManagement> {
  const { data, error } = await supabase.rpc('get_shared_space_management', {
    p_espacio_id: spaceId,
  })

  if (error) throw new Error(`No se pudo cargar la gestión del espacio: ${error.message}`)
  const row = (data as ManagementRow[] | null)?.[0]
  if (!row) throw new Error('No se recibió la información de gestión del espacio.')

  return {
    espacioId: row.espacio_id,
    nombre: row.nombre,
    codigoAcceso: row.codigo_acceso,
    membresiaId: row.membresia_id,
    rol: row.rol,
  }
}
