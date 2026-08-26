import { useOutletContext } from 'react-router'
import { ExpenseEvolution } from '../../components/ExpenseEvolution'
import { SectionHeader } from '../../components/SectionHeader'
import type { SharedSpaceLayoutContext } from '../../layouts/SharedSpaceLayout'

export default function SharedEvolutionPage() {
  const { spaceId } = useOutletContext<SharedSpaceLayoutContext>()
  return <section aria-labelledby="shared-evolution-title"><SectionHeader id="shared-evolution-title" title="Evolución" description="Seguí la evolución de los gastos mes a mes." /><ExpenseEvolution spaceId={spaceId} emptyTitle="Todavía no hay gastos suficientes para mostrar una evolución." /></section>
}
