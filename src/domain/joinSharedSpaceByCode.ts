import { supabase } from '../lib/supabase'

export type SharedSpaceJoinResult = 'JOINED' | 'REACTIVATED' | 'ALREADY_MEMBER' | 'EXPELLED'

export type JoinedSharedSpace = {
  espacioId: string
  nombre: string
  resultado: SharedSpaceJoinResult
}

type JoinedSharedSpaceRow = {
  espacio_id: string
  nombre: string
  resultado: SharedSpaceJoinResult
}

export async function joinSharedSpaceByCode(codigo: string): Promise<JoinedSharedSpace> {
  const { data, error } = await supabase.rpc('join_shared_space_by_code', {
    p_codigo: codigo,
  })

  if (error) {
    throw new Error(`No se pudo completar la unión al espacio: ${error.message}`)
  }

  const row = (data as JoinedSharedSpaceRow[] | null)?.[0]

  if (!row) {
    throw new Error('No se recibió el resultado de la unión al espacio.')
  }

  if (row.resultado === 'EXPELLED') {
    throw new Error('No podés volver a unirte automáticamente a este espacio.')
  }

  return {
    espacioId: row.espacio_id,
    nombre: row.nombre,
    resultado: row.resultado,
  }
}
