import { supabase } from '../lib/supabase'

export type EvolutionPoint = {
  month: string
  amount: number
  percentageChange: number | null
}

export type CategoryEvolution = {
  categoryId: string
  name: string
  total: number
  points: EvolutionPoint[]
}

export type ExpenseEvolution = {
  spaceType: 'PERSONAL' | 'COMPARTIDO'
  fromMonth: string | null
  toMonth: string | null
  totals: EvolutionPoint[]
  categories: CategoryEvolution[]
}

type EvolutionRow = {
  tipo_espacio: 'PERSONAL' | 'COMPARTIDO'
  desde_mes: string | null
  hasta_mes: string | null
  totales: EvolutionPoint[] | null
  categorias: CategoryEvolution[] | null
}

function mapPoint(point: EvolutionPoint): EvolutionPoint {
  return {
    month: point.month,
    amount: Number(point.amount),
    percentageChange:
      point.percentageChange === null ? null : Number(point.percentageChange),
  }
}

export async function getExpenseEvolution(spaceId: string): Promise<ExpenseEvolution> {
  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase.rpc('get_expense_evolution', {
    p_espacio_id: spaceId,
    p_hasta_mes: currentMonth,
  })

  if (error) {
    throw new Error(`No se pudo cargar la evolución de gastos: ${error.message}`)
  }

  const row = (data as EvolutionRow[] | null)?.[0]

  if (!row) {
    throw new Error('No se encontró la evolución de gastos solicitada.')
  }

  return {
    spaceType: row.tipo_espacio,
    fromMonth: row.desde_mes,
    toMonth: row.hasta_mes,
    totals: (row.totales ?? []).map(mapPoint),
    categories: (row.categorias ?? []).map((category) => ({
      categoryId: category.categoryId,
      name: category.name,
      total: Number(category.total),
      points: category.points.map(mapPoint),
    })),
  }
}
