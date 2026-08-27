import { useEffect, useState } from 'react'
import { getExpenseEvolution } from '../domain/getExpenseEvolution'
import type { EvolutionPoint, ExpenseEvolution as ExpenseEvolutionData } from '../domain/getExpenseEvolution'
import { EmptyState } from './EmptyState'
import { InteractiveEvolutionChart } from './InteractiveEvolutionChart'

type ExpenseEvolutionProps = {
  spaceId: string
  refreshKey?: number
  emptyTitle?: string
}

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

const compactCurrencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const monthFormatter = new Intl.DateTimeFormat('es-AR', {
  month: 'short',
  timeZone: 'UTC',
})

function formatMonth(month: string) {
  const label = monthFormatter.format(new Date(`${month}T00:00:00Z`)).replace('.', '')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatChange(point: EvolutionPoint, index: number) {
  if (index === 0 || point.percentageChange === null) {
    return 'Sin comparación disponible'
  }

  return `${point.percentageChange > 0 ? '+' : ''}${point.percentageChange}%`
}

function preparePoints(points: EvolutionPoint[]) {
  return points.map((point, index) => ({ month: point.month, amount: point.amount, changeLabel: formatChange(point, index) }))
}

export function ExpenseEvolution({ spaceId, refreshKey, emptyTitle = 'Todavía no hay movimientos suficientes para mostrar una evolución.' }: ExpenseEvolutionProps) {
  const [evolution, setEvolution] = useState<ExpenseEvolutionData | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError('')

    getExpenseEvolution(spaceId)
      .then((result) => {
        if (isMounted) {
          setEvolution(result)
          setSelectedCategoryId(result.categories[0]?.categoryId ?? '')
        }
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setEvolution(null)
          setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la evolución de gastos.')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [spaceId, refreshKey])

  const selectedCategory = evolution?.categories.find(
    (category) => category.categoryId === selectedCategoryId,
  )

  return (
    <section className="mb-10 w-full text-left md:relative md:left-1/2 md:w-[min(72rem,calc(100vw-3rem))] md:-translate-x-1/2" aria-label="Evolución de gastos">
      {isLoading && <p className="text-gray-600">Cargando evolución...</p>}
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {!isLoading && !error && evolution?.totals.length === 0 && (
        <EmptyState title={emptyTitle} description="La evolución aparecerá cuando exista historial de gastos para comparar." />
      )}
      {!isLoading && !error && evolution && evolution.totals.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="min-w-0 rounded-3xl bg-sky-100 p-5 shadow-sm dark:bg-sky-950/70 sm:p-6">
            <h3 className="mb-6 text-xl font-bold text-gray-900">Evolución mensual</h3>
            <InteractiveEvolutionChart points={preparePoints(evolution.totals)} colorClass="bg-sky-600 dark:bg-sky-400" accessibleName="Evolución mensual de gastos" currencyFormatter={currencyFormatter} compactCurrencyFormatter={compactCurrencyFormatter} formatMonth={formatMonth} />
          </article>
          <article className="min-w-0 rounded-3xl bg-fuchsia-100 p-5 shadow-sm dark:bg-fuchsia-950/70 sm:p-6">
            <h3 className="mb-4 text-xl font-bold text-gray-900">Evolución por categoría</h3>
            <label htmlFor={`evolution-category-${spaceId}`} className="mb-2 block text-sm font-semibold text-gray-700">Categoría</label>
            <select id={`evolution-category-${spaceId}`} value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)} className="app-control mb-6 border-fuchsia-300">
              {evolution.categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.name}</option>)}
            </select>
            {selectedCategory && (
              <>
                <p className="mb-4 break-words font-semibold text-fuchsia-900 dark:text-fuchsia-100">{selectedCategory.name} · {currencyFormatter.format(selectedCategory.total)}</p>
                <InteractiveEvolutionChart key={selectedCategory.categoryId} points={preparePoints(selectedCategory.points)} colorClass="bg-fuchsia-600 dark:bg-fuchsia-400" accessibleName={`Evolución mensual de gastos de ${selectedCategory.name}`} currencyFormatter={currencyFormatter} compactCurrencyFormatter={compactCurrencyFormatter} formatMonth={formatMonth} />
              </>
            )}
          </article>
        </div>
      )}
    </section>
  )
}
