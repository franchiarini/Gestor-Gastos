import { supabase } from '../lib/supabase'

export type SharedExpense = {
  id: string
  categoriaId: string
  categoriaNombre: string
  pagadoPorMembresiaId: string
  pagadoPorNombre: string
  registradoPorMembresiaId: string
  registradoPorNombre: string
  monto: string
  fecha: string
  descripcion: string | null
  fechaCreacion: string
  fechaModificacion: string
}

type ExpenseRow = {
  gasto_id: string
  categoria_id: string
  categoria_nombre: string
  pagado_por_membresia_id: string
  pagado_por_nombre: string
  registrado_por_membresia_id: string
  registrado_por_nombre: string
  monto: string | number
  fecha: string
  descripcion: string | null
  fecha_creacion: string
  fecha_modificacion: string
}

export async function getSharedExpenses(spaceId: string): Promise<SharedExpense[]> {
  const { data, error } = await supabase.rpc('get_shared_expenses', {
    p_espacio_id: spaceId,
  })

  if (error) {
    throw new Error(`No se pudieron cargar los gastos compartidos: ${error.message}`)
  }

  return ((data ?? []) as ExpenseRow[]).map((expense) => ({
    id: expense.gasto_id,
    categoriaId: expense.categoria_id,
    categoriaNombre: expense.categoria_nombre,
    pagadoPorMembresiaId: expense.pagado_por_membresia_id,
    pagadoPorNombre: expense.pagado_por_nombre,
    registradoPorMembresiaId: expense.registrado_por_membresia_id,
    registradoPorNombre: expense.registrado_por_nombre,
    monto: String(expense.monto),
    fecha: expense.fecha,
    descripcion: expense.descripcion,
    fechaCreacion: expense.fecha_creacion,
    fechaModificacion: expense.fecha_modificacion,
  }))
}
