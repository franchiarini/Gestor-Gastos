export const INCOME_PAGE_SIZE = 10

export type IncomeCursor = {
  fecha: string
  fechaCreacion: string
  id: string
}

export type IncomePage<T> = {
  incomes: T[]
  nextCursor: IncomeCursor | null
  hasMore: boolean
}

export function createIncomePage<T extends IncomeCursor>(rows: T[]): IncomePage<T> {
  const hasMore = rows.length > INCOME_PAGE_SIZE
  const incomes = rows.slice(0, INCOME_PAGE_SIZE)
  const lastIncome = incomes.at(-1)

  return {
    incomes,
    hasMore,
    nextCursor: hasMore && lastIncome
      ? { fecha: lastIncome.fecha, fechaCreacion: lastIncome.fechaCreacion, id: lastIncome.id }
      : null,
  }
}

export function appendUniqueIncomes<T extends { id: string }>(current: T[], next: T[]) {
  const existingIds = new Set(current.map((income) => income.id))
  return [...current, ...next.filter((income) => !existingIds.has(income.id))]
}

export function groupIncomesByDate<T extends { fecha: string }>(incomes: T[]) {
  const groups = new Map<string, T[]>()
  incomes.forEach((income) => {
    const group = groups.get(income.fecha)
    if (group) group.push(income)
    else groups.set(income.fecha, [income])
  })
  return Array.from(groups, ([fecha, groupedIncomes]) => ({ fecha, incomes: groupedIncomes }))
}

function toLocalDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function formatIncomeDateGroup(fecha: string) {
  const [year, month, day] = fecha.split('-').map(Number)
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const incomeDate = new Date(year, month - 1, day)
  const formatted = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    ...(year !== today.getFullYear() ? { year: 'numeric' as const } : {}),
  }).format(incomeDate)

  if (fecha === toLocalDateKey(today)) return `HOY — ${formatted}`
  if (fecha === toLocalDateKey(yesterday)) return `AYER — ${formatted}`
  return formatted
}
