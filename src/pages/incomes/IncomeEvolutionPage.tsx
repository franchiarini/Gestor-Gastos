import { IncomeEvolution } from '../../components/IncomeEvolution'
import { SectionHeader } from '../../components/SectionHeader'

export default function IncomeEvolutionPage() {
  return (
    <section aria-labelledby="income-evolution-title">
      <SectionHeader
        id="income-evolution-title"
        title="Evolución de ingresos"
        description="Seguí cómo cambian tus ingresos a lo largo del tiempo."
      />
      <IncomeEvolution />
    </section>
  )
}
