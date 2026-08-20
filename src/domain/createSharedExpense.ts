import { supabase } from '../lib/supabase'

export type CreateSharedExpenseInput = {
  espacioId: string
  categoriaId: string
  pagadoPorMembresiaId: string
  monto: string
  fecha: string
  descripcion?: string
}

export async function createSharedExpense(input: CreateSharedExpenseInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_shared_expense', {
    p_espacio_id: input.espacioId,
    p_categoria_id: input.categoriaId,
    p_pagado_por_membresia_id: input.pagadoPorMembresiaId,
    p_monto: input.monto,
    p_fecha: input.fecha,
    p_descripcion: input.descripcion,
  })

  if (error) throw new Error(`No se pudo registrar el gasto compartido: ${error.message}`)
  if (!data) throw new Error('No se recibió el identificador del gasto creado.')
  return data as string
}
