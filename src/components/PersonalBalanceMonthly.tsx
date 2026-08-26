import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { EmptyState } from './EmptyState'
import { getPersonalBalanceMonthly } from '../domain/getPersonalBalanceMonthly'
import type { PersonalBalanceMonthly as PersonalBalanceMonthlyData } from '../domain/getPersonalBalanceMonthly'
import { getPersonalBalanceSharedBreakdown } from '../domain/getPersonalBalanceSharedBreakdown'
import type { PersonalBalanceSharedSpace } from '../domain/getPersonalBalanceSharedBreakdown'

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

const percentageFormatter = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 1,
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

function formatSignedCurrency(amount: number) {
  const sign = amount > 0 ? '+' : amount < 0 ? '−' : ''
  return `${sign}${currencyFormatter.format(Math.abs(amount))}`
}

function balancePresentation(balance: number) {
  if (balance > 0) {
    return {
      text: 'Terminaste el mes con balance positivo.',
      heroClass: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/60',
      amountClass: 'text-emerald-800 dark:text-emerald-200',
      accentClass: 'bg-emerald-600 dark:bg-emerald-400',
    }
  }

  if (balance < 0) {
    return {
      text: 'Este mes salieron más fondos de los que ingresaron.',
      heroClass: 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/60',
      amountClass: 'text-rose-800 dark:text-rose-200',
      accentClass: 'bg-rose-600 dark:bg-rose-400',
    }
  }

  return {
    text: 'Ingresos y gastos quedaron equilibrados.',
    heroClass: 'border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/60',
    amountClass: 'text-sky-800 dark:text-sky-200',
    accentClass: 'bg-sky-600 dark:bg-sky-400',
  }
}

type FlowItemProps = {
  label: string
  amount: number
  sign: 'income' | 'expense' | 'balance'
  barWidth: number
  balanceClass?: string
}

function FlowItem({ label, amount, sign, barWidth, balanceClass }: FlowItemProps) {
  const displayAmount = sign === 'expense'
    ? `−${currencyFormatter.format(amount)}`
    : sign === 'income'
      ? `+${currencyFormatter.format(amount)}`
      : formatSignedCurrency(amount)
  const barClass = sign === 'income'
    ? 'bg-emerald-500 dark:bg-emerald-400'
    : sign === 'expense'
      ? 'bg-violet-500 dark:bg-violet-400'
      : balanceClass ?? 'bg-sky-500 dark:bg-sky-400'

  return (
    <div className="min-w-0 flex-1">
      <p className="app-muted text-xs font-bold uppercase tracking-wide">{label}</p>
      <p className="app-text mt-1 break-words text-lg font-bold">{displayAmount}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${barWidth}%` }} />
      </div>
    </div>
  )
}

export function PersonalBalanceMonthly() {
  const currentMonth = getCurrentMonth()
  const [month, setMonth] = useState(currentMonth)
  const [balance, setBalance] = useState<PersonalBalanceMonthlyData | null>(null)
  const [sharedBreakdown, setSharedBreakdown] = useState<PersonalBalanceSharedSpace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError('')
    setBalance(null)
    setSharedBreakdown([])

    getPersonalBalanceMonthly(month)
      .then(async (result) => {
        const breakdown = result.sharedExpensesPaid > 0
          ? await getPersonalBalanceSharedBreakdown(month)
          : []

        if (result.sharedExpensesPaid > 0 && breakdown.length === 0) {
          throw new Error('No se pudo explicar el total pagado en espacios.')
        }

        const breakdownTotal = breakdown.reduce((total, space) => total + space.amountPaid, 0)
        if (Math.abs(breakdownTotal - result.sharedExpensesPaid) >= 0.005) {
          throw new Error('El detalle de espacios no coincide con el total del balance.')
        }

        if (isMounted) {
          setBalance(result)
          setSharedBreakdown(breakdown)
        }
      })
      .catch((loadError: unknown) => {
        if (!isMounted) return
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el balance mensual.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [month, retryCount])

  const hasNoMovements = Boolean(
    balance
      && balance.totalIncome === 0
      && balance.personalExpenses === 0
      && balance.sharedExpensesPaid === 0,
  )
  const presentation = balancePresentation(balance?.finalBalance ?? 0)
  const personalPercentage = balance && balance.totalExpensesPaid > 0
    ? balance.personalExpenses * 100 / balance.totalExpensesPaid
    : 0
  const sharedPercentage = balance && balance.totalExpensesPaid > 0
    ? balance.sharedExpensesPaid * 100 / balance.totalExpensesPaid
    : 0
  const maximumFlowAmount = balance
    ? Math.max(
      balance.totalIncome,
      balance.personalExpenses,
      balance.sharedExpensesPaid,
      Math.abs(balance.finalBalance),
      0,
    )
    : 0
  const flowWidth = (amount: number) => maximumFlowAmount === 0
    ? 0
    : Math.max(Math.abs(amount) * 100 / maximumFlowAmount, amount === 0 ? 0 : 4)

  return (
    <section className="w-full" aria-labelledby="balance-month">
      <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setMonth((value) => shiftMonth(value, -1))}
          className="app-button-secondary justify-self-start px-2 text-sm sm:px-3 sm:text-base"
          aria-label="Mostrar mes anterior"
        >
          ← <span className="hidden sm:inline">Mes anterior</span><span className="sm:hidden">Anterior</span>
        </button>
        <h3 id="balance-month" className="app-text min-w-0 text-center text-base font-semibold sm:text-2xl">
          {formatMonth(month)}
        </h3>
        <button
          type="button"
          onClick={() => setMonth((value) => value >= currentMonth ? value : shiftMonth(value, 1))}
          disabled={month >= currentMonth}
          className="app-button-secondary justify-self-end px-2 text-sm sm:px-3 sm:text-base"
          aria-label="Mostrar mes siguiente"
        >
          <span className="hidden sm:inline">Mes siguiente</span><span className="sm:hidden">Siguiente</span> →
        </button>
      </div>

      {isLoading && (
        <div className="space-y-5" aria-live="polite" aria-busy="true">
          <p className="sr-only">Cargando balance mensual...</p>
          <div className="app-panel min-h-64 animate-pulse bg-[var(--color-surface-muted)]" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="app-panel min-h-32 animate-pulse bg-[var(--color-surface-muted)]" />)}
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="app-panel mx-auto max-w-lg text-center">
          <p role="alert" className="app-error mb-4">{error}</p>
          <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="app-button-primary">
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !error && hasNoMovements && (
        <EmptyState title="Tu balance aparecerá cuando registres ingresos o gastos." description="Registrá movimientos para empezar a ver cómo termina tu mes." action={<><Link to="/ingresos/movimientos" className="app-button-primary">Registrar ingreso</Link><Link to="/gastos" className="app-button-secondary">Registrar gasto</Link></>} className="mx-auto max-w-2xl" />
      )}

      {!isLoading && !error && balance && !hasNoMovements && (
        <div className="space-y-6">
          <article className={`relative overflow-hidden rounded-3xl border p-6 shadow-sm sm:p-8 ${presentation.heroClass}`}>
            <div className={`absolute inset-y-0 left-0 w-1.5 ${presentation.accentClass}`} aria-hidden="true" />
            <div className="relative mx-auto max-w-4xl text-center">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Balance del mes</p>
              <p className={`min-w-0 max-w-full whitespace-nowrap font-bold leading-none tracking-tight [font-size:clamp(2rem,9vw,4.75rem)] ${presentation.amountClass}`}>
                {formatSignedCurrency(balance.finalBalance)}
              </p>
              <p className="app-text mx-auto mt-5 max-w-2xl text-base font-semibold sm:text-lg">{presentation.text}</p>
              {balance.totalIncome === 0 && balance.totalExpensesPaid > 0 && (
                <p className="app-muted mx-auto mt-2 max-w-2xl text-sm">
                  Ya conocemos tus gastos. Registrá ingresos para completar la visión del mes.
                  {' '}<Link to="/ingresos/movimientos" className="app-link min-h-0 p-0">Registrar ingreso</Link>
                </p>
              )}
              {balance.totalIncome > 0 && balance.totalExpensesPaid === 0 && (
                <p className="app-muted mx-auto mt-2 max-w-2xl text-sm">Todavía no hay gastos registrados en este mes.</p>
              )}
            </div>
          </article>

          <section aria-labelledby="balance-breakdown-title">
            <h3 id="balance-breakdown-title" className="app-text mb-4 text-xl font-bold">¿Qué compone tu balance?</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <article className="app-panel min-w-0 border-emerald-200 dark:border-emerald-900">
                <p className="app-muted text-sm font-semibold">Ingresos</p>
                <p className="mt-3 break-words text-2xl font-bold text-emerald-700 dark:text-emerald-300 sm:text-3xl">+{currencyFormatter.format(balance.totalIncome)}</p>
              </article>
              <article className="app-panel min-w-0 border-violet-200 dark:border-violet-900">
                <p className="app-muted text-sm font-semibold">Gastos personales</p>
                <p className="mt-3 break-words text-2xl font-bold text-violet-700 dark:text-violet-300 sm:text-3xl">−{currencyFormatter.format(balance.personalExpenses)}</p>
              </article>
              <article className="app-panel min-w-0 border-sky-200 dark:border-sky-900">
                <p className="app-muted text-sm font-semibold">Pagado en espacios</p>
                <p className="mt-3 break-words text-2xl font-bold text-sky-700 dark:text-sky-300 sm:text-3xl">−{currencyFormatter.format(balance.sharedExpensesPaid)}</p>
                {balance.sharedExpensesPaid > 0 && (
                  <ul className="mt-5 space-y-3 border-t border-[var(--color-border)] pt-4" aria-label="Desglose de pagos por espacio">
                    {sharedBreakdown.map((space) => (
                      <li key={space.spaceId} className="min-w-0 border-b border-[var(--color-border)] pb-3 last:border-b-0 last:pb-0">
                        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                          <div className="min-w-0">
                            <p className="app-text break-words text-sm font-semibold">{space.spaceName}</p>
                            {!space.hasCurrentAccess && (
                              <p className="app-muted mt-1 text-xs">Ya no pertenecés a este espacio</p>
                            )}
                          </div>
                          <p className="app-text shrink-0 break-words text-sm font-bold sm:text-right">
                            {currencyFormatter.format(space.amountPaid)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
          </section>

          <section className="app-panel" aria-labelledby="balance-flow-title">
            <div className="mb-5">
              <h3 id="balance-flow-title" className="app-text text-xl font-bold">Así se construyó tu balance</h3>
              <p className="app-muted mt-1 text-sm">Los importes se muestran en proporción al mayor valor del mes.</p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <FlowItem label="Ingresos" amount={balance.totalIncome} sign="income" barWidth={flowWidth(balance.totalIncome)} />
              <span className="app-muted self-center text-xl" aria-hidden="true">→</span>
              <FlowItem label="Gastos personales" amount={balance.personalExpenses} sign="expense" barWidth={flowWidth(balance.personalExpenses)} />
              <span className="app-muted self-center text-xl" aria-hidden="true">→</span>
              <FlowItem label="Pagos compartidos" amount={balance.sharedExpensesPaid} sign="expense" barWidth={flowWidth(balance.sharedExpensesPaid)} />
              <span className="app-muted self-center text-xl" aria-hidden="true">→</span>
              <FlowItem label="Balance final" amount={balance.finalBalance} sign="balance" barWidth={flowWidth(balance.finalBalance)} balanceClass={presentation.accentClass} />
            </div>
            <p className="app-muted mt-5 border-t border-[var(--color-border)] pt-4 text-sm">
              Total pagado por vos: <strong className="app-text">{currencyFormatter.format(balance.totalExpensesPaid)}</strong>
            </p>
          </section>

          {balance.totalExpensesPaid > 0 && (
            <section className="app-panel" aria-labelledby="expense-distribution-title">
              <div className="mb-5">
                <h3 id="expense-distribution-title" className="app-text text-xl font-bold">Gastos pagados por vos</h3>
                <p className="app-muted mt-1 text-sm">Cómo se distribuyeron entre tu espacio personal y los compartidos.</p>
              </div>
              <div
                className="flex h-4 overflow-hidden rounded-full bg-[var(--color-surface-muted)]"
                role="img"
                aria-label={`Gastos personales: ${percentageFormatter.format(personalPercentage)}%. Gastos compartidos: ${percentageFormatter.format(sharedPercentage)}%.`}
              >
                <div className="h-full bg-violet-500 dark:bg-violet-400" style={{ width: `${personalPercentage}%` }} />
                <div className="h-full bg-sky-500 dark:bg-sky-400" style={{ width: `${sharedPercentage}%` }} />
              </div>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-violet-500 dark:bg-violet-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="app-muted text-sm">Personal</dt>
                    <dd className="app-text break-words font-bold">{percentageFormatter.format(personalPercentage)}% · {currencyFormatter.format(balance.personalExpenses)}</dd>
                  </div>
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-sky-500 dark:bg-sky-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="app-muted text-sm">Compartido</dt>
                    <dd className="app-text break-words font-bold">{percentageFormatter.format(sharedPercentage)}% · {currencyFormatter.format(balance.sharedExpensesPaid)}</dd>
                  </div>
                </div>
              </dl>
            </section>
          )}
        </div>
      )}
    </section>
  )
}
