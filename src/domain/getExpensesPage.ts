import { supabase } from '../lib/supabase'
import { createExpensePage } from './expensePagination'
import type { ExpenseCursor, ExpensePage } from './expensePagination'

export type ExpenseSpaceType = 'PERSONAL' | 'COMPARTIDO'
export type ExpenseSpaceStatus = 'ACTIVO' | 'ARCHIVADO'

export type GlobalExpense = {
  id: string
  spaceId: string
  spaceName: string
  spaceType: ExpenseSpaceType
  spaceStatus: ExpenseSpaceStatus
  categoryId: string
  categoryName: string
  paidByMembershipId: string
  paidByName: string
  registeredByMembershipId: string
  registeredByName: string
  amount: string
  date: string
  description: string | null
  createdAt: string
  updatedAt: string
  fecha: string
  fechaCreacion: string
}

type ExpenseRow = {
  gasto_id: string
  espacio_id: string
  espacio_nombre: string
  espacio_tipo: ExpenseSpaceType
  espacio_estado: ExpenseSpaceStatus
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

export async function getExpensesPage(
  spaceId: string | null = null,
  cursor: ExpenseCursor | null = null,
): Promise<ExpensePage<GlobalExpense>> {
  const { data, error } = await supabase.rpc('get_expenses_page', {
    p_espacio_id: spaceId,
    p_cursor_fecha: cursor?.fecha ?? null,
    p_cursor_fecha_creacion: cursor?.fechaCreacion ?? null,
    p_cursor_id: cursor?.id ?? null,
  })

  if (error) {
    throw new Error(`No se pudieron cargar los gastos: ${error.message}`)
  }

  const expenses = ((data ?? []) as ExpenseRow[]).map((expense) => ({
    id: expense.gasto_id,
    spaceId: expense.espacio_id,
    spaceName: expense.espacio_nombre,
    spaceType: expense.espacio_tipo,
    spaceStatus: expense.espacio_estado,
    categoryId: expense.categoria_id,
    categoryName: expense.categoria_nombre,
    paidByMembershipId: expense.pagado_por_membresia_id,
    paidByName: expense.pagado_por_nombre,
    registeredByMembershipId: expense.registrado_por_membresia_id,
    registeredByName: expense.registrado_por_nombre,
    amount: String(expense.monto),
    date: expense.fecha,
    description: expense.descripcion,
    createdAt: expense.fecha_creacion,
    updatedAt: expense.fecha_modificacion,
    fecha: expense.fecha,
    fechaCreacion: expense.fecha_creacion,
  }))

  return createExpensePage(expenses)
}
