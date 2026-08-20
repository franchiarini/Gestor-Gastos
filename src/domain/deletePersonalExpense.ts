import { supabase } from '../lib/supabase'

export async function deletePersonalExpense(gastoId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_personal_expense', {
    p_gasto_id: gastoId,
  })

  if (error) {
    throw new Error(`No se pudo eliminar el gasto: ${error.message}`)
  }
}
