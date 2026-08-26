import { useOutletContext } from 'react-router'
import { ExpenseEvolution } from '../../components/ExpenseEvolution'
import { IncomeEvolution } from '../../components/IncomeEvolution'
import { SectionHeader } from '../../components/SectionHeader'
import { useFinancialSectionHash } from '../../hooks/useFinancialSectionHash'
import type { PersonalSpaceLayoutContext } from '../../layouts/PersonalSpaceLayout'

export default function PersonalEvolutionPage() {
  const { spaceId } = useOutletContext<PersonalSpaceLayoutContext>()
  useFinancialSectionHash()
  return <section aria-labelledby="personal-evolution-title">
    <SectionHeader id="personal-evolution-title" title="Evolución" description="Seguí cómo cambian tus gastos e ingresos a lo largo del tiempo." />
    <section id="gastos" className="scroll-mt-24" aria-labelledby="personal-expense-evolution-title"><h2 id="personal-expense-evolution-title" className="app-text mb-5 text-2xl font-bold">Gastos</h2><ExpenseEvolution spaceId={spaceId} /></section>
    <section id="ingresos" className="scroll-mt-24 border-t border-[var(--color-border)] pt-8" aria-labelledby="personal-income-evolution-title"><h2 id="personal-income-evolution-title" className="app-text mb-5 text-2xl font-bold">Ingresos</h2><IncomeEvolution /></section>
  </section>
}
