import { supabase } from '../lib/supabase'

export async function setSharedDeclaredIncome(
  spaceId: string,
  month: string,
  amount: string,
): Promise<void> {
  const { error } = await supabase.rpc('set_shared_declared_income', {
    p_espacio_id: spaceId,
    p_mes: month,
    p_monto: amount,
  })

  if (error) throw new Error(error.message || 'No se pudo guardar la declaración.')
}
