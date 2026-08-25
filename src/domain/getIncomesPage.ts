import { supabase } from '../lib/supabase'
import { createIncomePage } from './incomePagination'
import type { IncomeCursor, IncomePage } from './incomePagination'
import type { IncomeCategoryStatus } from './getIncomeCategories'

export type Income = {
  id: string
  categoriaIngresoId: string
  categoriaNombre: string
  categoriaEstado: IncomeCategoryStatus
  monto: string
  fecha: string
  descripcion: string | null
  fechaCreacion: string
  fechaModificacion: string
}

type IncomeRow = {
  ingreso_id: string
  categoria_ingreso_id: string
  categoria_nombre: string
  categoria_estado: IncomeCategoryStatus
  monto: string | number
  fecha: string
  descripcion: string | null
  fecha_creacion: string
  fecha_modificacion: string
}

export async function getIncomesPage(cursor: IncomeCursor | null = null): Promise<IncomePage<Income>> {
  const { data, error } = await supabase.rpc('get_incomes_page', {
    p_cursor_fecha: cursor?.fecha ?? null,
    p_cursor_fecha_creacion: cursor?.fechaCreacion ?? null,
    p_cursor_id: cursor?.id ?? null,
  })

  if (error) throw new Error('No se pudieron cargar los ingresos.')

  const incomes = ((data ?? []) as IncomeRow[]).map((income) => ({
    id: income.ingreso_id,
    categoriaIngresoId: income.categoria_ingreso_id,
    categoriaNombre: income.categoria_nombre,
    categoriaEstado: income.categoria_estado,
    monto: String(income.monto),
    fecha: income.fecha,
    descripcion: income.descripcion,
    fechaCreacion: income.fecha_creacion,
    fechaModificacion: income.fecha_modificacion,
  }))

  return createIncomePage(incomes)
}
