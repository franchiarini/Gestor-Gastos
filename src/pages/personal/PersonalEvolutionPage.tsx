import { useOutletContext } from 'react-router'
import { ExpenseEvolution } from '../../components/ExpenseEvolution'
import { SectionHeader } from '../../components/SectionHeader'
import type { PersonalSpaceLayoutContext } from '../../layouts/PersonalSpaceLayout'

export default function PersonalEvolutionPage() {
  const { spaceId } = useOutletContext<PersonalSpaceLayoutContext>()
  return <section aria-labelledby="personal-evolution-title"><SectionHeader id="personal-evolution-title" title="Evolución" description="Seguí cómo cambian tus gastos a lo largo del tiempo." /><ExpenseEvolution spaceId={spaceId} /></section>
}
