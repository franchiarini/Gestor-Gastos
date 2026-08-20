import { supabase } from '../lib/supabase'

export type UpdatePersonalExpenseInput = {
  gastoId: string
  categoriaId: string
  monto: string
  fecha: string
  descripcion?: string
}

export async function updatePersonalExpense({
  gastoId,
  categoriaId,
  monto,
  fecha,
  descripcion,
}: UpdatePersonalExpenseInput): Promise<void> {
  const { error } = await supabase.rpc('update_personal_expense', {
    p_gasto_id: gastoId,
    p_categoria_id: categoriaId,
    p_monto: monto,
    p_fecha: fecha,
    p_descripcion: descripcion,
  })

  if (error) {
    throw new Error(`No se pudo actualizar el gasto: ${error.message}`)
  }
}
