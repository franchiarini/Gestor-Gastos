import { useOutletContext } from 'react-router'
import { MonthlySummary } from '../../components/MonthlySummary'
import { SectionHeader } from '../../components/SectionHeader'
import type { PersonalSpaceLayoutContext } from '../../layouts/PersonalSpaceLayout'

export default function PersonalSummaryPage() {
  const { spaceId } = useOutletContext<PersonalSpaceLayoutContext>()
  return <section aria-labelledby="personal-summary-title"><SectionHeader id="personal-summary-title" title="Resumen" description="Una vista rápida de cómo se distribuyen tus gastos." /><MonthlySummary spaceId={spaceId} showMembers={false} /></section>
}
