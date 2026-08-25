import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getIncomeEvolution } from '../domain/getIncomeEvolution'
import type {
  IncomeEvolution as IncomeEvolutionData,
  IncomeEvolutionPoint,
} from '../domain/getIncomeEvolution'

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

const percentageFormatter = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
})

const monthFormatter = new Intl.DateTimeFormat('es-AR', {
  month: 'short',
  timeZone: 'UTC',
})

function formatMonth(month: string) {
  const label = monthFormatter.format(new Date(`${month}T00:00:00Z`)).replace('.', '')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatChange(point: IncomeEvolutionPoint, index: number) {
  if (index === 0 || point.percentageChange === null) {
    return 'Sin comparación disponible'
  }

  const sign = point.percentageChange > 0 ? '+' : ''
  return `${sign}${percentageFormatter.format(point.percentageChange)}%`
}

type EvolutionChartProps = {
  points: IncomeEvolutionPoint[]
  colorClass: string
  accessibleName: string
}

function EvolutionChart({ points, colorClass, accessibleName }: EvolutionChartProps) {
  const maximum = Math.max(...points.map((point) => point.amount), 0)

  return (
    <div className="flex items-end gap-1 sm:gap-3" role="img" aria-label={accessibleName}>
      {points.map((point, index) => {
        const height = maximum === 0
          ? 0
          : Math.max((point.amount / maximum) * 100, point.amount > 0 ? 4 : 0)

        return (
          <div key={point.month} className="flex min-w-0 flex-1 flex-col items-center">
            <span
              className="mb-2 max-w-full text-center text-[0.65rem] font-semibold text-gray-700 dark:text-gray-200 sm:text-xs"
              title={currencyFormatter.format(point.amount)}
            >
              {compactCurrencyFormatter.format(point.amount)}
            </span>
            <div className="flex h-36 w-full items-end justify-center rounded-t-lg bg-white/70 dark:bg-white/10 sm:h-44">
              <div className={`w-3/5 rounded-t-lg ${colorClass}`} style={{ height: `${height}%` }} />
            </div>
            <span className="mt-2 text-xs font-semibold text-gray-800 dark:text-gray-100">
              {formatMonth(point.month)}
            </span>
            <span className="mt-1 min-h-8 break-words text-center text-[0.6rem] leading-tight text-gray-600 dark:text-gray-300 sm:text-[0.7rem]">
              {formatChange(point, index)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function IncomeEvolution() {
  const [evolution, setEvolution] = useState<IncomeEvolutionData | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError('')
    setEvolution(null)

    getIncomeEvolution()
      .then((result) => {
        if (!isMounted) return
        setEvolution(result)
        setSelectedCategoryId(result.categories[0]?.categoryId ?? '')
      })
      .catch((loadError: unknown) => {
        if (!isMounted) return
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la evolución de ingresos.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [retryCount])

  const selectedCategory = evolution?.categories.find(
    (category) => category.categoryId === selectedCategoryId,
  )

  const hasHistory = Boolean(
    evolution?.fromMonth && evolution.toMonth && evolution.totals.length > 0,
  )

  return (
    <section
      className="mb-10 w-full text-left md:relative md:left-1/2 md:w-[min(72rem,calc(100vw-3rem))] md:-translate-x-1/2"
      aria-label="Evolución de ingresos"
    >
      {isLoading && (
        <div className="app-panel min-h-44 text-center">
          <p className="app-muted">Cargando evolución de ingresos...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="app-panel mx-auto max-w-lg text-center">
          <p role="alert" className="app-error mb-4">{error}</p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="app-button-primary"
          >
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !error && !hasHistory && (
        <div className="app-panel mx-auto max-w-2xl text-center">
          <h3 className="app-text text-xl font-semibold">Todavía no tenemos historial para mostrar tu evolución.</h3>
          <p className="app-muted mx-auto mb-5 mt-2 max-w-xl">
            Cuando registres ingresos, acá vas a poder ver cómo cambian mes a mes.
          </p>
          <Link to="/ingresos/movimientos" className="app-button-primary">Registrar ingreso</Link>
        </div>
      )}

      {!isLoading && !error && evolution && hasHistory && (
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="min-w-0 rounded-3xl bg-emerald-100 p-5 shadow-sm dark:bg-emerald-950/70 sm:p-6">
            <h3 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100">Evolución mensual</h3>
            <EvolutionChart
              points={evolution.totals}
              colorClass="bg-emerald-600 dark:bg-emerald-400"
              accessibleName="Evolución mensual del total de ingresos"
            />
          </article>

          <article className="min-w-0 rounded-3xl bg-violet-100 p-5 shadow-sm dark:bg-violet-950/70 sm:p-6">
            <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Evolución por categoría</h3>
            <label htmlFor="income-evolution-category" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Categoría
            </label>
            <select
              id="income-evolution-category"
              value={selectedCategoryId}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
              className="app-control mb-6 border-violet-300"
            >
              {evolution.categories.map((category) => (
                <option key={category.categoryId} value={category.categoryId}>
                  {category.name}{category.status === 'ARCHIVADA' ? ' · Archivada' : ''}
                </option>
              ))}
            </select>

            {selectedCategory && (
              <>
                <p className="mb-4 break-words font-semibold text-violet-900 dark:text-violet-100">
                  {selectedCategory.name} · {currencyFormatter.format(selectedCategory.total)}
                  {selectedCategory.status === 'ARCHIVADA' && (
                    <span className="ml-2 text-xs font-normal text-violet-700 dark:text-violet-200">Archivada</span>
                  )}
                </p>
                <EvolutionChart
                  points={selectedCategory.points}
                  colorClass="bg-violet-600 dark:bg-violet-400"
                  accessibleName={`Evolución mensual de ingresos de ${selectedCategory.name}`}
                />
              </>
            )}
          </article>
        </div>
      )}
    </section>
  )
}
