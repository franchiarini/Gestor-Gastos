import { supabase } from '../lib/supabase'
import { getIncomeErrorMessage } from './incomeErrors'

export async function deleteIncome(incomeId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_income', {
    p_ingreso_id: incomeId,
  })

  if (error) throw new Error(getIncomeErrorMessage(error.message, 'No se pudo eliminar el ingreso.'))
}
