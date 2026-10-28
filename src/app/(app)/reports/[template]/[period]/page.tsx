import { notFound } from 'next/navigation'
import { parsePeriod, qMonths, quarterRange, todayISO } from '@/lib/dates'
import { carryOver } from '@/lib/reports/assembly-quarterly'
import { findReport } from '@/lib/reports/registry'
import { canReport, isAdmin } from '@/lib/roles'
import { requireMember } from '@/lib/session'
import { SERVICE_COLUMNS, toService } from '@/lib/stats'
import type { MonthlyRecords, ObligationKey, ObligationStatus } from '@/lib/types'
import { AssemblyReportFlow } from './AssemblyReportFlow'

export default async function ReportPage({ params }: { params: Promise<{ template: string; period: string }> }) {
  const { template, period } = await params
  const { supabase, role, church } = await requireMember(canReport)
  const tpl = findReport(template)
  if (!tpl || tpl.status !== 'ready' || !tpl.roles.includes(role)) notFound()
  const p = parsePeriod(period)
  if (!p) notFound()

  // Each template gets its own screen. Add new templates' screens here.
  if (tpl.key !== 'assembly-quarterly') notFound()

  const [a, b] = quarterRange(p.y, p.q)
  const [pa, pb] = quarterRange(p.y - 1, p.q)
  const months = qMonths(p.y, p.q)
  const [{ data: now }, { data: prev }, { data: recs }, { data: subs }] = await Promise.all([
    supabase.from('services').select(SERVICE_COLUMNS).eq('church_id', church.id).eq('kind', 'sunday').gte('service_date', a).lte('service_date', b).order('service_date'),
    supabase.from('services').select(SERVICE_COLUMNS).eq('church_id', church.id).eq('kind', 'sunday').gte('service_date', pa).lte('service_date', pb).order('service_date'),
    supabase.from('monthly_records').select('month, obligation, status').eq('church_id', church.id).in('month', months.map((m) => m + '-01')),
    supabase
      .from('report_submissions')
      .select('period_key, answers, signed_initials, signed_on, supervisor_name, updated_at')
      .eq('church_id', church.id)
      .eq('template_key', tpl.key)
      .lte('period_key', period)
      .order('period_key', { ascending: false })
      .limit(8),
  ])

  const monthly: MonthlyRecords = {}
  ;(recs ?? []).forEach((r) => {
    const ym = String(r.month).slice(0, 7)
    monthly[ym] = { ...(monthly[ym] ?? {}), [r.obligation as ObligationKey]: r.status as ObligationStatus }
  })
  const current = subs?.find((s) => s.period_key === period)
  const earlier = subs?.find((s) => s.period_key < period)
  const lastYear = subs?.find((s) => s.period_key === `${p.y - 1}-Q${p.q}`)

  return (
    <AssemblyReportFlow
      key={period}
      template={tpl.key}
      period={period}
      y={p.y}
      q={p.q}
      church={church}
      canEditChurch={isAdmin(role)}
      servicesNow={(now ?? []).map(toService)}
      servicesPrev={(prev ?? []).map(toService)}
      monthly={monthly}
      today={todayISO(church.time_zone)}
      initial={{
        answers: current?.answers ?? carryOver(earlier?.answers ?? null, lastYear?.answers ?? null),
        signedInitials: current?.signed_initials ?? '',
        signedOn: current?.signed_on ?? '',
        supervisorName: current?.supervisor_name ?? '',
        copiedFrom: current ? null : earlier?.period_key ?? null,
        savedAt: current?.updated_at ?? null,
      }}
    />
  )
}
