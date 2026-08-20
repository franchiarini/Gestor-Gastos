import { supabase } from '../lib/supabase'

export async function deleteSharedExpense(gastoId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_shared_expense', { p_gasto_id: gastoId })
  if (error) throw new Error(`No se pudo eliminar el gasto compartido: ${error.message}`)
}
