import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getIncomeMonthlySummary } from '../domain/getIncomeMonthlySummary'
import type { IncomeMonthlySummary as IncomeMonthlySummaryData } from '../domain/getIncomeMonthlySummary'
import { EmptyState } from './EmptyState'
import { InteractiveDonut } from './InteractiveDonut'
import { FinancialSummaryHero } from './FinancialSummaryHero'

type IncomeMonthlySummaryProps = {
  month?: string
  showMonthNavigation?: boolean
}

const chartColors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
]

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

const percentageFormatter = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
})

const monthFormatter = new Intl.DateTimeFormat('es-AR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

function getCurrentMonth() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
}

function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber - 1 + amount, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

function formatMonth(month: string) {
  const label = monthFormatter.format(new Date(`${month}T00:00:00Z`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatPercentage(percentage: number) {
  return `${percentageFormatter.format(percentage)}%`
}

export function IncomeMonthlySummary({ month: controlledMonth, showMonthNavigation = true }: IncomeMonthlySummaryProps = {}) {
  const currentMonth = getCurrentMonth()
  const [internalMonth, setInternalMonth] = useState(currentMonth)
  const month = controlledMonth ?? internalMonth
  const [summary, setSummary] = useState<IncomeMonthlySummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError('')
    setSummary(null)

    getIncomeMonthlySummary(month)
      .then((result) => { if (isMounted) setSummary(result) })
      .catch((loadError: unknown) => {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el resumen mensual de ingresos.')
      })
      .finally(() => { if (isMounted) setIsLoading(false) })

    return () => { isMounted = false }
  }, [month, retryCount])

  function showPreviousMonth() {
    setInternalMonth((value) => shiftMonth(value, -1))
  }

  function showNextMonth() {
    setInternalMonth((value) => value >= currentMonth ? value : shiftMonth(value, 1))
  }

  const principalCategory = summary?.categories[0]

  return (
    <section className="mb-10 w-full text-left md:relative md:left-1/2 md:w-[min(72rem,calc(100vw-3rem))] md:-translate-x-1/2" aria-labelledby="income-summary-month">
      {showMonthNavigation && <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        <button type="button" onClick={showPreviousMonth} className="app-button-secondary justify-self-start px-2 text-sm sm:px-3 sm:text-base" aria-label="Mostrar mes anterior">
          ← <span className="hidden sm:inline">Mes anterior</span><span className="sm:hidden">Anterior</span>
        </button>
        <h3 id="income-summary-month" className="app-text min-w-0 text-center text-lg font-semibold sm:text-2xl">{formatMonth(month)}</h3>
        <button type="button" onClick={showNextMonth} disabled={month >= currentMonth} className="app-button-secondary justify-self-end px-2 text-sm sm:px-3 sm:text-base" aria-label="Mostrar mes siguiente">
          <span className="hidden sm:inline">Mes siguiente</span><span className="sm:hidden">Siguiente</span> →
        </button>
      </div>}

      {isLoading && <div className="app-panel min-h-44 text-center"><p className="app-muted">Cargando resumen de ingresos...</p></div>}

      {!isLoading && error && (
        <div className="app-panel mx-auto max-w-lg text-center">
          <p role="alert" className="app-error mb-4">{error}</p>
          <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="app-button-primary">Reintentar</button>
        </div>
      )}

      {!isLoading && !error && summary?.incomeCount === 0 && (
        <EmptyState title="No hubo ingresos en este mes." description="Cuando registres ingresos, vas a ver cuánto ingresó y cómo se distribuyó entre tus categorías." action={<Link to="/ingresos/movimientos" className="app-button-primary">Registrar ingreso</Link>} className="mx-auto max-w-2xl" />
      )}

      {!isLoading && !error && summary && summary.incomeCount > 0 && (
        <>
          <div className="space-y-5">
            <FinancialSummaryHero tone="income" month={formatMonth(summary.month)} label="Ingresaste este mes" total={currencyFormatter.format(summary.totalIncome)} movementCount={summary.incomeCount} movementLabel="movimiento" principalName={principalCategory?.name} principalPercentage={principalCategory ? formatPercentage(principalCategory.percentage) : undefined} donut={<InteractiveDonut key={`income-categories-${summary.month}`} items={summary.categories.map((category) => ({ id: category.categoryId, name: category.name, amount: category.amount, percentage: category.percentage, detail: category.status === 'ARCHIVADA' ? 'Archivada' : `${category.incomeCount} ${category.incomeCount === 1 ? 'ingreso' : 'ingresos'}` }))} total={summary.totalIncome} accessibleName="Distribución porcentual de ingresos por categoría" centerLabel="Total del mes" currencyFormatter={currencyFormatter} percentageFormatter={formatPercentage} colors={chartColors} />} />

            <div className="grid gap-5 lg:grid-cols-2">
            <article className="min-w-0 rounded-3xl border border-violet-200 bg-violet-50 p-5 text-gray-900 shadow-sm dark:border-violet-900 dark:bg-violet-950/45 sm:p-6">
              <h4 className="mb-5 text-xl font-bold dark:text-gray-100">Detalle por categoría</h4>
                <div className="space-y-4">
                  {summary.categories.map((category) => (
                    <div key={category.categoryId} className="min-w-0">
                      <div className="mb-2 text-sm">
                        <p className="break-words font-semibold">{category.name}{category.status === 'ARCHIVADA' && <span className="ml-1 text-xs font-normal text-gray-600 dark:text-violet-200">(Archivada)</span>}</p>
                        <p className="flex flex-wrap justify-between gap-x-2 text-gray-700 dark:text-violet-100"><span className="break-all">{currencyFormatter.format(category.amount)}</span><span>{formatPercentage(category.percentage)}</span></p>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white dark:bg-white/10" aria-label={`${category.name}: ${formatPercentage(category.percentage)}`}><div className="h-full rounded-full bg-violet-600 dark:bg-violet-400" style={{ width: `${Math.min(category.percentage, 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
            </article>

            {principalCategory && (
              <article className="flex min-w-0 flex-col overflow-hidden rounded-3xl bg-sky-100 p-6 text-gray-900 shadow-sm dark:bg-sky-950/70">
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-200">Principal fuente</p>
                <div className="flex flex-1 flex-col justify-center">
                  <h4 className="mb-6 break-words text-2xl font-bold sm:text-3xl">{principalCategory.name}</h4>
                  {principalCategory.status === 'ARCHIVADA' && <p className="mb-3 text-sm font-semibold text-sky-800 dark:text-sky-200">Categoría archivada</p>}
                  <p className="min-w-0 max-w-full whitespace-nowrap font-bold leading-tight [font-size:clamp(1.4rem,7vw,2.75rem)] sm:[font-size:clamp(1.625rem,2.8vw,2.75rem)]">{currencyFormatter.format(principalCategory.amount)}</p>
                  <p className="mt-3 font-semibold text-sky-900 dark:text-sky-100">{formatPercentage(principalCategory.percentage)} del total</p>
                  <p className="app-muted mt-8 border-t border-sky-300 pt-5 dark:border-sky-700">{principalCategory.incomeCount} {principalCategory.incomeCount === 1 ? 'ingreso' : 'ingresos'} en esta categoría</p>
                </div>
              </article>
            )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
