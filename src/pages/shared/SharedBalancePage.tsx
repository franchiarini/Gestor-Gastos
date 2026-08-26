import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useOutletContext } from 'react-router'
import { SectionHeader } from '../../components/SectionHeader'
import { EmptyState } from '../../components/EmptyState'
import { getSharedSpaceBalanceMonthly } from '../../domain/getSharedSpaceBalanceMonthly'
import type { SharedBalanceMember, SharedBalanceReason, SharedSpaceBalanceMonthly } from '../../domain/getSharedSpaceBalanceMonthly'
import { setSharedDeclaredIncome } from '../../domain/setSharedDeclaredIncome'
import type { SharedSpaceLayoutContext } from '../../layouts/SharedSpaceLayout'

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

const percentageFormatter = new Intl.NumberFormat('es-AR', {
  style: 'percent',
  maximumFractionDigits: 1,
})

const monthFormatter = new Intl.DateTimeFormat('es-AR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

function getCurrentMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  if (!year || !month) throw new Error('No se pudo determinar el mes actual.')
  return `${year}-${month}-01`
}

function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`
}

function formatMonth(month: string) {
  const label = monthFormatter.format(new Date(`${month}T00:00:00Z`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatSignedCurrency(amount: number) {
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : ''
  return `${sign}${currencyFormatter.format(Math.abs(amount))}`
}

function reasonMessage(reason: SharedBalanceReason) {
  const messages: Record<SharedBalanceReason, string> = {
    HISTORY_INCOMPLETE: 'No existe suficiente historial de participación para calcular los aportes proporcionales de este período con precisión.',
    NO_RELEVANT_MEMBERS: 'No se pudieron determinar integrantes relevantes para uno o más gastos.',
    MISSING_DECLARATIONS: 'Faltan declaraciones de ingreso necesarias para calcular los aportes proporcionales.',
    ZERO_RELEVANT_INCOME: 'Todos los ingresos declarados relevantes para al menos un gasto son $0, por lo que no puede calcularse una proporción.',
  }
  return messages[reason]
}

function declarationError(error: unknown) {
  const message = error instanceof Error ? error.message : 'No se pudo guardar la declaración.'
  const normalized = message.toLowerCase()
  if (normalized.includes('mes futuro')) return 'No podés declarar ingresos para un mes futuro.'
  if (normalized.includes('espacio compartido activo')) return 'Este espacio ya no permite modificar declaraciones.'
  if (normalized.includes('membresía activa')) return 'Ya no tenés una membresía activa para modificar esta declaración.'
  if (normalized.includes('historial de participación')) return 'No existe participación registrada para que declares ingresos en este mes.'
  if (normalized.includes('monto declarado')) return message
  return message
}

type Compensation = { fromName: string; toName: string; amount: number } | null

function getCompensation(balance: SharedSpaceBalanceMonthly): Compensation {
  if (!balance.proportionalAvailable || !balance.proportionalApplicable || balance.monthMemberCount !== 2) return null
  const relevant = balance.members.filter((member) => member.relevantThisMonth && member.difference !== null)
  if (relevant.length !== 2) return null
  const positive = relevant.find((member) => (member.difference ?? 0) > 0)
  const negative = relevant.find((member) => (member.difference ?? 0) < 0)
  if (!positive || !negative || positive.difference !== -(negative.difference ?? 0)) return null
  return { fromName: negative.name, toName: positive.name, amount: positive.difference }
}

function MemberCard({ member, variableComposition }: { member: SharedBalanceMember; variableComposition: boolean }) {
  const differenceClass = member.difference === null || member.difference === 0
    ? 'app-text'
    : member.difference > 0
      ? 'text-emerald-700 dark:text-emerald-300'
      : 'text-rose-700 dark:text-rose-300'

  return (
    <article className="app-panel min-w-0">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <h4 className="app-text min-w-0 break-words text-xl font-bold">{member.name}</h4>
        {member.currentStatus === 'FINALIZADA' && <span className="rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-muted)]">Ya no pertenece al espacio</span>}
      </div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div><dt className="app-muted text-sm">Ingreso declarado</dt><dd className="app-text mt-1 break-words font-bold">{member.hasDeclaration ? currencyFormatter.format(member.declaredIncome ?? 0) : 'Sin declaración'}</dd></div>
        <div><dt className="app-muted text-sm">Pagó</dt><dd className="app-text mt-1 break-words font-bold">{currencyFormatter.format(member.paidAmount)}</dd></div>
        <div><dt className="app-muted text-sm">Aporte proporcional</dt><dd className="app-text mt-1 break-words font-bold">{member.expectedContribution === null ? 'No disponible' : currencyFormatter.format(member.expectedContribution)}</dd></div>
        <div><dt className="app-muted text-sm">Diferencia de aportes</dt><dd className={`mt-1 break-words font-bold ${differenceClass}`}>{member.difference === null ? 'No disponible' : formatSignedCurrency(member.difference)}</dd></div>
      </dl>
      {member.proportionalParticipation !== null && <p className="app-muted mt-4 border-t border-[var(--color-border)] pt-4 text-sm">Participación proporcional: <strong className="app-text">{percentageFormatter.format(member.proportionalParticipation)}</strong></p>}
      {variableComposition && member.proportionalParticipation === null && member.expectedContribution !== null && <p className="app-muted mt-4 border-t border-[var(--color-border)] pt-4 text-sm">La proporción varió durante el mes.</p>}
    </article>
  )
}

export default function SharedBalancePage() {
  const { spaceId, nombre, estado, membresiaId } = useOutletContext<SharedSpaceLayoutContext>()
  const currentMonth = getCurrentMonth()
  const [month, setMonth] = useState(currentMonth)
  const [balance, setBalance] = useState<SharedSpaceBalanceMonthly | null>(null)
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const activeMonthRef = useRef(month)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setLoadError('')
    setBalance(null)
    setAmount('')
    setActionError('')
    setActionMessage('')
    getSharedSpaceBalanceMonthly(spaceId, month)
      .then((result) => {
        if (!isMounted) return
        setBalance(result)
        const ownMember = result.members.find((member) => member.membershipId === membresiaId)
        setAmount(ownMember?.declaredIncome !== null && ownMember?.declaredIncome !== undefined ? String(ownMember.declaredIncome) : '')
      })
      .catch((error: unknown) => {
        if (isMounted) setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el Balance del espacio.')
      })
      .finally(() => { if (isMounted) setIsLoading(false) })
    return () => { isMounted = false }
  }, [month, retryCount, spaceId, membresiaId])

  function changeMonth(nextMonth: string) {
    activeMonthRef.current = nextMonth
    setMonth(nextMonth)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!balance || isSubmitting || estado === 'ARCHIVADO') return
    const submittedMonth = month
    const trimmedAmount = amount.trim()
    if (!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(trimmedAmount)) {
      setActionError('Ingresá un monto no negativo con hasta dos decimales. El campo vacío no equivale a $0.')
      return
    }
    setIsSubmitting(true)
    setActionError('')
    setActionMessage('')
    try {
      await setSharedDeclaredIncome(spaceId, submittedMonth, trimmedAmount)
      const refreshed = await getSharedSpaceBalanceMonthly(spaceId, submittedMonth)
      if (!isMountedRef.current || activeMonthRef.current !== submittedMonth) return
      setBalance(refreshed)
      const ownMember = refreshed.members.find((member) => member.membershipId === membresiaId)
      setAmount(ownMember?.declaredIncome !== null && ownMember?.declaredIncome !== undefined ? String(ownMember.declaredIncome) : '')
      setActionMessage('Declaración guardada correctamente.')
    } catch (error: unknown) {
      if (!isMountedRef.current || activeMonthRef.current !== submittedMonth) return
      setActionError(declarationError(error))
    } finally {
      if (isMountedRef.current) setIsSubmitting(false)
    }
  }

  const ownMember = balance?.members.find((member) => member.membershipId === membresiaId)
  const canDeclareForMonth = Boolean(ownMember?.relevantThisMonth)
  const pendingMembers = balance?.members.filter((member) => member.pendingDeclaration) ?? []
  const compensation = balance ? getCompensation(balance) : null
  const relevantDifferences = balance?.members.filter((member) => member.relevantThisMonth && member.difference !== null) ?? []
  const contributionsBalanced = Boolean(balance?.proportionalAvailable && balance.proportionalApplicable && balance.monthMemberCount === 2 && relevantDifferences.length === 2 && relevantDifferences.every((member) => member.difference === 0))
  const variableComposition = Boolean(balance?.proportionalAvailable && balance.proportionalApplicable && !balance.constantProportionalComposition)
  const jointBalance = balance?.jointBalance ?? null
  const balanceAmountClass = jointBalance === null || jointBalance === 0
    ? 'text-sky-800 dark:text-sky-200'
    : jointBalance > 0
      ? 'text-emerald-800 dark:text-emerald-200'
      : 'text-rose-800 dark:text-rose-200'

  return (
    <section aria-labelledby="shared-balance-title">
      <SectionHeader id="shared-balance-title" title="Balance" description={`Balance mensual de ${nombre} basado en las declaraciones realizadas dentro de este espacio.`} />

      <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        <button type="button" onClick={() => changeMonth(shiftMonth(month, -1))} className="app-button-secondary justify-self-start px-2 text-sm sm:px-3 sm:text-base" aria-label="Mostrar mes anterior"><span aria-hidden="true">←</span> <span className="hidden sm:inline">Mes anterior</span><span className="sm:hidden">Anterior</span></button>
        <h3 className="app-text min-w-0 text-center text-base font-semibold sm:text-2xl">{formatMonth(month)}</h3>
        <button type="button" onClick={() => changeMonth(month >= currentMonth ? month : shiftMonth(month, 1))} disabled={month >= currentMonth} className="app-button-secondary justify-self-end px-2 text-sm sm:px-3 sm:text-base" aria-label="Mostrar mes siguiente"><span className="hidden sm:inline">Mes siguiente</span><span className="sm:hidden">Siguiente</span> <span aria-hidden="true">→</span></button>
      </div>

      {isLoading && <div className="space-y-5" aria-live="polite" aria-busy="true"><p className="sr-only">Cargando Balance del espacio...</p><div className="app-panel min-h-64 animate-pulse bg-[var(--color-surface-muted)]" /><div className="grid gap-4 md:grid-cols-2"><div className="app-panel min-h-40 animate-pulse bg-[var(--color-surface-muted)]" /><div className="app-panel min-h-40 animate-pulse bg-[var(--color-surface-muted)]" /></div></div>}

      {!isLoading && loadError && <div className="app-panel mx-auto max-w-lg text-center"><p role="alert" className="app-error mb-4">{loadError}</p><button type="button" onClick={() => setRetryCount((count) => count + 1)} className="app-button-primary">Reintentar</button></div>}

      {!isLoading && !loadError && balance && <div className="space-y-6">
        <article className="relative overflow-hidden rounded-3xl border border-sky-200 bg-sky-50 p-6 shadow-sm dark:border-sky-900 dark:bg-sky-950/60 sm:p-8">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-sky-600 dark:bg-sky-400" aria-hidden="true" />
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="app-muted mb-3 text-sm font-bold uppercase tracking-[0.18em]">Balance del espacio</p>
            {balance.jointBalance === null ? <><h3 className="app-text text-2xl font-bold sm:text-3xl">Balance conjunto pendiente</h3><p className="app-muted mx-auto mt-3 max-w-2xl">{balance.historyComplete ? 'El Balance conjunto estará disponible cuando estén completas las declaraciones necesarias del mes.' : 'No existe suficiente historial para presentar un Balance proporcional definitivo de este período.'}</p></> : <p className={`min-w-0 max-w-full whitespace-nowrap font-bold leading-none tracking-tight [font-size:clamp(2rem,9vw,4.5rem)] ${balanceAmountClass}`}>{formatSignedCurrency(balance.jointBalance)}</p>}
            <dl className="mt-7 grid gap-4 sm:grid-cols-2"><div><dt className="app-muted text-sm">{balance.declarationsComplete ? 'Ingresos declarados' : 'Ingresos declarados hasta ahora'}</dt><dd className="app-text mt-1 break-words text-xl font-bold sm:text-2xl">{currencyFormatter.format(balance.declaredIncomeKnown)}</dd></div><div><dt className="app-muted text-sm">Gastos del espacio</dt><dd className="app-text mt-1 break-words text-xl font-bold sm:text-2xl">{currencyFormatter.format(balance.expensesTotal)}</dd></div></dl>
          </div>
        </article>

        <section className="app-panel" aria-labelledby="own-declaration-title">
          <div className="mb-4"><h3 id="own-declaration-title" className="app-text text-xl font-bold">Tu ingreso declarado</h3><p className="app-muted mt-1 text-sm">{formatMonth(month)}. Este valor se usa sólo para calcular el aporte proporcional de este espacio.</p></div>
          {estado === 'ARCHIVADO' ? <p className="app-muted rounded-2xl bg-[var(--color-surface-muted)] p-4">Este espacio está archivado. El Balance se muestra en modo de sólo lectura.</p> : !canDeclareForMonth ? <p className="app-muted rounded-2xl bg-[var(--color-surface-muted)] p-4">No tenés participación registrada en este espacio durante el mes seleccionado.</p> : <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="app-text block flex-1 text-sm font-semibold">Monto mensual en ARS<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required disabled={isSubmitting} className="app-control mt-1" /></label><button type="submit" disabled={isSubmitting} className="app-button-primary sm:min-w-52">{isSubmitting ? 'Guardando...' : ownMember?.hasDeclaration ? 'Actualizar declaración' : 'Guardar declaración'}</button></form>}
          {actionError && <p role="alert" className="app-error mt-3 text-sm">{actionError}</p>}
          {actionMessage && <p role="status" className="app-success mt-3 text-sm">{actionMessage}</p>}
        </section>

        {!balance.proportionalApplicable && balance.expensesTotal === 0 && <EmptyState title="No hubo gastos en este espacio durante este mes." description="Las declaraciones registradas siguen visibles para este período." />}

        {balance.proportionalApplicable && balance.proportionalReasons.length > 0 && <section className="rounded-3xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/50" aria-labelledby="proportional-status-title"><h3 id="proportional-status-title" className="font-bold text-amber-950 dark:text-amber-100">Aportes proporcionales todavía no disponibles</h3><ul className="mt-3 space-y-2 text-sm text-amber-950 dark:text-amber-100">{balance.proportionalReasons.map((reason) => <li key={reason}>{reasonMessage(reason)}</li>)}</ul>{balance.proportionalReasons.includes('MISSING_DECLARATIONS') && pendingMembers.length > 0 && <div className="mt-4 border-t border-amber-300 pt-3 text-sm dark:border-amber-800"><p className="font-semibold text-amber-950 dark:text-amber-100">Pendientes:</p><ul className="mt-1 text-amber-900 dark:text-amber-200">{pendingMembers.map((member) => <li key={member.membershipId}>{member.name}{member.currentStatus === 'FINALIZADA' ? ' · Ya no pertenece al espacio' : ''}</li>)}</ul></div>}</section>}

        {variableComposition && <p className="app-muted rounded-2xl bg-[var(--color-surface-muted)] p-4 text-sm">La composición del espacio cambió durante el mes, por eso la proporción se calculó gasto por gasto.</p>}

        {compensation && <section className="rounded-3xl border border-sky-200 bg-sky-50 p-6 text-center dark:border-sky-900 dark:bg-sky-950/60"><h3 className="app-text text-xl font-bold">Compensación para equilibrar aportes</h3><p className="app-text mt-3 text-lg font-semibold">{compensation.fromName} <span aria-hidden="true">→</span> {compensation.toName}</p><p className="mt-2 text-3xl font-bold text-sky-800 dark:text-sky-200">{currencyFormatter.format(compensation.amount)}</p><p className="app-muted mt-3 text-sm">Interpretación informativa de las diferencias del mes.</p></section>}
        {contributionsBalanced && <p className="app-success rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center font-semibold dark:border-emerald-900 dark:bg-emerald-950/50">Aportes equilibrados.</p>}

        <section aria-labelledby="member-contributions-title"><div className="mb-4"><h3 id="member-contributions-title" className="app-text text-2xl font-bold">Aportes del mes</h3><p className="app-muted mt-1">{balance.declarationCount} de {balance.monthMemberCount} integrantes del mes declararon sus ingresos.</p></div>{balance.members.length === 0 ? <div className="app-panel text-center"><p className="app-muted">No hay integrantes con información para mostrar en este período.</p></div> : <div className="grid gap-4 lg:grid-cols-2">{balance.members.map((member) => <MemberCard key={member.membershipId} member={member} variableComposition={variableComposition} />)}</div>}</section>
      </div>}
    </section>
  )
}
