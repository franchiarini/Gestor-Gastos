import { useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { IncomeMonthlySummary } from '../../components/IncomeMonthlySummary'
import { MonthlySummary } from '../../components/MonthlySummary'
import { SectionHeader } from '../../components/SectionHeader'
import { useFinancialSectionHash } from '../../hooks/useFinancialSectionHash'
import type { PersonalSpaceLayoutContext } from '../../layouts/PersonalSpaceLayout'

const monthFormatter = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

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

export default function PersonalSummaryPage() {
  const { spaceId } = useOutletContext<PersonalSpaceLayoutContext>()
  const currentMonth = getCurrentMonth()
  const [month, setMonth] = useState(currentMonth)
  useFinancialSectionHash()

  return (
    <section aria-labelledby="personal-summary-title">
      <SectionHeader id="personal-summary-title" title="Resumen" description="Consultá tus gastos e ingresos del mes en un solo lugar." />
      <div className="mb-8 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        <button type="button" onClick={() => setMonth((value) => shiftMonth(value, -1))} className="app-button-secondary justify-self-start px-2 text-sm sm:px-3 sm:text-base"><span className="hidden sm:inline">Mes anterior</span><span className="sm:hidden">Anterior</span></button>
        <h2 className="app-text min-w-0 text-center text-lg font-semibold sm:text-2xl">{formatMonth(month)}</h2>
        <button type="button" onClick={() => setMonth((value) => shiftMonth(value, 1))} disabled={month >= currentMonth} className="app-button-secondary justify-self-end px-2 text-sm sm:px-3 sm:text-base"><span className="hidden sm:inline">Mes siguiente</span><span className="sm:hidden">Siguiente</span></button>
      </div>
      <section id="gastos" className="scroll-mt-24" aria-labelledby="personal-expense-summary-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="personal-expense-summary-title" className="app-text text-2xl font-bold">Gastos</h2><Link to="/gastos?space=personal" className="app-button-secondary">Registrar gasto</Link></div>
        <MonthlySummary spaceId={spaceId} showMembers={false} month={month} showMonthNavigation={false} />
      </section>
      <section id="ingresos" className="scroll-mt-24 border-t border-[var(--color-border)] pt-8" aria-labelledby="personal-income-summary-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="personal-income-summary-title" className="app-text text-2xl font-bold">Ingresos</h2><Link to="/ingresos/movimientos" className="app-button-secondary">Registrar ingreso</Link></div>
        <IncomeMonthlySummary month={month} showMonthNavigation={false} />
      </section>
    </section>
  )
}
