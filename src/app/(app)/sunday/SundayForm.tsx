'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useToast } from '@/components/Toast'
import { D, shortDate } from '@/lib/dates'
import { sundayMessage } from '@/lib/message'
import { adults, cad, money, offTot, tot } from '@/lib/stats'
import type { Service } from '@/lib/types'
import { saveSunday } from './actions'

type Props = {
  date: string
  existing: Service | null
  recent: { date: string; s: Service | null }[]
  canEdit: boolean
}

const GROUPS = [
  { k: 'men', label: 'Men' },
  { k: 'women', label: 'Women' },
  { k: 'children', label: 'Children' },
] as const

export function SundayForm({ date, existing, recent, canEdit }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [pending, start] = useTransition()
  const [s, setS] = useState<Service>(existing ?? { service_date: date, men: 0, women: 0, children: 0, offering_1: 0, offering_2: 0 })
  const [o1, setO1] = useState(existing ? String(existing.offering_1) : '')
  const [o2, setO2] = useState(existing ? String(existing.offering_2) : '')
  const [dirty, setDirty] = useState(false)

  const setCount = (k: 'men' | 'women' | 'children', v: number) => {
    setS((p) => ({ ...p, [k]: Math.max(0, Math.min(9999, Math.round(v) || 0)) }))
    setDirty(true)
  }
  const setOffering = (k: 'offering_1' | 'offering_2', text: string) => {
    ;(k === 'offering_1' ? setO1 : setO2)(text)
    const v = Math.max(0, Math.round(parseFloat(text) * 100) / 100 || 0)
    setS((p) => ({ ...p, [k]: v }))
    setDirty(true)
  }
  const save = () =>
    start(async () => {
      const r = await saveSunday(s)
      if (!r.ok) return toast.show(r.error)
      setDirty(false)
      toast.show(r.message)
      router.refresh()
    })
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sundayMessage(s))
      toast.show('Message copied')
    } catch {
      toast.show('Could not copy. Select the text and copy it instead.')
    }
  }
  const saved = !!existing && !dirty

  return (
    <div className="stack">
      <div>
        <h1>Sunday entry</h1>
        <p className="lede">Enter the counts and offerings once per Sunday. Totals are calculated, and the message is written for you.</p>
      </div>
      <div className="grid2">
        <div className="stack">
          <div className="panel">
            <div className="toolbar" style={{ justifyContent: 'space-between' }}>
              <label htmlFor="sd"><h3>Date</h3></label>
              {existing ? <span className="pill ok">Saved</span> : <span className="pill warn">Not entered yet</span>}
            </div>
            <input type="date" id="sd" className="datefield" value={date} onChange={(e) => e.target.value && router.push(`/sunday?date=${e.target.value}`)} />
            {D(date).getUTCDay() !== 0 && <p className="hint">This date is not a Sunday. That is fine for a special service.</p>}
          </div>

          <div className="panel">
            <h2>Attendance</h2>
            {GROUPS.map(({ k, label }) => (
              <div className="grow" key={k}>
                <label htmlFor={`in-${k}`}>{label}</label>
                <div className="stepper">
                  <button type="button" aria-label={`Remove one from ${label}`} disabled={!canEdit} onClick={() => setCount(k, s[k] - 1)}>−</button>
                  <input id={`in-${k}`} type="number" inputMode="numeric" min={0} value={s[k]} disabled={!canEdit} onChange={(e) => setCount(k, parseInt(e.target.value, 10))} />
                  <button type="button" className="plus" aria-label={`Add one to ${label}`} disabled={!canEdit} onClick={() => setCount(k, s[k] + 1)}>+</button>
                </div>
              </div>
            ))}
            <div className="sumrow"><span>Total attendance</span><span className="num">{tot(s)}</span></div>
            <p className="hint" style={{ margin: '6px 0 0' }}>Adults (men + women): <b className="num">{adults(s)}</b>. The quarterly report uses this number.</p>
          </div>

          <div className="panel">
            <h2>Offerings</h2>
            <div className="grow">
              <label htmlFor="in-o1">1st Offering</label>
              <div className="money"><span aria-hidden="true">CAD $</span><input id="in-o1" type="number" inputMode="decimal" min={0} step="0.01" placeholder="0.00" value={o1} disabled={!canEdit} onChange={(e) => setOffering('offering_1', e.target.value)} /></div>
            </div>
            <div className="grow">
              <label htmlFor="in-o2">2nd Offering (Project)</label>
              <div className="money"><span aria-hidden="true">CAD $</span><input id="in-o2" type="number" inputMode="decimal" min={0} step="0.01" placeholder="0.00" value={o2} disabled={!canEdit} onChange={(e) => setOffering('offering_2', e.target.value)} /></div>
            </div>
            <div className="sumrow"><span>Total offering</span><span className="num">{cad(offTot(s))}</span></div>
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <div className="toolbar" style={{ justifyContent: 'space-between' }}>
              <h3>Message for the group</h3>
              <button type="button" className="btn small" onClick={copy}>Copy text</button>
            </div>
            <div className="msg">{sundayMessage(s)}</div>
            <p className="hint" style={{ margin: 0 }}>Saving also emails this message to the people listed in Settings.</p>
          </div>
          <div className="panel">
            <h3 style={{ marginBottom: 6 }}>Recent Sundays</h3>
            <div className="recent">
              {recent.map(({ date: d, s: x }) => (
                <Link key={d} href={`/sunday?date=${d}`} aria-current={d === date}>
                  <span>
                    <b>{shortDate(d)}</b>
                    <br />
                    <span className="meta">{x ? `${x.men} men · ${x.women} women · ${x.children} children` : 'Nothing recorded'}</span>
                  </span>
                  {x ? <span className="num">{tot(x)}</span> : <span />}
                  {x ? <span className="num meta">{money(offTot(x))}</span> : <span className="pill miss">Missing</span>}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="bar">
          <div className="wrap">
            <div className="tot">
              {shortDate(date)} · <b>{tot(s)}</b> people · <b>{cad(offTot(s))}</b>
            </div>
            <button type="button" className="btn primary" disabled={pending || saved} onClick={save}>
              {pending ? 'Saving…' : saved ? 'Saved' : 'Save Sunday'}
            </button>
          </div>
        </div>
      )}
      {toast.node}
    </div>
  )
}
