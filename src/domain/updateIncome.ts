import { supabase } from '../lib/supabase'
import { getIncomeErrorMessage } from './incomeErrors'

export type UpdateIncomeInput = {
  ingresoId: string
  categoriaIngresoId: string
  monto: string
  fecha: string
  descripcion?: string
}

export async function updateIncome(input: UpdateIncomeInput): Promise<void> {
  const { error } = await supabase.rpc('update_income', {
    p_ingreso_id: input.ingresoId,
    p_categoria_ingreso_id: input.categoriaIngresoId,
    p_monto: input.monto,
    p_fecha: input.fecha,
    p_descripcion: input.descripcion,
  })

  if (error) throw new Error(getIncomeErrorMessage(error.message, 'No se pudo actualizar el ingreso.'))
}
