import { supabase } from '../lib/supabase'
import type { IncomeCategory } from './getIncomeCategories'
import { getIncomeErrorMessage } from './incomeErrors'
import { mapIncomeCategory } from './incomeCategoryMapping'
import type { IncomeCategoryRpcRow } from './incomeCategoryMapping'

export async function restoreIncomeCategory(categoryId: string): Promise<IncomeCategory> {
  const { data, error } = await supabase.rpc('restore_income_category', {
    p_categoria_id: categoryId,
  })

  if (error) {
    throw new Error(getIncomeErrorMessage(error.message, 'No se pudo restaurar la categoría de ingreso.'))
  }

  const row = (data as IncomeCategoryRpcRow[] | null)?.[0]
  if (!row) throw new Error('No se recibió la categoría actualizada.')
  return mapIncomeCategory(row)
}
