import { useEffect, useState } from 'react'
import { getMonthlySummary } from '../domain/getMonthlySummary'
import type { MonthlySummary as MonthlySummaryData } from '../domain/getMonthlySummary'
import { EmptyState } from './EmptyState'
import { InteractiveDonut } from './InteractiveDonut'
import { FinancialSummaryHero } from './FinancialSummaryHero'

type MonthlySummaryProps = {
  spaceId: string
  showMembers: boolean
  refreshKey?: number
  month?: string
  showMonthNavigation?: boolean
}

type SummaryView = 'distribution' | 'detail'

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

const percentageFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

function formatPercentage(value: number) {
  return `${percentageFormatter.format(value)}%`
}

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

export function MonthlySummary({ spaceId, showMembers, refreshKey, month: controlledMonth, showMonthNavigation = true }: MonthlySummaryProps) {
  const currentMonth = getCurrentMonth()
  const [internalMonth, setInternalMonth] = useState(currentMonth)
  const month = controlledMonth ?? internalMonth
  const [summary, setSummary] = useState<MonthlySummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [memberView, setMemberView] = useState<SummaryView>('distribution')

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError('')

    getMonthlySummary(spaceId, month)
      .then((result) => {
        if (isMounted) setSummary(result)
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setSummary(null)
          setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el resumen mensual.')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [spaceId, month, refreshKey])

  return (
    <section className="mb-10 w-full text-left md:relative md:left-1/2 md:w-[min(72rem,calc(100vw-3rem))] md:-translate-x-1/2" aria-labelledby={`monthly-summary-${spaceId}`}>
      {showMonthNavigation && <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        <button type="button" onClick={() => setInternalMonth((value) => shiftMonth(value, -1))} className="justify-self-start rounded border border-gray-300 px-2 py-2 text-sm font-semibold text-gray-700 dark:bg-slate-900 sm:px-3 sm:text-base">
          Mes anterior
        </button>
        <h2 id={`monthly-summary-${spaceId}`} className="min-w-0 text-center text-lg font-semibold text-gray-900 sm:text-2xl">
          {formatMonth(month)}
        </h2>
        <button type="button" onClick={() => setInternalMonth((value) => shiftMonth(value, 1))} disabled={month >= currentMonth} className="justify-self-end rounded border border-gray-300 px-2 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:text-[var(--color-disabled)] dark:bg-slate-900 sm:px-3 sm:text-base">
          Mes siguiente
        </button>
      </div>}

      {isLoading && <p className="text-center text-gray-600">Cargando resumen mensual...</p>}
      {error && <p role="alert" className="text-center text-red-600">{error}</p>}
      {!isLoading && !error && summary?.expenseCount === 0 && (
        <EmptyState title={showMembers ? 'No hubo gastos en este espacio durante este mes.' : 'No hubo gastos en este mes.'} description="Cuando registres gastos, el resumen mensual aparecerá acá." />
      )}

      {!isLoading && !error && summary && summary.expenseCount > 0 && (
        <>
        <div className="space-y-5">
          <FinancialSummaryHero tone="expense" month={formatMonth(summary.month)} label="Gastaste este mes" total={currencyFormatter.format(summary.total)} movementCount={summary.expenseCount} movementLabel="movimiento" principalName={summary.categories[0]?.name} principalPercentage={summary.categories[0] ? formatPercentage(summary.categories[0].percentage) : undefined} donut={<InteractiveDonut key={`categories-${summary.month}`} items={summary.categories.map((category) => ({ id: category.categoryId, name: category.name, amount: category.amount, percentage: category.percentage }))} total={summary.total} accessibleName="Distribución porcentual de gastos por categoría" centerLabel="Total del mes" currencyFormatter={currencyFormatter} percentageFormatter={formatPercentage} colors={chartColors} />} />

          <div className="grid gap-5 lg:grid-cols-2">
          <article className="min-w-0 rounded-3xl border border-violet-200 bg-violet-50 p-5 text-gray-900 shadow-sm dark:border-violet-900 dark:bg-violet-950/45 sm:p-6">
            <h3 className="mb-5 text-xl font-bold dark:text-gray-100">Detalle por categoría</h3>
              <div className="space-y-4">
                {summary.categories.map((category) => (
                  <div key={category.categoryId} className="min-w-0">
                    <div className="mb-2 min-w-0 text-sm">
                      <p className="break-words font-semibold">{category.name}</p>
                      <p className="flex flex-wrap justify-between gap-x-2 text-gray-700"><span className="break-all">{currencyFormatter.format(category.amount)}</span><span>{category.percentage}%</span></p>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white dark:bg-white/10" aria-label={`${category.name}: ${category.percentage}%`}><div className="h-full rounded-full bg-violet-600 dark:bg-violet-400" style={{ width: `${Math.min(category.percentage, 100)}%` }} /></div>
                  </div>
                ))}
              </div>
          </article>

          {showMembers && (
            <article className="min-w-0 rounded-3xl bg-emerald-100 p-5 text-gray-900 shadow-sm dark:bg-emerald-950/70 sm:p-6">
              <h3 className="mb-4 text-center text-xl font-bold">Integrantes</h3>
              <div className="mb-5 grid grid-cols-2 rounded-xl bg-white/70 p-1 text-sm dark:bg-white/10" aria-label="Vista de integrantes">
                <button type="button" onClick={() => setMemberView('distribution')} aria-pressed={memberView === 'distribution'} className={`rounded-lg px-2 py-2 font-semibold ${memberView === 'distribution' ? 'bg-emerald-600 text-white' : 'text-gray-700'}`}>Distribución</button>
                <button type="button" onClick={() => setMemberView('detail')} aria-pressed={memberView === 'detail'} className={`rounded-lg px-2 py-2 font-semibold ${memberView === 'detail' ? 'bg-emerald-600 text-white' : 'text-gray-700'}`}>Detalle</button>
              </div>
              {memberView === 'distribution' ? (
                <InteractiveDonut key={`members-${summary.month}`} items={summary.members.map((member) => ({ id: member.membershipId, name: member.name, amount: member.amount, percentage: member.percentage }))} total={summary.total} accessibleName="Distribución porcentual de pagos por integrante" centerLabel="Total pagado" currencyFormatter={currencyFormatter} percentageFormatter={formatPercentage} colors={chartColors} />
              ) : (
                <div className="space-y-4">
                  {summary.members.map((member) => (
                    <div key={member.membershipId} className="min-w-0">
                      <div className="mb-2 min-w-0 text-sm">
                        <p className="break-words font-semibold">{member.name}</p>
                        <p className="flex flex-wrap justify-between gap-x-2 text-gray-700"><span className="break-all">{currencyFormatter.format(member.amount)}</span><span>{member.percentage}%</span></p>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white dark:bg-white/10" aria-label={`${member.name}: ${member.percentage}%`}><div className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400" style={{ width: `${Math.min(member.percentage, 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          )}
          {!showMembers && summary.categories[0] && (
            <article className="flex min-w-0 flex-col overflow-hidden rounded-3xl bg-amber-100 p-6 text-gray-900 shadow-sm dark:bg-amber-950/60">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">Destacado del mes</p>
              <div className="flex flex-1 flex-col justify-center">
                <p className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-100">Categoría principal</p>
                <h3 className="mb-6 break-words text-2xl font-bold sm:text-3xl">{summary.categories[0].name}</h3>
                <p className="min-w-0 max-w-full whitespace-nowrap font-bold leading-tight [font-size:clamp(1.4rem,7vw,2.75rem)] sm:[font-size:clamp(1.625rem,2.8vw,2.75rem)]">
                  {currencyFormatter.format(summary.categories[0].amount)}
                </p>
                <p className="mt-3 font-semibold text-amber-900 dark:text-amber-100">{summary.categories[0].percentage}% del total</p>
                <div className="mt-8 border-t border-amber-300 pt-5 dark:border-amber-700">
                  <p className="mb-1 text-sm font-semibold text-amber-900 dark:text-amber-100">Promedio por gasto</p>
                  <p className="min-w-0 max-w-full whitespace-nowrap font-bold leading-tight [font-size:clamp(1.2rem,6vw,2rem)] sm:[font-size:clamp(1.375rem,2vw,2rem)]">
                    {currencyFormatter.format(summary.total / summary.expenseCount)}
                  </p>
                </div>
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
