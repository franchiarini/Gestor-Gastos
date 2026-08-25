import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { getIncomeMonthlySummary } from '../domain/getIncomeMonthlySummary'
import type { IncomeMonthlySummary as IncomeMonthlySummaryData } from '../domain/getIncomeMonthlySummary'

type CategoryView = 'distribution' | 'detail'

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

function getDonutStyle(items: Array<{ percentage: number }>): CSSProperties {
  let accumulatedPercentage = 0
  const segments = items.map((item, index) => {
    const start = accumulatedPercentage
    accumulatedPercentage += item.percentage
    return `${chartColors[index % chartColors.length]} ${start}% ${Math.min(accumulatedPercentage, 100)}%`
  })

  return { background: `conic-gradient(${segments.join(', ')})` }
}

export function IncomeMonthlySummary() {
  const currentMonth = getCurrentMonth()
  const [month, setMonth] = useState(currentMonth)
  const [summary, setSummary] = useState<IncomeMonthlySummaryData | null>(null)
  const [categoryView, setCategoryView] = useState<CategoryView>('distribution')
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
    setMonth((value) => shiftMonth(value, -1))
  }

  function showNextMonth() {
    setMonth((value) => value >= currentMonth ? value : shiftMonth(value, 1))
  }

  const principalCategory = summary?.categories[0]

  return (
    <section className="mb-10 w-full text-left md:relative md:left-1/2 md:w-[min(72rem,calc(100vw-3rem))] md:-translate-x-1/2" aria-labelledby="income-summary-month">
      <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        <button type="button" onClick={showPreviousMonth} className="app-button-secondary justify-self-start px-2 text-sm sm:px-3 sm:text-base" aria-label="Mostrar mes anterior">
          ← <span className="hidden sm:inline">Mes anterior</span><span className="sm:hidden">Anterior</span>
        </button>
        <h3 id="income-summary-month" className="app-text min-w-0 text-center text-lg font-semibold sm:text-2xl">{formatMonth(month)}</h3>
        <button type="button" onClick={showNextMonth} disabled={month >= currentMonth} className="app-button-secondary justify-self-end px-2 text-sm sm:px-3 sm:text-base" aria-label="Mostrar mes siguiente">
          <span className="hidden sm:inline">Mes siguiente</span><span className="sm:hidden">Siguiente</span> →
        </button>
      </div>

      {isLoading && <div className="app-panel min-h-44 text-center"><p className="app-muted">Cargando resumen de ingresos...</p></div>}

      {!isLoading && error && (
        <div className="app-panel mx-auto max-w-lg text-center">
          <p role="alert" className="app-error mb-4">{error}</p>
          <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="app-button-primary">Reintentar</button>
        </div>
      )}

      {!isLoading && !error && summary?.incomeCount === 0 && (
        <div className="app-panel mx-auto max-w-2xl text-center">
          <h4 className="app-text text-xl font-semibold">Todavía no registraste ingresos en este mes.</h4>
          <p className="app-muted mx-auto mb-5 mt-2 max-w-xl">Cuando registres movimientos, acá vas a ver cuánto ingresó y cómo se distribuyó entre tus categorías.</p>
          <Link to="/ingresos/movimientos" className="app-button-primary">Registrar ingreso</Link>
        </div>
      )}

      {!isLoading && !error && summary && summary.incomeCount > 0 && (
        <>
          <div className="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-4 [scrollbar-width:none] md:grid md:grid-cols-3 md:gap-5 md:overflow-visible">
            <article className="flex min-h-[25rem] min-w-[88%] snap-center flex-col items-center justify-center overflow-hidden rounded-3xl bg-emerald-700 p-6 text-center text-white shadow-sm md:min-w-0">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-100">Total ingresado</p>
              <h4 className="mb-8 text-2xl font-bold sm:text-3xl">{formatMonth(summary.month)}</h4>
              <p className="min-w-0 max-w-full whitespace-nowrap font-bold leading-tight [font-size:clamp(1.4rem,7vw,2.75rem)] sm:[font-size:clamp(1.625rem,2.8vw,2.75rem)]">{currencyFormatter.format(summary.totalIncome)}</p>
              <p className="mt-6 text-lg text-emerald-100">{summary.incomeCount} {summary.incomeCount === 1 ? 'ingreso' : 'ingresos'}</p>
            </article>

            <article className="min-h-[25rem] min-w-[88%] snap-center overflow-hidden rounded-3xl bg-violet-100 p-5 text-gray-900 shadow-sm dark:bg-violet-950/70 sm:p-6 md:min-w-0">
              <h4 className="mb-4 text-center text-xl font-bold">Categorías</h4>
              <div className="mb-5 grid grid-cols-2 rounded-xl bg-white/70 p-1 text-sm dark:bg-white/10" aria-label="Vista de categorías de ingreso">
                <button type="button" onClick={() => setCategoryView('distribution')} aria-pressed={categoryView === 'distribution'} className={`rounded-lg px-2 py-2 font-semibold ${categoryView === 'distribution' ? 'bg-violet-600 text-white' : 'text-gray-700 dark:text-violet-100'}`}>Distribución</button>
                <button type="button" onClick={() => setCategoryView('detail')} aria-pressed={categoryView === 'detail'} className={`rounded-lg px-2 py-2 font-semibold ${categoryView === 'detail' ? 'bg-violet-600 text-white' : 'text-gray-700 dark:text-violet-100'}`}>Detalle</button>
              </div>
              {categoryView === 'distribution' ? (
                <div>
                  <div className="relative mx-auto mb-5 aspect-square w-40 rounded-full sm:w-44" style={getDonutStyle(summary.categories)} role="img" aria-label="Distribución porcentual de ingresos por categoría">
                    <div className="absolute inset-[24%] flex items-center justify-center rounded-full bg-violet-100 text-center text-sm font-bold dark:bg-violet-950">100%</div>
                  </div>
                  <ul className="space-y-2">
                    {summary.categories.map((category, index) => (
                      <li key={category.categoryId} className="flex min-w-0 items-start gap-2 text-sm">
                        <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} aria-hidden="true" />
                        <span className="min-w-0 flex-1 break-words font-medium">{category.name}{category.status === 'ARCHIVADA' && <span className="ml-1 text-xs font-normal text-gray-600 dark:text-violet-200">(Archivada)</span>}</span>
                        <span className="shrink-0 font-semibold">{formatPercentage(category.percentage)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
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
              )}
            </article>

            {principalCategory && (
              <article className="flex min-h-[25rem] min-w-[88%] snap-center flex-col overflow-hidden rounded-3xl bg-sky-100 p-6 text-gray-900 shadow-sm dark:bg-sky-950/70 md:min-w-0">
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
          <div className="flex justify-center gap-2 md:hidden" aria-hidden="true">{Array.from({ length: principalCategory ? 3 : 2 }, (_, index) => <span key={index} className="h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-slate-600" />)}</div>
        </>
      )}
    </section>
  )
}
