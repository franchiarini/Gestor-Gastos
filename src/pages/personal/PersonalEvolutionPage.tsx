import { useOutletContext } from 'react-router'
import { ExpenseEvolution } from '../../components/ExpenseEvolution'
import type { PersonalSpaceLayoutContext } from '../../layouts/PersonalSpaceLayout'

export default function PersonalEvolutionPage() {
  const { spaceId } = useOutletContext<PersonalSpaceLayoutContext>()
  return <section aria-labelledby="personal-evolution-title"><h2 id="personal-evolution-title" className="mb-6 text-2xl font-semibold text-gray-900">Evolución</h2><ExpenseEvolution spaceId={spaceId} /></section>
}
