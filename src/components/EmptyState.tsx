import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
  className?: string
}

export function EmptyState({ title, description, action, compact = false, className = '' }: EmptyStateProps) {
  return (
    <div className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-center ${compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'} ${className}`}>
      <h3 className="app-text text-base font-semibold sm:text-lg">{title}</h3>
      {description && <p className="app-muted mx-auto mt-2 max-w-xl text-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  )
}
