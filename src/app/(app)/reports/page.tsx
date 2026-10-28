import Link from 'next/link'
import { ORDL, periodKey, quarterOf, todayISO } from '@/lib/dates'
import { REPORTS } from '@/lib/reports/registry'
import { canReport } from '@/lib/roles'
import { requireMember } from '@/lib/session'

export default async function ReportsPage() {
  const { supabase, role, church } = await requireMember(canReport)
  const { y, q } = quarterOf(todayISO(church.time_zone))
  const periods: { key: string; label: string }[] = []
  for (let i = 0, yy = y, qq = q; i < 4; i++) {
    periods.push({ key: periodKey(yy, qq), label: `${ORDL[qq - 1]} Quarter ${yy}` })
    qq--
    if (!qq) {
      qq = 4
      yy--
    }
  }
  const { data: subs } = await supabase
    .from('report_submissions')
    .select('template_key, period_key, signed_initials, updated_at')
    .eq('church_id', church.id)
  const status = (t: string, p: string) => subs?.find((s) => s.template_key === t && s.period_key === p)

  return (
    <div className="stack">
      <div>
        <h1>Reports</h1>
        <p className="lede">Reports the app prepares from the Sunday entries and monthly records. More report types for other groups can be added here later.</p>
      </div>
      {REPORTS.filter((r) => r.roles.includes(role)).map((r) => (
        <section className="panel stack" key={r.key} style={{ gap: 10 }}>
          <div className="toolbar" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2>{r.title}</h2>
              <p className="hint" style={{ margin: '2px 0 0' }}>{r.description} Prepared by: {r.group}.</p>
            </div>
            <span className="chip ch-assembly">{r.cadence === 'quarterly' ? 'Every quarter' : 'Every month'}</span>
          </div>
          {r.status === 'planned' ? (
            <p className="note">Coming in a later version.</p>
          ) : (
            <div className="recent">
              {periods.map((p, i) => {
                const s = status(r.key, p.key)
                return (
                  <Link key={p.key} href={`/reports/${r.key}/${p.key}`}>
                    <span><b>{p.label}</b>{i === 0 && <span className="meta"> · in progress</span>}</span>
                    <span />
                    {s?.signed_initials ? <span className="pill ok">Signed</span> : s ? <span className="pill warn">Draft saved</span> : <span className="pill quiet">Not started</span>}
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
