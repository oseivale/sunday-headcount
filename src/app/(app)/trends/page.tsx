import Link from 'next/link'
import { Delta } from '@/components/Delta'
import { StackedChart } from '@/components/StackedChart'
import { MON, monthList, prevYm, shortDate, todayISO, ymLabel } from '@/lib/dates'
import { requireMember } from '@/lib/session'
import { SERVICE_COLUMNS, money, pct, r1, statsOf, toService } from '@/lib/stats'

const RANGES = [
  ['3', '3 months'],
  ['6', '6 months'],
  ['12', '12 months'],
  ['all', 'All'],
] as const

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { supabase, church } = await requireMember()
  const sp = await searchParams
  const range = RANGES.some(([k]) => k === sp.range) ? sp.range! : '6'
  const { data } = await supabase.from('services').select(SERVICE_COLUMNS).eq('church_id', church.id).eq('kind', 'sunday').order('service_date')
  const all = (data ?? []).map(toService)
  if (!all.length)
    return (
      <div className="stack">
        <h1>Trends</h1>
        <p className="panel">No Sundays recorded yet. Charts appear here after the first Sunday is saved.</p>
      </div>
    )

  const lastYm = todayISO(church.time_zone).slice(0, 7)
  let firstYm = all[0].service_date.slice(0, 7)
  if (range !== 'all') {
    let ym = lastYm
    for (let i = 1; i < +range; i++) ym = prevYm(ym)
    if (ym > firstYm) firstYm = ym
  }
  const months = monthList(firstYm, lastYm)
  const from = months[0] + '-01'
  const list = all.filter((s) => s.service_date >= from)
  let pFirst = months[0]
  for (let i = 0; i < months.length; i++) pFirst = prevYm(pFirst)
  const prevList = all.filter((s) => s.service_date >= pFirst + '-01' && s.service_date < from)
  const st = statsOf(list)
  const ps = prevList.length ? statsOf(prevList) : null
  const mStats = months.map((m) => ({ m, s: statsOf(list.filter((x) => x.service_date.startsWith(m))) }))
  let lastM = ''

  return (
    <div className="stack">
      <div>
        <h1>Trends</h1>
        <p className="lede">Attendance and offerings over time, from the Sunday entries.</p>
      </div>
      <div className="seg" role="group" aria-label="Time range">
        {RANGES.map(([k, l]) => (
          <Link key={k} href={`/trends?range=${k}`} aria-current={k === range}>{l}</Link>
        ))}
      </div>
      <div className="kpis">
        <div className="kpi"><div className="l">Average Sunday attendance</div><div className="v">{r1(st.total)}</div><div className="s"><Delta p={ps && pct(st.total, ps.total)} suffix="vs previous period" /></div></div>
        <div className="kpi"><div className="l">Average adults</div><div className="v">{r1(st.adults)}</div><div className="s"><Delta p={ps && pct(st.adults, ps.adults)} suffix="vs previous" /></div></div>
        <div className="kpi"><div className="l">Grand Total (CAD)</div><div className="v">{money(st.received)}</div><div className="s">{st.usdReceived > 0 ? <span className="flat">+ USD {money(st.usdReceived)}</span> : <Delta p={ps && st.n && ps.n ? pct(st.received / st.n, ps.received / ps.n) : null} suffix="per Sunday" />}</div></div>
        <div className="kpi"><div className="l">New members</div><div className="v">{st.newMembers}</div><div className="s flat">{st.n} Sundays recorded{list.length ? `, ${shortDate(list[0].service_date)} to ${shortDate(list[list.length - 1].service_date)}` : ''}</div></div>
      </div>
      <div className="panel chart">
        <h3>Weekly attendance</h3>
        <div className="legend">
          <span style={{ '--sw': 'var(--c1)' } as React.CSSProperties}>Men</span>
          <span style={{ '--sw': 'var(--c2)' } as React.CSSProperties}>Women</span>
          <span style={{ '--sw': 'var(--c3)' } as React.CSSProperties}>Children</span>
        </div>
        <StackedChart
          cats={list.map((s) => {
            const m = s.service_date.slice(0, 7)
            const label = m !== lastM ? (list.length > 30 ? MON[+m.slice(5) - 1][0] : MON[+m.slice(5) - 1]) : ''
            lastM = m
            return { label, title: shortDate(s.service_date) }
          })}
          series={[
            { name: 'Men', color: 'var(--c1)', values: list.map((s) => s.men) },
            { name: 'Women', color: 'var(--c2)', values: list.map((s) => s.women) },
            { name: 'Children', color: 'var(--c3)', values: list.map((s) => s.children) },
          ]}
        />
      </div>
      <div className="panel chart">
        <h3>Money received by month (CAD)</h3>
        <div className="legend">
          <span style={{ '--sw': 'var(--c1)' } as React.CSSProperties}>Offerings</span>
          <span style={{ '--sw': 'var(--c2)' } as React.CSSProperties}>Tithe</span>
          <span style={{ '--sw': 'var(--c3)' } as React.CSSProperties}>Pledge</span>
        </div>
        <StackedChart
          unit="$"
          totals={months.length <= 12}
          cats={mStats.map(({ m }, i) => ({ label: months.length > 12 && i % 2 ? '' : MON[+m.slice(5) - 1], title: ymLabel(m) }))}
          series={[
            { name: 'Offerings', color: 'var(--c1)', values: mStats.map((x) => x.s.offTotal) },
            { name: 'Tithe', color: 'var(--c2)', values: mStats.map((x) => x.s.tithe) },
            { name: 'Pledge', color: 'var(--c3)', values: mStats.map((x) => x.s.pledge) },
          ]}
        />
      </div>
      <div className="panel">
        <h3 style={{ marginBottom: 8 }}>Month by month</h3>
        <div className="tbl">
          <table>
            <thead><tr><th>Month</th><th>Sundays</th><th>Avg men</th><th>Avg women</th><th>Avg children</th><th>Avg adults</th><th>Avg total</th><th>New members</th><th>Offerings (CAD)</th><th>Tithe (CAD)</th><th>Pledge (CAD)</th><th>Grand Total CAD</th><th>Grand Total USD</th></tr></thead>
            <tbody>
              {mStats.slice().reverse().map(({ m, s }) => (
                <tr key={m}>
                  <td><Link href={`/monthly?month=${m}`}>{ymLabel(m)}</Link></td><td>{s.n}</td><td>{r1(s.men)}</td><td>{r1(s.women)}</td><td>{r1(s.children)}</td><td>{r1(s.adults)}</td><td><b>{r1(s.total)}</b></td><td>{s.newMembers}</td><td>{money(s.offTotal)}</td><td>{money(s.tithe)}</td><td>{money(s.pledge)}</td><td><b>{money(s.received)}</b></td><td>{s.usdReceived ? money(s.usdReceived) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
