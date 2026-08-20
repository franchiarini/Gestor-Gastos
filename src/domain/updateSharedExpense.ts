import { supabase } from '../lib/supabase'

export type UpdateSharedExpenseInput = {
  gastoId: string
  categoriaId: string
  pagadoPorMembresiaId: string
  monto: string
  fecha: string
  descripcion?: string
}

export async function updateSharedExpense(input: UpdateSharedExpenseInput): Promise<void> {
  const { error } = await supabase.rpc('update_shared_expense', {
    p_gasto_id: input.gastoId,
    p_categoria_id: input.categoriaId,
    p_pagado_por_membresia_id: input.pagadoPorMembresiaId,
    p_monto: input.monto,
    p_fecha: input.fecha,
    p_descripcion: input.descripcion,
  })

  if (error) throw new Error(`No se pudo actualizar el gasto compartido: ${error.message}`)
}
