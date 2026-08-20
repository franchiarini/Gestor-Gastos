import { supabase } from '../lib/supabase'

export type SharedSpaceMembershipStatus = 'ACTIVA' | 'FINALIZADA' | null

export type SharedSpacePreview = {
  espacioId: string
  nombre: string
  membresiaEstado: SharedSpaceMembershipStatus
}

type SharedSpacePreviewRow = {
  espacio_id: string
  nombre: string
  membresia_estado: SharedSpaceMembershipStatus
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

  return {
    espacioId: row.espacio_id,
    nombre: row.nombre,
    membresiaEstado: row.membresia_estado,
  }
}
