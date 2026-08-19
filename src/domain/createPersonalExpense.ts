import { supabase } from '../lib/supabase'

export type CreatePersonalExpenseInput = {
  categoriaId: string
  monto: string
  fecha: string
  descripcion?: string
}

export async function createPersonalExpense({
  categoriaId,
  monto,
  fecha,
  descripcion,
}: CreatePersonalExpenseInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_personal_expense', {
    p_categoria_id: categoriaId,
    p_monto: monto,
    p_fecha: fecha,
    p_descripcion: descripcion,
  })

  if (error) {
    throw new Error(`No se pudo registrar el gasto: ${error.message}`)
  }

  if (!data) {
    throw new Error('No se recibió el identificador del gasto creado.')
  }

  return data as string
}
