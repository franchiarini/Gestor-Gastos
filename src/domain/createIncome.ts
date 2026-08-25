import { supabase } from '../lib/supabase'
import { getIncomeErrorMessage } from './incomeErrors'

export type CreateIncomeInput = {
  categoriaIngresoId: string
  monto: string
  fecha: string
  descripcion?: string
}

export async function createIncome(input: CreateIncomeInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_income', {
    p_categoria_ingreso_id: input.categoriaIngresoId,
    p_monto: input.monto,
    p_fecha: input.fecha,
    p_descripcion: input.descripcion,
  })

  if (error) throw new Error(getIncomeErrorMessage(error.message, 'No se pudo registrar el ingreso.'))
  if (!data) throw new Error('No se recibió el identificador del ingreso creado.')
  return data as string
}
