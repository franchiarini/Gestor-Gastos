import { supabase } from '../lib/supabase'
import { createExpensePage, EXPENSE_PAGE_SIZE } from './expensePagination'
import type { ExpenseCursor, ExpensePage } from './expensePagination'

export type PersonalExpense = {
  id: string
  categoriaId: string
  monto: string
  fecha: string
  descripcion: string | null
  fechaCreacion: string
  categoria: {
    nombre: string
  }
}

type ExpenseRow = {
  id: string
  categoria_id: string
  monto: string | number
  fecha: string
  descripcion: string | null
  fecha_creacion: string
  categorias: { nombre: string } | { nombre: string }[] | null
}

export async function getPersonalExpenses(
  spaceId: string,
  cursor: ExpenseCursor | null = null,
): Promise<ExpensePage<PersonalExpense>> {
  let query = supabase
    .from('gastos')
    .select('id, categoria_id, monto, fecha, descripcion, fecha_creacion, categorias(nombre)')
    .eq('espacio_id', spaceId)
    .order('fecha', { ascending: false })
    .order('fecha_creacion', { ascending: false })
    .order('id', { ascending: false })
    .limit(EXPENSE_PAGE_SIZE + 1)

  if (cursor) {
    query = query.or(
      `fecha.lt.${cursor.fecha},and(fecha.eq.${cursor.fecha},fecha_creacion.lt.${cursor.fechaCreacion}),and(fecha.eq.${cursor.fecha},fecha_creacion.eq.${cursor.fechaCreacion},id.lt.${cursor.id})`,
    )
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`No se pudieron cargar los gastos: ${error.message}`)
  }

  const expenses = (data as unknown as ExpenseRow[]).map((expense) => {
    const category = Array.isArray(expense.categorias)
      ? expense.categorias[0]
      : expense.categorias

    return {
      id: expense.id,
      categoriaId: expense.categoria_id,
      monto: String(expense.monto),
      fecha: expense.fecha,
      descripcion: expense.descripcion,
      fechaCreacion: expense.fecha_creacion,
      categoria: category ?? { nombre: 'Sin categoría' },
    }
  })

  return createExpensePage(expenses)
}
