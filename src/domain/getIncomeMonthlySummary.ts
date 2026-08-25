import { supabase } from '../lib/supabase'
import type { IncomeCategoryStatus } from './getIncomeCategories'

export type IncomeMonthlySummaryCategory = {
  categoryId: string
  name: string
  status: IncomeCategoryStatus
  amount: number
  incomeCount: number
  percentage: number
}

export type IncomeMonthlySummary = {
  month: string
  totalIncome: number
  incomeCount: number
  categories: IncomeMonthlySummaryCategory[]
}

type IncomeMonthlySummaryCategoryRow = Omit<IncomeMonthlySummaryCategory, 'amount' | 'incomeCount' | 'percentage'> & {
  amount: string | number
  incomeCount: string | number
  percentage: string | number
}

type IncomeMonthlySummaryRow = {
  mes: string
  total_ingresado: string | number
  cantidad_ingresos: string | number
  categorias: IncomeMonthlySummaryCategoryRow[] | null
}

export async function getIncomeMonthlySummary(month: string): Promise<IncomeMonthlySummary> {
  const { data, error } = await supabase.rpc('get_income_monthly_summary', {
    p_mes: month,
  })

  if (error) {
    throw new Error('No se pudo cargar el resumen mensual de ingresos.')
  }

  const row = (data as IncomeMonthlySummaryRow[] | null)?.[0]
  if (!row) throw new Error('No se encontró el resumen mensual solicitado.')

  return {
    month: row.mes,
    totalIncome: Number(row.total_ingresado),
    incomeCount: Number(row.cantidad_ingresos),
    categories: (row.categorias ?? []).map((category) => ({
      ...category,
      amount: Number(category.amount),
      incomeCount: Number(category.incomeCount),
      percentage: Number(category.percentage),
    })),
  }
}
