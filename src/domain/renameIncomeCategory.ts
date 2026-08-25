import { supabase } from '../lib/supabase'
import type { IncomeCategory } from './getIncomeCategories'
import { getIncomeErrorMessage } from './incomeErrors'
import { mapIncomeCategory } from './incomeCategoryMapping'
import type { IncomeCategoryRpcRow } from './incomeCategoryMapping'

export async function renameIncomeCategory(categoryId: string, nombre: string): Promise<IncomeCategory> {
  const trimmedName = nombre.trim()
  if (!trimmedName) throw new Error('El nombre de la categoría no puede estar vacío.')

  const { data, error } = await supabase.rpc('rename_income_category', {
    p_categoria_id: categoryId,
    p_nombre: trimmedName,
  })

  if (error) {
    throw new Error(getIncomeErrorMessage(error.message, 'No se pudo renombrar la categoría de ingreso.'))
  }

  const row = (data as IncomeCategoryRpcRow[] | null)?.[0]
  if (!row) throw new Error('No se recibió la categoría actualizada.')
  return mapIncomeCategory(row)
}
