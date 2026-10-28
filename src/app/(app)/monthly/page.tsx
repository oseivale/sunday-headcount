import { monthEnd, monthList, prevYm, sundaysBetween, todayISO } from '@/lib/dates'
import { canReport } from '@/lib/roles'
import { requireMember } from '@/lib/session'
import { SERVICE_COLUMNS, toService } from '@/lib/stats'
import type { ObligationKey, ObligationStatus } from '@/lib/types'
import { MonthlyView } from './MonthlyView'

export default async function MonthlyPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { supabase, church } = await requireMember(canReport)
  const sp = await searchParams
  const today = todayISO(church.time_zone)
  const thisYm = today.slice(0, 7)
  const ym = sp.month && /^\d{4}-\d{2}$/.test(sp.month) && sp.month <= thisYm ? sp.month : prevYm(thisYm)
  const pm = prevYm(ym)

  const [{ data: rows }, { data: recs }, { data: first }] = await Promise.all([
    supabase.from('services').select(SERVICE_COLUMNS).eq('church_id', church.id).eq('kind', 'sunday').gte('service_date', pm + '-01').lte('service_date', monthEnd(ym)).order('service_date'),
    supabase.from('monthly_records').select('obligation, status').eq('church_id', church.id).eq('month', ym + '-01'),
    supabase.from('services').select('service_date').eq('church_id', church.id).order('service_date').limit(1).maybeSingle(),
  ])
  const all = (rows ?? []).map(toService)
  const obligations: Partial<Record<ObligationKey, ObligationStatus>> = {}
  ;(recs ?? []).forEach((r) => {
    obligations[r.obligation as ObligationKey] = r.status as ObligationStatus
  })
  const firstYm = first ? String(first.service_date).slice(0, 7) : thisYm
  const months = monthList(firstYm < ym ? firstYm : ym, thisYm).reverse()
  const end = monthEnd(ym) < today ? monthEnd(ym) : today
  const missing = sundaysBetween(ym + '-01', end).filter((d) => !all.some((s) => s.service_date === d))

  return (
    <MonthlyView
      key={ym}
      church={church}
      ym={ym}
      months={months}
      services={all.filter((s) => s.service_date.startsWith(ym))}
      prevServices={all.filter((s) => s.service_date.startsWith(pm))}
      obligations={obligations}
      missing={missing}
    />
  )
}
