export const EXPENSE_PAGE_SIZE = 10

export type ExpenseCursor = {
  fecha: string
  fechaCreacion: string
  id: string
}

export type ExpensePage<T> = {
  expenses: T[]
  nextCursor: ExpenseCursor | null
  hasMore: boolean
}

export function createExpensePage<T extends ExpenseCursor>(rows: T[]): ExpensePage<T> {
  const hasMore = rows.length > EXPENSE_PAGE_SIZE
  const expenses = rows.slice(0, EXPENSE_PAGE_SIZE)
  const lastExpense = expenses.at(-1)

  return {
    expenses,
    hasMore,
    nextCursor: hasMore && lastExpense
      ? { fecha: lastExpense.fecha, fechaCreacion: lastExpense.fechaCreacion, id: lastExpense.id }
      : null,
  }
}

export function appendUniqueExpenses<T extends { id: string }>(current: T[], next: T[]) {
  const existingIds = new Set(current.map((expense) => expense.id))
  return [...current, ...next.filter((expense) => !existingIds.has(expense.id))]
}

export function groupExpensesByDate<T extends { fecha: string }>(expenses: T[]) {
  const groups = new Map<string, T[]>()
  expenses.forEach((expense) => {
    const group = groups.get(expense.fecha)
    if (group) group.push(expense)
    else groups.set(expense.fecha, [expense])
  })
  return Array.from(groups, ([fecha, groupedExpenses]) => ({ fecha, expenses: groupedExpenses }))
}

function toLocalDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function formatExpenseDateGroup(fecha: string) {
  const [year, month, day] = fecha.split('-').map(Number)
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const expenseDate = new Date(year, month - 1, day)
  const formatted = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    ...(year !== today.getFullYear() ? { year: 'numeric' as const } : {}),
  }).format(expenseDate)

  if (fecha === toLocalDateKey(today)) return `HOY — ${formatted}`
  if (fecha === toLocalDateKey(yesterday)) return `AYER — ${formatted}`
  return formatted
}
