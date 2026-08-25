import { supabase } from '../lib/supabase'

export type PersonalBalanceMonthly = {
  month: string
  totalIncome: number
  personalExpenses: number
  sharedExpensesPaid: number
  totalExpensesPaid: number
  finalBalance: number
}

type PersonalBalanceMonthlyRow = {
  mes: string
  ingresos_totales: string | number
  gastos_personales: string | number
  gastos_compartidos_pagados: string | number
  gastos_totales_pagados: string | number
  balance_final: string | number
}

export async function getPersonalBalanceMonthly(
  month: string,
): Promise<PersonalBalanceMonthly> {
  const { data, error } = await supabase.rpc('get_personal_balance_monthly', {
    p_mes: month,
  })

  if (error) {
    throw new Error('No se pudo cargar el balance mensual.')
  }

  const row = (data as PersonalBalanceMonthlyRow[] | null)?.[0]

  if (!row) {
    throw new Error('No se encontró el balance mensual solicitado.')
  }

  return {
    month: row.mes,
    totalIncome: Number(row.ingresos_totales),
    personalExpenses: Number(row.gastos_personales),
    sharedExpensesPaid: Number(row.gastos_compartidos_pagados),
    totalExpensesPaid: Number(row.gastos_totales_pagados),
    finalBalance: Number(row.balance_final),
  }
}
