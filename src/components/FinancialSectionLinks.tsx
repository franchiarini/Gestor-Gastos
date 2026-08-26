import { Link } from 'react-router'

type FinancialSection = 'gastos' | 'ingresos'

type FinancialSectionLinksProps = {
  section: FinancialSection
}

const links = [
  { label: 'Resumen', path: '/personal/resumen', expenseDescription: 'Cómo se compusieron tus gastos este mes', incomeDescription: 'Cómo se compusieron tus ingresos este mes' },
  { label: 'Evolución', path: '/personal/evolucion', expenseDescription: 'Cómo cambiaron tus gastos en el tiempo', incomeDescription: 'Cómo cambiaron tus ingresos en el tiempo' },
  { label: 'Categorías', path: '/personal/categorias', expenseDescription: 'Organizá tus tipos de gasto', incomeDescription: 'Organizá tus fuentes de ingreso' },
]

export function FinancialSectionLinks({ section }: FinancialSectionLinksProps) {
  const title = section === 'gastos' ? 'Explorá tus gastos' : 'Explorá tus ingresos'

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        {title}
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.path}
            to={`${link.path}#${section}`}
            className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-[var(--color-text)] transition hover:border-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:border-blue-500"
          >
            <span className="flex items-center justify-between gap-2 text-sm font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-300"><span>{link.label}</span><span aria-hidden="true">→</span></span>
            <span className="app-muted mt-1 block text-xs leading-relaxed">{section === 'gastos' ? link.expenseDescription : link.incomeDescription}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
