import { supabase } from '../lib/supabase'

export type SharedSpaceMember = {
  membresiaId: string
  nombre: string
  rol: 'ADMIN' | 'INTEGRANTE'
}

type MemberRow = {
  membresia_id: string
  nombre: string
  rol: 'ADMIN' | 'INTEGRANTE'
}

export async function getSharedSpaceMembers(spaceId: string): Promise<SharedSpaceMember[]> {
  const { data, error } = await supabase.rpc('get_shared_space_members', {
    p_espacio_id: spaceId,
  })

  if (error) {
    throw new Error(`No se pudieron cargar los integrantes activos: ${error.message}`)
  }

  return ((data ?? []) as MemberRow[]).map((member) => ({
    membresiaId: member.membresia_id,
    nombre: member.nombre,
    rol: member.rol,
  }))
}
