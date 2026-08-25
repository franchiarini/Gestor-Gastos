import { PersonalBalanceMonthly } from '../components/PersonalBalanceMonthly'
import { SectionHeader } from '../components/SectionHeader'

export default function BalancePage() {
  return (
    <main className="app-page overflow-x-hidden">
      <div className="app-container">
        <SectionHeader
          id="balance-title"
          title="Balance"
          description="Una vista clara de cuánto entró y cuánto salió de tu bolsillo este mes."
        />
        <PersonalBalanceMonthly />
      </div>
    </main>
  )
}
