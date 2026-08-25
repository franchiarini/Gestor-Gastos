import { supabase } from '../lib/supabase'
import { getIncomeErrorMessage } from './incomeErrors'

export async function deleteIncomeCategory(categoryId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_income_category', {
    p_categoria_id: categoryId,
  })

  if (error) {
    throw new Error(getIncomeErrorMessage(error.message, 'No se pudo eliminar la categoría de ingreso.'))
  }
}
