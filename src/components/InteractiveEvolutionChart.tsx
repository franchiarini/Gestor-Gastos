import { useState } from 'react'

export type EvolutionChartPoint = {
  month: string
  amount: number
  changeLabel: string
}

type InteractiveEvolutionChartProps = {
  points: EvolutionChartPoint[]
  colorClass: string
  accessibleName: string
  currencyFormatter: Intl.NumberFormat
  compactCurrencyFormatter: Intl.NumberFormat
  formatMonth: (month: string) => string
}

export function InteractiveEvolutionChart({ points, colorClass, accessibleName, currencyFormatter, compactCurrencyFormatter, formatMonth }: InteractiveEvolutionChartProps) {
  const [activeMonth, setActiveMonth] = useState<string | null>(null)
  const maximum = Math.max(...points.map((point) => point.amount), 0)
  const activePoint = points.find((point) => point.month === activeMonth) ?? null

  return (
    <div>
      <div className="relative">
        {activePoint && <div className="pointer-events-none absolute left-1/2 top-1 z-20 -translate-x-1/2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-center shadow-lg"><p className="app-muted text-xs font-semibold">{formatMonth(activePoint.month)}</p><p className="app-text whitespace-nowrap text-sm font-bold">{currencyFormatter.format(activePoint.amount)}</p><p className="app-muted text-xs">{activePoint.changeLabel}</p></div>}
        <div className="flex items-end gap-1 sm:gap-3" role="img" aria-label={accessibleName} onPointerLeave={() => setActiveMonth(null)}>
          {points.map((point) => {
            const height = maximum === 0 ? 0 : Math.max((point.amount / maximum) * 100, point.amount > 0 ? 4 : 0)
            const isActive = activeMonth === point.month
            const isDimmed = activeMonth !== null && !isActive
            return <button type="button" key={point.month} onPointerEnter={() => setActiveMonth(point.month)} onFocus={() => setActiveMonth(point.month)} onBlur={() => setActiveMonth(null)} onClick={() => setActiveMonth((current) => current === point.month ? null : point.month)} aria-label={`${formatMonth(point.month)}: ${currencyFormatter.format(point.amount)}. ${point.changeLabel}`} className={`group flex min-w-0 flex-1 flex-col items-center rounded-lg outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-blue-500 ${isDimmed ? 'opacity-45' : 'opacity-100'}`}>
              <span className="mb-2 max-w-full text-center text-[0.65rem] font-semibold text-gray-700 dark:text-gray-200 sm:text-xs">{compactCurrencyFormatter.format(point.amount)}</span>
              <span className={`flex h-36 w-full items-end justify-center rounded-t-lg bg-white/70 dark:bg-white/10 sm:h-44 ${isActive ? 'ring-2 ring-blue-400/60' : ''}`}>
                <span className={`chart-bar-enter w-3/5 rounded-t-lg transition-[filter,opacity] duration-300 ${colorClass} ${isActive ? 'brightness-110 drop-shadow-md' : ''}`} style={{ height: `${height}%` }} />
              </span>
              <span className="mt-2 text-xs font-semibold text-gray-800 dark:text-gray-100">{formatMonth(point.month)}</span>
              <span className="mt-1 min-h-8 break-words text-center text-[0.6rem] leading-tight text-gray-600 dark:text-gray-300 sm:text-[0.7rem]">{point.changeLabel}</span>
            </button>
          })}
        </div>
      </div>
    </div>
  )
}
