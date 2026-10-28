'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useToast } from '@/components/Toast'
import { D, shortDate } from '@/lib/dates'
import { sundayMessage } from '@/lib/message'
import { adults, cad, money, offTot, offTotUsd, receivedTot, receivedTotUsd, tot, usd } from '@/lib/stats'
import type { Service } from '@/lib/types'
import { saveSunday } from './actions'

type Props = {
  date: string
  existing: Service | null
  recent: { date: string; s: Service | null }[]
  canEdit: boolean
}

type MoneyKey = 'offering_1' | 'offering_2' | 'offering_1_usd' | 'offering_2_usd' | 'offering_special' | 'offering_special_usd' | 'tithe' | 'tithe_usd' | 'pledge' | 'pledge_usd'
type CountKey = 'men' | 'women' | 'children' | 'new_members'

const GROUPS = [
  { k: 'men', label: 'Men' },
  { k: 'women', label: 'Women' },
  { k: 'children', label: 'Children' },
] as const

export function SundayForm({ date, existing, recent, canEdit }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [pending, start] = useTransition()
  const [s, setS] = useState<Service>(
    existing ?? {
      service_date: date, men: 0, women: 0, children: 0, new_members: 0,
      offering_1: 0, offering_2: 0, offering_1_usd: 0, offering_2_usd: 0,
      offering_special: 0, offering_special_usd: 0, offering_special_note: '', tithe: 0, tithe_usd: 0, pledge: 0, pledge_usd: 0,
    },
  )
  // Amount boxes keep the typed text; an empty box means 0.
  const startText = (v: number | undefined) => (existing && v ? String(v) : '')
  const [amounts, setAmounts] = useState<Record<MoneyKey, string>>({
    offering_1: startText(existing?.offering_1),
    offering_2: startText(existing?.offering_2),
    offering_1_usd: startText(existing?.offering_1_usd),
    offering_2_usd: startText(existing?.offering_2_usd),
    offering_special: startText(existing?.offering_special),
    offering_special_usd: startText(existing?.offering_special_usd),
    tithe: startText(existing?.tithe),
    tithe_usd: startText(existing?.tithe_usd),
    pledge: startText(existing?.pledge),
    pledge_usd: startText(existing?.pledge_usd),
  })
  const setNote = (text: string) => {
    setS((p) => ({ ...p, offering_special_note: text.slice(0, 80) }))
    setDirty(true)
  }
  const [dirty, setDirty] = useState(false)

  // Count boxes keep the typed text so a 0 can be cleared while typing; an empty box counts as 0.
  const [countText, setCountText] = useState<Record<CountKey, string>>({
    men: String(s.men),
    women: String(s.women),
    children: String(s.children),
    new_members: String(s.new_members),
  })
  const maxFor = (k: CountKey) => (k === 'new_members' ? 999 : 9999)
  /** From the − / + buttons: set the number and show it. */
  const setCount = (k: CountKey, v: number) => {
    const n = Math.max(0, Math.min(maxFor(k), Math.round(v) || 0))
    setS((p) => ({ ...p, [k]: n }))
    setCountText((t) => ({ ...t, [k]: String(n) }))
    setDirty(true)
  }
  /** From typing: keep what was typed (digits only) and use it as the number. */
  const typeCount = (k: CountKey, text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, k === 'new_members' ? 3 : 4)
    setCountText((t) => ({ ...t, [k]: digits }))
    setS((p) => ({ ...p, [k]: Math.min(maxFor(k), parseInt(digits, 10) || 0) }))
    setDirty(true)
  }
  const countInputProps = (k: CountKey, label: string) => ({
    id: `in-${k}`,
    type: 'text' as const,
    inputMode: 'numeric' as const,
    pattern: '[0-9]*',
    autoComplete: 'off',
    'aria-label': label,
    placeholder: '0',
    value: countText[k],
    disabled: !canEdit,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => typeCount(k, e.target.value),
    // Tapping into a box showing 0 clears it, so typing replaces the 0 instead of adding to it.
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      if (countText[k] === '0') setCountText((t) => ({ ...t, [k]: '' }))
      else e.target.select()
    },
    onBlur: () => {
      if (countText[k] === '') setCountText((t) => ({ ...t, [k]: '0' }))
    },
  })
  const setOffering = (k: MoneyKey, text: string) => {
    setAmounts((a) => ({ ...a, [k]: text }))
    const v = Math.max(0, Math.round(parseFloat(text) * 100) / 100 || 0)
    setS((p) => ({ ...p, [k]: v }))
    setDirty(true)
  }
  const moneyBox = (k: MoneyKey, currency: 'CAD' | 'USD', label: string) => (
    <div className="money">
      <span aria-hidden="true">{currency} $</span>
      <input id={`in-${k}`} type="number" inputMode="decimal" min={0} step="0.01" placeholder="0.00" aria-label={`${label}, ${currency}`}
        value={amounts[k]} disabled={!canEdit} onChange={(e) => setOffering(k, e.target.value)} />
    </div>
  )
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
                  <input {...countInputProps(k, label)} />
                  <button type="button" className="plus" aria-label={`Add one to ${label}`} disabled={!canEdit} onClick={() => setCount(k, s[k] + 1)}>+</button>
                </div>
              </div>
            ))}
            <div className="sumrow"><span>Total attendance</span><span className="num">{tot(s)}</span></div>
            <p className="hint" style={{ margin: '6px 0 0' }}>Adults (men + women): <b className="num">{adults(s)}</b>. The quarterly report uses this number.</p>
            <div className="grow newmembers">
              <div>
                <label htmlFor="in-new_members">New members</label>
                <div className="hint">Usually 0. People who joined today, already counted above.</div>
              </div>
              <div className="stepper">
                <button type="button" aria-label="Remove one new member" disabled={!canEdit} onClick={() => setCount('new_members', s.new_members - 1)}>−</button>
                <input {...countInputProps('new_members', 'New members')} />
                <button type="button" className="plus" aria-label="Add one new member" disabled={!canEdit} onClick={() => setCount('new_members', s.new_members + 1)}>+</button>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>Offerings</h2>
            <p className="hint" style={{ margin: '2px 0 4px' }}>Enter Canadian and US dollars separately. Leave USD empty if none was given.</p>
            <div className="offering">
              <label htmlFor="in-offering_1">1st Offering</label>
              <div className="moneypair">
                {moneyBox('offering_1', 'CAD', '1st Offering')}
                {moneyBox('offering_1_usd', 'USD', '1st Offering')}
              </div>
            </div>
            <div className="offering">
              <label htmlFor="in-offering_2">2nd Offering (Project)</label>
              <div className="moneypair">
                {moneyBox('offering_2', 'CAD', '2nd Offering (Project)')}
                {moneyBox('offering_2_usd', 'USD', '2nd Offering (Project)')}
              </div>
            </div>
            <div className="offering">
              <label htmlFor="in-special-note">Special offering</label>
              <input type="text" id="in-special-note" maxLength={80} placeholder="What is it for? e.g. Building fund" value={s.offering_special_note}
                disabled={!canEdit} onChange={(e) => setNote(e.target.value)} />
              <div className="moneypair">
                {moneyBox('offering_special', 'CAD', 'Special offering')}
                {moneyBox('offering_special_usd', 'USD', 'Special offering')}
              </div>
            </div>
            <div className="sumrow">
              <span>Total offering</span>
              <span className="totals">
                <span className="num">{cad(offTot(s))}</span>
                <span className={`num ${offTotUsd(s) > 0 ? '' : 'zero'}`}>{usd(offTotUsd(s))}</span>
              </span>
            </div>
            <p className="hint" style={{ margin: '4px 0 0' }}>1st + 2nd + special offering.</p>
          </div>

          <div className="panel">
            <h2>Tithe and pledge</h2>
            <div className="offering">
              <label htmlFor="in-tithe">Tithe</label>
              <div className="moneypair">
                {moneyBox('tithe', 'CAD', 'Tithe')}
                {moneyBox('tithe_usd', 'USD', 'Tithe')}
              </div>
            </div>
            <div className="offering">
              <label htmlFor="in-pledge">Pledge</label>
              <div className="moneypair">
                {moneyBox('pledge', 'CAD', 'Pledge')}
                {moneyBox('pledge_usd', 'USD', 'Pledge')}
              </div>
              <span className="hint">Money received towards pledges today.</span>
            </div>
            <div className="sumrow">
              <span>Grand Total</span>
              <span className="totals">
                <span className="num">{cad(receivedTot(s))}</span>
                <span className={`num ${receivedTotUsd(s) > 0 ? '' : 'zero'}`}>{usd(receivedTotUsd(s))}</span>
              </span>
            </div>
            <p className="hint" style={{ margin: '4px 0 0' }}>Offerings + tithe + pledge.</p>
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <div className="toolbar" style={{ justifyContent: 'space-between' }}>
              <h3>Message to send via text</h3>
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
                  {x ? (
                    <span className="num meta" style={{ textAlign: 'right' }}>
                      {money(receivedTot(x))}
                      {receivedTotUsd(x) > 0 && <><br />US{money(receivedTotUsd(x))}</>}
                    </span>
                  ) : <span className="pill miss">Missing</span>}
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
              {shortDate(date)} · <b>{tot(s)}</b> people · <b>{cad(receivedTot(s))}</b>
              {receivedTotUsd(s) > 0 && <> + <b>{usd(receivedTotUsd(s))}</b></>}
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
