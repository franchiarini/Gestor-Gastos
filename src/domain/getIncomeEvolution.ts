import { supabase } from '../lib/supabase'
import type { IncomeCategoryStatus } from './getIncomeCategories'

export type IncomeEvolutionPoint = {
  month: string
  amount: number
  percentageChange: number | null
}

export type IncomeEvolutionCategory = {
  categoryId: string
  name: string
  status: IncomeCategoryStatus
  total: number
  points: IncomeEvolutionPoint[]
}

export type IncomeEvolution = {
  fromMonth: string | null
  toMonth: string | null
  totals: IncomeEvolutionPoint[]
  categories: IncomeEvolutionCategory[]
}

type IncomeEvolutionPointPayload = {
  month: string
  amount: number | string
  percentageChange: number | string | null
}

type IncomeEvolutionCategoryPayload = {
  categoryId: string
  name: string
  status: IncomeCategoryStatus
  total: number | string
  points: IncomeEvolutionPointPayload[]
}

type IncomeEvolutionRow = {
  desde_mes: string | null
  hasta_mes: string | null
  totales: IncomeEvolutionPointPayload[] | null
  categorias: IncomeEvolutionCategoryPayload[] | null
}

function mapPoint(point: IncomeEvolutionPointPayload): IncomeEvolutionPoint {
  return {
    month: point.month,
    amount: Number(point.amount),
    percentageChange:
      point.percentageChange === null ? null : Number(point.percentageChange),
  }
}

export async function getIncomeEvolution(): Promise<IncomeEvolution> {
  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase.rpc('get_income_evolution', {
    p_hasta_mes: currentMonth,
  })

  if (error) {
    throw new Error('No se pudo cargar la evolución de ingresos.')
  }

  const row = (data as IncomeEvolutionRow[] | null)?.[0]

  if (!row) {
    throw new Error('No se encontró la evolución de ingresos solicitada.')
  }

  return {
    fromMonth: row.desde_mes,
    toMonth: row.hasta_mes,
    totals: (row.totales ?? []).map(mapPoint),
    categories: (row.categorias ?? []).map((category) => ({
      categoryId: category.categoryId,
      name: category.name,
      status: category.status,
      total: Number(category.total),
      points: category.points.map(mapPoint),
    })),
  }
}
