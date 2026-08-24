import { useOutletContext } from 'react-router'
import { MonthlySummary } from '../../components/MonthlySummary'
import type { PersonalSpaceLayoutContext } from '../../layouts/PersonalSpaceLayout'

export default function PersonalSummaryPage() {
  const { spaceId } = useOutletContext<PersonalSpaceLayoutContext>()
  return <section aria-labelledby="personal-summary-title"><h2 id="personal-summary-title" className="mb-6 text-2xl font-semibold text-gray-900">Resumen</h2><MonthlySummary spaceId={spaceId} showMembers={false} /></section>
}
