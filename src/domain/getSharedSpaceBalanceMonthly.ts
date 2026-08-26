import { supabase } from '../lib/supabase'

export type SharedBalanceReason =
  | 'HISTORY_INCOMPLETE'
  | 'NO_RELEVANT_MEMBERS'
  | 'MISSING_DECLARATIONS'
  | 'ZERO_RELEVANT_INCOME'

export type SharedBalanceMember = {
  membershipId: string
  name: string
  currentStatus: 'ACTIVA' | 'FINALIZADA'
  relevantThisMonth: boolean
  declaredIncome: number | null
  hasDeclaration: boolean
  pendingDeclaration: boolean
  paidAmount: number
  expectedContribution: number | null
  difference: number | null
  proportionalParticipation: number | null
}

export type SharedSpaceBalanceMonthly = {
  month: string
  historyComplete: boolean
  declaredIncomeKnown: number
  monthMemberCount: number
  declarationCount: number
  declarationsComplete: boolean
  expensesTotal: number
  jointBalance: number | null
  proportionalApplicable: boolean
  proportionalAvailable: boolean
  proportionalReasons: SharedBalanceReason[]
  constantProportionalComposition: boolean
  members: SharedBalanceMember[]
}

type NumericValue = string | number

type SharedBalanceMemberRow = {
  membershipId: string
  name: string
  currentStatus: 'ACTIVA' | 'FINALIZADA'
  relevantThisMonth: boolean
  declaredIncome: NumericValue | null
  hasDeclaration: boolean
  pendingDeclaration: boolean
  paidAmount: NumericValue
  expectedContribution: NumericValue | null
  difference: NumericValue | null
  proportionalParticipation: NumericValue | null
}

type SharedSpaceBalanceRow = {
  mes: string
  historial_completo: boolean
  ingresos_declarados_hasta_ahora: NumericValue
  cantidad_integrantes_mes: number
  cantidad_declaraciones: number
  declaraciones_completas: boolean
  gastos_totales: NumericValue
  balance_conjunto: NumericValue | null
  calculo_proporcional_aplicable: boolean
  calculo_proporcional_disponible: boolean
  proportional_reasons: SharedBalanceReason[]
  composicion_proporcional_constante: boolean
  integrantes: SharedBalanceMemberRow[]
}

function toNumber(value: NumericValue): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error('El Balance devolvió un importe inválido.')
  return parsed
}

function nullableNumber(value: NumericValue | null): number | null {
  return value === null ? null : toNumber(value)
}

export async function getSharedSpaceBalanceMonthly(
  spaceId: string,
  month: string,
): Promise<SharedSpaceBalanceMonthly> {
  const { data, error } = await supabase.rpc('get_shared_space_balance_monthly', {
    p_espacio_id: spaceId,
    p_mes: month,
  })

  if (error) throw new Error(error.message || 'No se pudo cargar el Balance del espacio.')

  const row = (data as SharedSpaceBalanceRow[] | null)?.[0]
  if (!row) throw new Error('No se recibió el Balance mensual solicitado.')

  return {
    month: row.mes,
    historyComplete: row.historial_completo,
    declaredIncomeKnown: toNumber(row.ingresos_declarados_hasta_ahora),
    monthMemberCount: row.cantidad_integrantes_mes,
    declarationCount: row.cantidad_declaraciones,
    declarationsComplete: row.declaraciones_completas,
    expensesTotal: toNumber(row.gastos_totales),
    jointBalance: nullableNumber(row.balance_conjunto),
    proportionalApplicable: row.calculo_proporcional_aplicable,
    proportionalAvailable: row.calculo_proporcional_disponible,
    proportionalReasons: row.proportional_reasons ?? [],
    constantProportionalComposition: row.composicion_proporcional_constante,
    members: (row.integrantes ?? []).map((member) => ({
      membershipId: member.membershipId,
      name: member.name,
      currentStatus: member.currentStatus,
      relevantThisMonth: member.relevantThisMonth,
      declaredIncome: nullableNumber(member.declaredIncome),
      hasDeclaration: member.hasDeclaration,
      pendingDeclaration: member.pendingDeclaration,
      paidAmount: toNumber(member.paidAmount),
      expectedContribution: nullableNumber(member.expectedContribution),
      difference: nullableNumber(member.difference),
      proportionalParticipation: nullableNumber(member.proportionalParticipation),
    })),
  }
}
