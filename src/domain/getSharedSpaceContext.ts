import { supabase } from '../lib/supabase'

export type SharedSpaceRole = 'ADMIN' | 'INTEGRANTE'

export type SharedSpaceCategory = {
  id: string
  nombre: string
  estado: string
}

export type SharedSpaceContext = {
  id: string
  nombre: string
  rol: SharedSpaceRole
  categorias: SharedSpaceCategory[]
}

type SpaceRow = {
  id: string
  nombre: string
  tipo: string
  estado: string
}

type MembershipRow = {
  rol: SharedSpaceRole
  estado: string
}

export async function getSharedSpaceContext(
  spaceId: string,
): Promise<SharedSpaceContext> {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw new Error('Se requiere un usuario autenticado.')
  }

  const [spaceResult, membershipResult] = await Promise.all([
    supabase
      .from('espacios')
      .select('id, nombre, tipo, estado')
      .eq('id', spaceId)
      .maybeSingle(),
    supabase
      .from('membresias')
      .select('rol, estado')
      .eq('usuario_id', userData.user.id)
      .eq('espacio_id', spaceId)
      .maybeSingle(),
  ])

  if (spaceResult.error || membershipResult.error) {
    throw new Error('No se pudo cargar el contexto del espacio compartido.')
  }

  const space = spaceResult.data as SpaceRow | null
  const membership = membershipResult.data as MembershipRow | null

  if (
    !space
    || space.tipo !== 'COMPARTIDO'
    || space.estado !== 'ACTIVO'
    || !membership
    || membership.estado !== 'ACTIVA'
  ) {
    throw new Error('No tenés acceso activo a este espacio compartido.')
  }

  const { data: categories, error: categoriesError } = await supabase
    .from('categorias')
    .select('id, nombre, estado')
    .eq('espacio_id', spaceId)
    .order('nombre', { ascending: true })
    .order('id', { ascending: true })

  if (categoriesError) {
    throw new Error('No se pudieron cargar las categorías del espacio compartido.')
  }

  return {
    id: space.id,
    nombre: space.nombre,
    rol: membership.rol,
    categorias: categories as SharedSpaceCategory[],
  }
}
