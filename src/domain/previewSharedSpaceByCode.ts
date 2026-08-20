import { supabase } from '../lib/supabase'

export type SharedSpaceMembershipStatus = 'ACTIVA' | 'FINALIZADA' | null
export type SharedSpaceDepartureReason = 'ABANDONO' | 'EXPULSION' | null

export type SharedSpacePreview = {
  espacioId: string
  nombre: string
  membresiaEstado: SharedSpaceMembershipStatus
  motivoSalida: SharedSpaceDepartureReason
}

type SharedSpacePreviewRow = {
  espacio_id: string
  nombre: string
  membresia_estado: SharedSpaceMembershipStatus
  motivo_salida: SharedSpaceDepartureReason
}

export async function previewSharedSpaceByCode(
  codigo: string,
): Promise<SharedSpacePreview> {
  const { data, error } = await supabase.rpc('preview_shared_space_by_code', {
    p_codigo: codigo,
  })

  if (error) {
    throw new Error(`No se pudo buscar el espacio compartido: ${error.message}`)
  }

  const row = (data as SharedSpacePreviewRow[] | null)?.[0]

  if (!row) {
    throw new Error('No se recibió la información del espacio compartido.')
  }

  if (row.motivo_salida === 'EXPULSION') {
    throw new Error('No podés volver a unirte automáticamente a este espacio.')
  }

  return {
    espacioId: row.espacio_id,
    nombre: row.nombre,
    membresiaEstado: row.membresia_estado,
    motivoSalida: row.motivo_salida,
  }
}
