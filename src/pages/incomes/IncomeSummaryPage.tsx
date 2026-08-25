import { IncomeMonthlySummary } from '../../components/IncomeMonthlySummary'
import { SectionHeader } from '../../components/SectionHeader'

export default function IncomeSummaryPage() {
  return (
    <section aria-labelledby="income-summary-title">
      <SectionHeader id="income-summary-title" title="Resumen de ingresos" description="Una vista mensual de cuánto dinero ingresó y de dónde provino." />
      <IncomeMonthlySummary />
    </section>
  )
}
