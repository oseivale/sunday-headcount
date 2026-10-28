'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Delta } from '@/components/Delta'
import { useToast } from '@/components/Toast'
import { MON, prevYm, shortDate, ymLabel } from '@/lib/dates'
import { money, offTot, pct, r1, receivedTot, receivedTotUsd, statsOf, sum, tot } from '@/lib/stats'
import { OBLIGATIONS, STATUS_LABEL, type Church, type ObligationKey, type ObligationStatus, type Service } from '@/lib/types'
import { setObligation } from './actions'

type Props = {
  church: Church
  ym: string
  months: string[]
  services: Service[]
  prevServices: Service[]
  obligations: Partial<Record<ObligationKey, ObligationStatus>>
  missing: string[]
}

export function MonthlyView({ church, ym, months, services, prevServices, obligations, missing }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [pending, start] = useTransition()
  const [obl, setObl] = useState(obligations)
  const [includeOff, setIncludeOff] = useState(true)
  const st = statsOf(services)
  const ps = prevServices.length ? statsOf(prevServices) : null
  const pmLabel = MON[+prevYm(ym).slice(5) - 1]

  const change = (key: ObligationKey, value: ObligationStatus | '') =>
    start(async () => {
      const prev = obl[key]
      setObl((o) => ({ ...o, [key]: value || undefined }))
      const r = await setObligation(ym, key, value)
      if (!r.ok) {
        setObl((o) => ({ ...o, [key]: prev }))
        return toast.show(`Not saved: ${r.error}`)
      }
      toast.show(`${OBLIGATIONS.find((o) => o.key === key)!.label} for ${ymLabel(ym)}: ${value ? STATUS_LABEL[value] : 'Not recorded'}`)
    })

  const download = async () => {
    const { buildMonthlyPdf, monthlyFileName } = await import('@/lib/pdf/monthly')
    const doc = buildMonthlyPdf({ church, ym, services, obligations: obl, includeOfferings: includeOff })
    doc.save(monthlyFileName(church, ym))
  }

  return (
    <div className="stack">
      <div>
        <h1>Monthly report</h1>
        <p className="lede">The month&apos;s Sunday details and the fiscal records that pre-fill questions 27–31 and 34 of the quarterly form.</p>
      </div>
      <div className="toolbar">
        <label htmlFor="mSel" className="hint">Month</label>
        <select id="mSel" value={ym} onChange={(e) => router.push(`/monthly?month=${e.target.value}`)}>
          {months.map((m) => <option key={m} value={m}>{ymLabel(m)}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={includeOff} onChange={(e) => setIncludeOff(e.target.checked)} /> Include offerings in PDF</label>
        <span className="spacer" />
        <button className="btn primary" onClick={download}>Download monthly PDF</button>
      </div>
      {missing.length > 0 && (
        <p className="note"><span className="pill miss">Missing</span> No entry for {missing.map(shortDate).join(', ')}. <Link href={`/sunday?date=${missing[0]}`}>Enter it now</Link></p>
      )}
      {services.length ? (
        <>
          <div className="kpis">
            <div className="kpi"><div className="l">Average Sunday attendance</div><div className="v">{r1(st.total)}</div><div className="s"><Delta p={ps && pct(st.total, ps.total)} suffix={`vs ${pmLabel}`} /></div></div>
            <div className="kpi"><div className="l">Average adults</div><div className="v">{r1(st.adults)}</div><div className="s"><Delta p={ps && pct(st.adults, ps.adults)} suffix={`vs ${pmLabel}`} /></div></div>
            <div className="kpi"><div className="l">Grand Total (CAD)</div><div className="v">{money(st.received)}</div><div className="s">{st.usdReceived > 0 ? <span className="flat">+ USD {money(st.usdReceived)}</span> : <Delta p={ps && pct(st.received, ps.received)} suffix={`vs ${pmLabel}`} />}</div></div>
            <div className="kpi"><div className="l">New members</div><div className="v">{st.newMembers}</div><div className="s flat">Highest Sunday: {st.peak ? `${tot(st.peak)} on ${shortDate(st.peak.service_date)}` : '–'}</div></div>
          </div>
          <div className="panel">
            <h3 style={{ marginBottom: 8 }}>Sundays in {ymLabel(ym)}</h3>
            <div className="tbl">
              <table>
                <thead><tr><th>Date</th><th>Men</th><th>Women</th><th>Children</th><th>Total</th><th>New members</th><th>1st</th><th>2nd</th><th>Special</th><th>Offerings</th><th>Tithe</th><th>Pledge</th><th>Grand Total CAD</th><th>Grand Total USD</th></tr></thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.service_date}>
                      <td><Link href={`/sunday?date=${s.service_date}`}>{shortDate(s.service_date)}</Link></td><td>{s.men}</td><td>{s.women}</td><td>{s.children}</td><td><b>{tot(s)}</b></td><td>{s.new_members}</td><td>{money(s.offering_1)}</td><td>{money(s.offering_2)}</td><td title={s.offering_special_note}>{money(s.offering_special)}</td><td>{money(offTot(s))}</td><td>{money(s.tithe)}</td><td>{money(s.pledge)}</td><td><b>{money(receivedTot(s))}</b></td><td><b>{receivedTotUsd(s) ? money(receivedTotUsd(s)) : '–'}</b></td>
                    </tr>
                  ))}
                  <tr className="tot"><td>Total</td><td>{sum(services.map((s) => s.men))}</td><td>{sum(services.map((s) => s.women))}</td><td>{sum(services.map((s) => s.children))}</td><td>{sum(services.map(tot))}</td><td>{st.newMembers}</td><td>{money(st.off1)}</td><td>{money(st.off2)}</td><td>{money(st.special)}</td><td>{money(st.offTotal)}</td><td>{money(st.tithe)}</td><td>{money(st.pledge)}</td><td>{money(st.received)}</td><td>{money(st.usdReceived)}</td></tr>
                  <tr className="sub"><td>Average per Sunday</td><td>{r1(st.men)}</td><td>{r1(st.women)}</td><td>{r1(st.children)}</td><td>{r1(st.total)}</td><td></td><td>{money(st.off1 / st.n)}</td><td>{money(st.off2 / st.n)}</td><td>{money(st.special / st.n)}</td><td>{money(st.offTotal / st.n)}</td><td>{money(st.tithe / st.n)}</td><td>{money(st.pledge / st.n)}</td><td>{money(st.received / st.n)}</td><td>{money(st.usdReceived / st.n)}</td></tr>
                </tbody>
              </table>
            </div>
            {services.some((x) => x.offering_special > 0 || x.offering_special_usd > 0) && (
              <p className="hint" style={{ margin: '8px 0 0' }}>
                Special offerings: {services.filter((x) => x.offering_special > 0 || x.offering_special_usd > 0).map((x) => `${shortDate(x.service_date)}${x.offering_special_note ? ` (${x.offering_special_note})` : ''}`).join(' · ')}.
                {st.usdReceived > 0 && ' USD amounts are kept separate from CAD.'}
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="panel">No Sundays recorded for {ymLabel(ym)} yet.</p>
      )}
      <div className="panel">
        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
          <h2>Fiscal obligations for {ymLabel(ym)}</h2>
          <span className="chip ch-monthly">Monthly record</span>
        </div>
        <p className="hint" style={{ margin: '4px 0 6px' }}>Set once a month. The quarterly form is pre-filled from these, and you can still change them there.</p>
        {OBLIGATIONS.map((o) => (
          <div className="grow" key={o.key}>
            <label htmlFor={`ob-${o.key}`}>{o.label} <span className="hint">(Q{o.n})</span></label>
            <select id={`ob-${o.key}`} value={obl[o.key] ?? ''} disabled={pending} onChange={(e) => change(o.key, e.target.value as ObligationStatus | '')} style={{ width: 150 }}>
              <option value="">Not recorded</option>
              <option value="paid">Paid</option>
              <option value="not_paid">Not paid</option>
              {o.key !== 'mcf' && <option value="na">N/A</option>}
            </select>
          </div>
        ))}
      </div>
      {toast.node}
    </div>
  )
}
