import { useOutletContext } from 'react-router'
import { MonthlySummary } from '../../components/MonthlySummary'
import { SectionHeader } from '../../components/SectionHeader'
import type { SharedSpaceLayoutContext } from '../../layouts/SharedSpaceLayout'

export default function SharedSummaryPage() {
  const { spaceId } = useOutletContext<SharedSpaceLayoutContext>()
  return <section aria-labelledby="shared-summary-title"><SectionHeader id="shared-summary-title" title="Resumen" description="Conocé cómo se distribuyen los gastos de este espacio." /><MonthlySummary spaceId={spaceId} showMembers /></section>
}
