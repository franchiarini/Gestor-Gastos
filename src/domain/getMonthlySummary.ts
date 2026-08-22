import { supabase } from '../lib/supabase'

export type MonthlySummaryItem = {
  amount: number
  percentage: number
}

export type MonthlySummaryCategory = MonthlySummaryItem & {
  categoryId: string
  name: string
}

export type MonthlySummaryMember = MonthlySummaryItem & {
  membershipId: string
  name: string
}

export type MonthlySummary = {
  spaceType: 'PERSONAL' | 'COMPARTIDO'
  month: string
  total: number
  expenseCount: number
  categories: MonthlySummaryCategory[]
  members: MonthlySummaryMember[]
}

type MonthlySummaryRow = {
  tipo_espacio: 'PERSONAL' | 'COMPARTIDO'
  mes: string
  total_mensual: string | number
  cantidad_gastos: string | number
  categorias: MonthlySummaryCategory[] | null
  integrantes: MonthlySummaryMember[] | null
}

export async function getMonthlySummary(
  spaceId: string,
  month: string,
): Promise<MonthlySummary> {
  const { data, error } = await supabase.rpc('get_monthly_summary', {
    p_espacio_id: spaceId,
    p_mes: month,
  })

  if (error) {
    throw new Error(`No se pudo cargar el resumen mensual: ${error.message}`)
  }

  const row = (data as MonthlySummaryRow[] | null)?.[0]

  if (!row) {
    throw new Error('No se encontró el resumen mensual solicitado.')
  }

  return {
    spaceType: row.tipo_espacio,
    month: row.mes,
    total: Number(row.total_mensual),
    expenseCount: Number(row.cantidad_gastos),
    categories: (row.categorias ?? []).map((category) => ({
      ...category,
      amount: Number(category.amount),
      percentage: Number(category.percentage),
    })),
    members: (row.integrantes ?? []).map((member) => ({
      ...member,
      amount: Number(member.amount),
      percentage: Number(member.percentage),
    })),
  }
}
