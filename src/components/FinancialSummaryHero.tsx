import type { ReactNode } from 'react'

type FinancialSummaryHeroProps = {
  tone: 'expense' | 'income'
  month: string
  label: string
  total: string
  movementCount: number
  movementLabel: string
  principalName?: string
  principalPercentage?: string
  donut: ReactNode
}

export function FinancialSummaryHero({ tone, month, label, total, movementCount, movementLabel, principalName, principalPercentage, donut }: FinancialSummaryHeroProps) {
  const styles = tone === 'expense'
    ? { surface: 'border-blue-200 bg-gradient-to-br from-blue-50 via-white to-violet-50 dark:border-blue-900 dark:from-blue-950/55 dark:via-slate-950 dark:to-violet-950/35', eyebrow: 'text-blue-700 dark:text-blue-300', accent: 'bg-blue-600', chip: 'border-blue-200 bg-blue-100/70 dark:border-blue-900 dark:bg-blue-950/70' }
    : { surface: 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:border-emerald-900 dark:from-emerald-950/50 dark:via-slate-950 dark:to-sky-950/35', eyebrow: 'text-emerald-700 dark:text-emerald-300', accent: 'bg-emerald-600', chip: 'border-emerald-200 bg-emerald-100/70 dark:border-emerald-900 dark:bg-emerald-950/70' }

  return (
    <article className={`relative overflow-hidden rounded-3xl border p-5 shadow-lg shadow-slate-900/5 sm:p-7 lg:p-8 dark:shadow-black/20 ${styles.surface}`}>
      <span className={`absolute inset-y-0 left-0 w-1.5 ${styles.accent}`} aria-hidden="true" />
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.8fr)] lg:gap-10">
        <div className="min-w-0 text-center lg:text-left">
          <p className={`text-sm font-bold uppercase tracking-[0.18em] ${styles.eyebrow}`}>{month}</p>
          <h3 className="app-text mt-5 text-lg font-semibold sm:text-xl">{label}</h3>
          <p className="app-text mt-2 min-w-0 max-w-full whitespace-nowrap font-extrabold leading-none tracking-tight [font-size:clamp(2rem,10vw,4.5rem)] lg:[font-size:clamp(2.75rem,5vw,4.5rem)]">{total}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
            <span className={`app-text rounded-full border px-3 py-1.5 text-sm font-semibold ${styles.chip}`}>{movementCount} {movementCount === 1 ? movementLabel : `${movementLabel}s`}</span>
            {principalName && <span className={`app-text max-w-full rounded-full border px-3 py-1.5 text-sm font-semibold ${styles.chip}`}><span className="app-muted mr-1">Principal:</span>{principalName}{principalPercentage && <span className="app-muted"> · {principalPercentage}</span>}</span>}
          </div>
        </div>
        <div className="min-w-0 rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-5">
          {donut}
        </div>
      </div>
    </article>
  )
}
