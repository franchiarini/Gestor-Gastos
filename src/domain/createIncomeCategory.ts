import { supabase } from '../lib/supabase'
import { getIncomeErrorMessage } from './incomeErrors'
import { mapIncomeCategory } from './incomeCategoryMapping'
import type { IncomeCategoryRpcRow } from './incomeCategoryMapping'
import type { IncomeCategory } from './getIncomeCategories'

export async function createIncomeCategory(nombre: string): Promise<IncomeCategory> {
  const trimmedName = nombre.trim()

  if (!trimmedName) {
    throw new Error('El nombre de la categoría no puede estar vacío.')
  }

  const { data, error } = await supabase.rpc('create_income_category', {
    p_nombre: trimmedName,
  })

  if (error) {
    throw new Error(getIncomeErrorMessage(error.message, 'No se pudo crear la categoría de ingreso.'))
  }

  const row = (data as IncomeCategoryRpcRow[] | null)?.[0]
  if (!row) throw new Error('No se recibió la categoría creada.')
  return mapIncomeCategory(row)
}
