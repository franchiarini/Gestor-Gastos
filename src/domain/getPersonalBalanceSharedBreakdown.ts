import { supabase } from '../lib/supabase'

export type PersonalBalanceSharedSpace = {
  spaceId: string
  spaceName: string
  membershipStatus: 'ACTIVA' | 'FINALIZADA'
  hasCurrentAccess: boolean
  amountPaid: number
}

type PersonalBalanceSharedSpaceRow = {
  espacio_id: string
  espacio_nombre: string
  estado_membresia: 'ACTIVA' | 'FINALIZADA'
  acceso_actual: boolean
  monto_pagado: string | number
}

export async function getPersonalBalanceSharedBreakdown(
  month: string,
): Promise<PersonalBalanceSharedSpace[]> {
  const { data, error } = await supabase.rpc('get_personal_balance_shared_breakdown', {
    p_mes: month,
  })

  if (error) {
    throw new Error('No se pudo cargar el detalle de los pagos en espacios.')
  }

  return ((data ?? []) as PersonalBalanceSharedSpaceRow[]).map((space) => ({
    spaceId: space.espacio_id,
    spaceName: space.espacio_nombre,
    membershipStatus: space.estado_membresia,
    hasCurrentAccess: space.acceso_actual,
    amountPaid: Number(space.monto_pagado),
  }))
}
