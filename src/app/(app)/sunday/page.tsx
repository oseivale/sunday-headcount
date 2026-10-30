import { addDays, isISODate, lastSunday, sundaysBetween, todayISO } from '@/lib/dates'
import { canEnterEtransfer, canEnterSundays } from '@/lib/roles'
import { requireMember } from '@/lib/session'
import { SERVICE_COLUMNS, toService } from '@/lib/stats'
import type { Service } from '@/lib/types'
import { SundayForm } from './SundayForm'

export default async function SundayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { supabase, role, church } = await requireMember()
  const sp = await searchParams
  const today = todayISO(church.time_zone)
  const latest = lastSunday(today)
  const date = isISODate(sp.date) ? sp.date : latest
  const from = addDays(latest, -49)

  const [{ data: recentRows }, { data: current }] = await Promise.all([
    supabase.from('services').select(SERVICE_COLUMNS).eq('church_id', church.id).eq('kind', 'sunday').gte('service_date', from).lte('service_date', latest),
    supabase.from('services').select(SERVICE_COLUMNS).eq('church_id', church.id).eq('kind', 'sunday').eq('service_date', date).maybeSingle(),
  ])
  const byDate = new Map<string, Service>((recentRows ?? []).map((r): [string, Service] => [String(r.service_date), toService(r)]))
  const recent = sundaysBetween(from, latest)
    .reverse()
    .map((d) => ({ date: d, s: byDate.get(d) ?? null }))

  return (
    <SundayForm
      key={date}
      date={date}
      existing={current ? toService(current) : null}
      recent={recent}
      canEdit={canEnterSundays(role)}
      canEditEtransfer={canEnterEtransfer(role)}
    />
  )
}
