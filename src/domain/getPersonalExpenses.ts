import { supabase } from '../lib/supabase'

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
): Promise<PersonalExpense[]> {
  const { data, error } = await supabase
    .from('gastos')
    .select('id, categoria_id, monto, fecha, descripcion, fecha_creacion, categorias(nombre)')
    .eq('espacio_id', spaceId)
    .order('fecha', { ascending: false })
    .order('fecha_creacion', { ascending: false })

  if (error) {
    throw new Error(`No se pudieron cargar los gastos: ${error.message}`)
  }

  return (data as unknown as ExpenseRow[]).map((expense) => {
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
}
