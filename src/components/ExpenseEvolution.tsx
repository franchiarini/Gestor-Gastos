import { useEffect, useState } from 'react'
import { getExpenseEvolution } from '../domain/getExpenseEvolution'
import type { EvolutionPoint, ExpenseEvolution as ExpenseEvolutionData } from '../domain/getExpenseEvolution'

type ExpenseEvolutionProps = {
  spaceId: string
  refreshKey?: number
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

function EvolutionChart({ points, colorClass }: { points: EvolutionPoint[]; colorClass: string }) {
  const maximum = Math.max(...points.map((point) => point.amount), 0)

  return (
    <div className="flex items-end gap-1 sm:gap-3" role="img" aria-label="Evolución mensual de gastos">
      {points.map((point, index) => {
        const height = maximum === 0 ? 0 : Math.max((point.amount / maximum) * 100, point.amount > 0 ? 4 : 0)
        return (
          <div key={point.month} className="flex min-w-0 flex-1 flex-col items-center">
            <span className="mb-2 max-w-full text-center text-[0.65rem] font-semibold text-gray-700 sm:text-xs" title={currencyFormatter.format(point.amount)}>
              {compactCurrencyFormatter.format(point.amount)}
            </span>
            <div className="flex h-36 w-full items-end justify-center rounded-t-lg bg-white/70 sm:h-44">
              <div className={`w-3/5 rounded-t-lg ${colorClass}`} style={{ height: `${height}%` }} />
            </div>
            <span className="mt-2 text-xs font-semibold text-gray-800">{formatMonth(point.month)}</span>
            <span className="mt-1 min-h-8 break-words text-center text-[0.6rem] leading-tight text-gray-600 sm:text-[0.7rem]">
              {formatChange(point, index)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function ExpenseEvolution({ spaceId, refreshKey }: ExpenseEvolutionProps) {
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
    <section className="mb-10 w-full text-left md:relative md:left-1/2 md:w-[min(72rem,calc(100vw-3rem))] md:-translate-x-1/2" aria-labelledby={`expense-evolution-${spaceId}`}>
      <h2 id={`expense-evolution-${spaceId}`} className="mb-4 text-2xl font-bold text-gray-900">Evolución</h2>
      {isLoading && <p className="text-gray-600">Cargando evolución...</p>}
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {!isLoading && !error && evolution?.totals.length === 0 && (
        <p className="rounded-2xl bg-gray-100 p-6 text-center text-gray-600">No hay suficiente historial de gastos para mostrar la evolución.</p>
      )}
      {!isLoading && !error && evolution && evolution.totals.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="min-w-0 rounded-3xl bg-sky-100 p-5 shadow-sm sm:p-6">
            <h3 className="mb-6 text-xl font-bold text-gray-900">Evolución mensual</h3>
            <EvolutionChart points={evolution.totals} colorClass="bg-sky-600" />
          </article>
          <article className="min-w-0 rounded-3xl bg-fuchsia-100 p-5 shadow-sm sm:p-6">
            <h3 className="mb-4 text-xl font-bold text-gray-900">Evolución por categoría</h3>
            <label htmlFor={`evolution-category-${spaceId}`} className="mb-2 block text-sm font-semibold text-gray-700">Categoría</label>
            <select id={`evolution-category-${spaceId}`} value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)} className="mb-6 w-full min-w-0 rounded-xl border border-fuchsia-300 bg-white px-3 py-2 text-gray-900">
              {evolution.categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.name}</option>)}
            </select>
            {selectedCategory && (
              <>
                <p className="mb-4 break-words font-semibold text-fuchsia-900">{selectedCategory.name} · {currencyFormatter.format(selectedCategory.total)}</p>
                <EvolutionChart points={selectedCategory.points} colorClass="bg-fuchsia-600" />
              </>
            )}
          </article>
        </div>
      )}
    </section>
  )
}
