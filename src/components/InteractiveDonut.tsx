import { useState } from 'react'
import type { CSSProperties } from 'react'

export type DonutItem = {
  id: string
  name: string
  amount: number
  percentage: number
  detail?: string
}

type InteractiveDonutProps = {
  items: DonutItem[]
  total: number
  accessibleName: string
  centerLabel: string
  currencyFormatter: Intl.NumberFormat
  percentageFormatter: (value: number) => string
  colors: string[]
}

export function InteractiveDonut({ items, total, accessibleName, centerLabel, currencyFormatter, percentageFormatter, colors }: InteractiveDonutProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeItem = items.find((item) => item.id === activeId) ?? null
  let accumulated = 0

  function toggleItem(id: string) {
    setActiveId((current) => current === id ? null : id)
  }

  return (
    <div>
      <div className="relative mx-auto mb-5 aspect-square w-44 sm:w-48" role="img" aria-label={accessibleName} onPointerLeave={() => setActiveId(null)}>
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90 overflow-visible" aria-hidden="true">
          <circle cx="60" cy="60" r="48" pathLength="100" fill="none" stroke="var(--color-border)" strokeWidth="15" opacity="0.5" />
          {items.map((item, index) => {
            const offset = -accumulated
            accumulated += item.percentage
            const isActive = activeId === item.id
            const isDimmed = activeId !== null && !isActive
            return <circle key={item.id} cx="60" cy="60" r="48" pathLength="100" fill="none" stroke={colors[index % colors.length]} strokeWidth={isActive ? 18 : 15} strokeLinecap="butt" strokeDasharray={`${Math.min(item.percentage, 100)} ${Math.max(100 - item.percentage, 0)}`} strokeDashoffset={offset} className={`chart-donut-segment cursor-pointer transition-[opacity,stroke-width] duration-300 ${isDimmed ? 'opacity-25' : 'opacity-100'}`} style={{ '--segment-length': Math.min(item.percentage, 100) } as CSSProperties} onPointerEnter={() => setActiveId(item.id)} onClick={() => toggleItem(item.id)} />
          })}
        </svg>
        <div className="pointer-events-none absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-[var(--color-surface)] px-2 text-center shadow-inner">
          <span className="app-muted max-w-full truncate text-[0.62rem] font-semibold uppercase tracking-wide sm:text-xs">{activeItem?.name ?? centerLabel}</span>
          <strong className="app-text mt-1 max-w-full whitespace-nowrap text-sm leading-tight sm:text-base">{currencyFormatter.format(activeItem?.amount ?? total)}</strong>
          {activeItem && <span className="app-muted mt-1 text-xs font-semibold">{percentageFormatter(activeItem.percentage)}</span>}
        </div>
      </div>

      <ul className="space-y-1.5" aria-label={`${accessibleName}: detalle`}>
        {items.map((item, index) => {
          const isActive = activeId === item.id
          return <li key={item.id}><button type="button" onPointerEnter={() => setActiveId(item.id)} onPointerLeave={() => setActiveId(null)} onFocus={() => setActiveId(item.id)} onBlur={() => setActiveId(null)} onClick={() => toggleItem(item.id)} aria-pressed={isActive} className={`flex min-h-10 w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isActive ? 'bg-white/80 shadow-sm dark:bg-white/10' : 'hover:bg-white/50 dark:hover:bg-white/5'}`}>
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} aria-hidden="true" />
            <span className="min-w-0 flex-1"><span className="block break-words font-medium">{item.name}{index === 0 && <span className="app-muted ml-1 text-[0.65rem] font-bold uppercase">Principal</span>}</span>{item.detail && <span className="app-muted block text-xs">{item.detail}</span>}</span>
            <span className="shrink-0 font-semibold">{percentageFormatter(item.percentage)}</span>
          </button></li>
        })}
      </ul>
    </div>
  )
}
