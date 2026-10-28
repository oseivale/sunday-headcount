'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/components/Toast'
import { MONTHS, ORDL, qMonths, quarterRange, shortDate, sundaysBetween, usDate, ymLabel } from '@/lib/dates'
import {
  ABC,
  BANDS,
  SOURCE,
  SUP,
  adultAverage,
  answerFor,
  assemblyForm,
  category,
  fiscalFromMonthly,
  isMissing,
  type FormContext,
} from '@/lib/reports/assembly-quarterly'
import { isQuestion, type Answers, type Question } from '@/lib/reports/types'
import { money, r1, statsOf } from '@/lib/stats'
import { OBLIGATIONS, STATUS_LABEL, type Church, type MonthlyRecords, type ObligationKey, type Service } from '@/lib/types'
import { saveReport, updateAssemblyDetail } from './actions'

type Props = {
  template: string
  period: string
  y: number
  q: number
  church: Church
  canEditChurch: boolean
  servicesNow: Service[]
  servicesPrev: Service[]
  monthly: MonthlyRecords
  today: string
  initial: {
    answers: Answers
    signedInitials: string
    signedOn: string
    supervisorName: string
    copiedFrom: string | null
    savedAt: string | null
  }
}

const PERSON = (it: Question) => it.src === 'quarter' || it.src === 'monthly'
const has = (v: unknown) => v !== '' && v !== null && v !== undefined
const CHIP: Record<Question['src'], string> = {
  weekly: 'ch-weekly',
  monthly: 'ch-monthly',
  quarter: 'ch-quarter',
  assembly: 'ch-assembly',
  derived: 'ch-derived',
  outside: 'ch-assembly',
}

export function AssemblyReportFlow(props: Props) {
  const { template, period, y, q, canEditChurch, servicesNow, servicesPrev, monthly, today, initial } = props
  const router = useRouter()
  const toast = useToast()
  const showToast = toast.show
  const [church, setChurch] = useState(props.church)
  const [answers, setAnswers] = useState<Answers>(initial.answers)
  const [signedInitials, setSignedInitials] = useState(initial.signedInitials)
  const [signedOn, setSignedOn] = useState(initial.signedOn)
  const [supervisorName, setSupervisorName] = useState(initial.supervisorName)
  const [step, setStep] = useState(1)
  const [editing, setEditing] = useState<string | null>(null)
  const [appendix, setAppendix] = useState(true)
  const [includeOff, setIncludeOff] = useState(true)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved' | 'error'>(initial.savedAt ? 'saved' : 'unsaved')
  const firstRender = useRef(true)
  const stepsRef = useRef<HTMLOListElement>(null)
  // Tracks edits not yet confirmed saved, for the leave warning and the save-on-leave below.
  const version = useRef(0)
  const dirty = useRef(false)
  const latest = useRef({ answers, signedInitials, signedOn, supervisorName })
  const stepKey = `sh-report-step:${template}:${period}`

  const ctx: FormContext = useMemo(() => ({ y, q, church, answers, servicesNow, servicesPrev, monthly }), [y, q, church, answers, servicesNow, servicesPrev, monthly])
  const items = useMemo(() => assemblyForm(y, q), [y, q])
  const questions = items.filter(isQuestion)
  const missing = questions.filter((i) => isMissing(i, ctx))
  const personQs = questions.filter(PERSON)
  const personMissing = personQs.filter((i) => isMissing(i, ctx))

  const [qa0, qb] = quarterRange(y, q)
  const expected = sundaysBetween(qa0, qb < today ? qb : today)
  const recorded = expected.filter((d) => servicesNow.some((s) => s.service_date === d))
  const months = qMonths(y, q)
  const monthsDone = months.filter((m) => OBLIGATIONS.every((o) => monthly[m]?.[o.key]))
  const inProgress = qb >= today
  const c9 = adultAverage(servicesPrev)
  const c10 = adultAverage(servicesNow)

  // Autosave a moment after any change, so nothing typed is lost.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const v = ++version.current
    dirty.current = true
    latest.current = { answers, signedInitials, signedOn, supervisorName }
    setSaveState('unsaved')
    const t = setTimeout(async () => {
      setSaveState('saving')
      const r = await saveReport(template, period, { answers, signedInitials, signedOn, supervisorName })
      if (r.ok && version.current === v) dirty.current = false
      setSaveState(r.ok ? (version.current === v ? 'saved' : 'unsaved') : 'error')
      if (!r.ok) showToast(`Not saved: ${r.error}`)
    }, 1200)
    return () => clearTimeout(t)
  }, [answers, signedInitials, signedOn, supervisorName, template, period, showToast])

  // Closing or reloading the tab with unsaved changes: the browser asks before leaving.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!dirty.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  // Moving to another screen in the app: save straight away instead of waiting.
  useEffect(() => {
    return () => {
      if (dirty.current) void saveReport(template, period, latest.current)
    }
  }, [template, period])

  // Reopen on the step the person was last on (per device).
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(stepKey))
      if (saved >= 1 && saved <= 3) setStep(saved)
    } catch {
      // Storage blocked: start at step 1.
    }
  }, [stepKey])

  const setAns = (k: string, v: unknown) => setAnswers((p) => ({ ...p, [k]: v }))
  const toggleIn = (k: string, v: string) =>
    setAnswers((p) => {
      const arr: string[] = Array.isArray(p[k]) ? [...p[k]] : []
      const i = arr.indexOf(v)
      if (i >= 0) arr.splice(i, 1)
      else arr.push(v)
      return { ...p, [k]: arr }
    })
  const toggleFiscal = (k: ObligationKey, v: string) =>
    setAnswers((p) => {
      const cur: string[] = Array.isArray(p.fiscal?.[k]) ? [...p.fiscal[k]] : fiscalFromMonthly(ctx, k).ticks.slice()
      const i = cur.indexOf(v)
      if (i >= 0) cur.splice(i, 1)
      else cur.push(v)
      return { ...p, fiscal: { ...(p.fiscal ?? {}), [k]: cur } }
    })
  const resetFiscal = (k: ObligationKey) =>
    setAnswers((p) => {
      const f = { ...(p.fiscal ?? {}) }
      delete f[k]
      return { ...p, fiscal: f }
    })
  const go = (s: number, focusId?: string) => {
    setEditing(null)
    setStep(s)
    try {
      localStorage.setItem(stepKey, String(s))
    } catch {
      // Storage blocked: the step just isn't remembered.
    }
    requestAnimationFrame(() => {
      const smooth = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      if (focusId) {
        document.getElementById(focusId)?.scrollIntoView({ block: 'center', behavior: smooth })
        return
      }
      // Keep the page where it is when the step tabs are already on screen;
      // otherwise bring the tabs (not the top of the page) into view.
      const bar = stepsRef.current
      if (!bar) return
      const r = bar.getBoundingClientRect()
      const header = document.querySelector('header.top')?.getBoundingClientRect().bottom ?? 0
      if (r.top < header || r.bottom > window.innerHeight) bar.scrollIntoView({ block: 'start', behavior: smooth })
    })
  }
  const saveChurchField = async (field: string, value: string) => {
    setChurch((c) => ({ ...c, [field]: value }))
    const r = await updateAssemblyDetail(field, value)
    if (!r.ok) toast.show(`Not saved: ${r.error}`)
    else router.refresh()
  }
  const download = async () => {
    const r = await saveReport(template, period, { answers, signedInitials, signedOn, supervisorName })
    if (!r.ok) toast.show(`Saved copy failed: ${r.error}. The PDF still downloads.`)
    const { buildAssemblyPdf, assemblyFileName } = await import('@/lib/pdf/assembly')
    const doc = buildAssemblyPdf({ ctx, signedInitials, signedOn, supervisorName, appendix, includeOfferings: includeOff })
    doc.save(assemblyFileName(church.name, y, q))
  }

  // ---------- pieces ----------
  const pair = (p: number, n: number, label: string, cls: string, note: string, edit: React.ReactNode) => {
    const qp = questions.find((i) => i.n === p)!
    const qn = questions.find((i) => i.n === n)!
    const vp = answerFor(qp, ctx)
    const vn = answerFor(qn, ctx)
    const ok = has(vp) && has(vn)
    const ch = ok && +vp ? Math.round(((+vn - +vp) / +vp) * 100) : null
    return (
      <div className="tile">
        <div className="tl"><span className="num">Q{p} → Q{n}</span> {label}</div>
        <div className="tv">
          {has(vp) ? String(vp) : <span className="nv">—</span>}
          <span className="arr">→</span>
          {has(vn) ? String(vn) : <span className="nv">—</span>}
          {ch !== null && <span className={`delta ${ch > 0 ? 'up' : ch < 0 ? 'down' : 'flat'}`}> {ch > 0 ? '+' : ''}{ch}%</span>}
        </div>
        <div className="ts"><span className={`dot ${cls}`} />{ok ? note : <span style={{ color: 'var(--bad)' }}>Q{has(vp) ? n : p} not answered yet</span>}</div>
        {edit}
      </div>
    )
  }
  const edited = (k: string, c: { n: number; v: number | null }) => has(answers[k + 'Override']) && !(c.n && +answers[k + 'Override'] === c.v)
  const endM = MONTHS[q * 3 - 1].slice(0, 3)
  const cat = category(answers.membershipNow)
  const qs = statsOf(servicesNow)

  const numbersPanel = (
    <section className="panel numbers" aria-labelledby="rn-h">
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <h2 id="rn-h">Report numbers</h2>
        <div className="toolbar">
          <span className={`pill ${recorded.length === expected.length ? 'ok' : 'miss'}`}>{recorded.length} of {expected.length} Sundays</span>
          <span className={`pill ${monthsDone.length === 3 ? 'ok' : 'miss'}`}>{monthsDone.length} of 3 fiscal months</span>
        </div>
      </div>
      <div className="tiles">
        <div className="tile">
          <div className="tl"><span className="num">Q6</span> Membership category</div>
          <div className="tv">{cat || <span className="nv">—</span>}</div>
          <div className="ts"><span className="dot derived" />{cat ? 'Calculated from Q8' : <span style={{ color: 'var(--bad)' }}>Needs Q8</span>}</div>
          <button className="link tedit" onClick={() => go(2, 'q8')}>Edit Q8</button>
        </div>
        {pair(7, 8, `Adult members, ${endM} ${y - 1} → ${y}`, 'quarter', 'Answered in step 2', <button className="link tedit" onClick={() => go(2, 'q7')}>Edit</button>)}
        {pair(9, 10, `Adult avg attendance, ${endM} ${y - 1} → ${y}`, 'weekly', edited('adultAvgPrev', c9) || edited('adultAvgNow', c10) ? 'Edited' : `Calculated by the app from ${c9.n} and ${c10.n} Sundays`,
          <button className="link tedit" onClick={() => { go(1); setEditing('adultAvgNow') }}>Edit</button>)}
        {pair(11, 12, `Volunteers, ${endM} ${y - 1} → ${y}`, 'quarter', 'Answered in step 2', <button className="link tedit" onClick={() => go(2, 'q11')}>Edit</button>)}
      </div>
      <div className="tbl">
        <table>
          <thead><tr><th>Month</th><th>Sundays</th><th>Avg men</th><th>Avg women</th><th>Avg children</th><th>Avg adults</th><th>Avg total</th><th>New members</th><th>Grand Total CAD</th><th>Grand Total USD</th></tr></thead>
          <tbody>
            {months.map((m) => {
              const s = statsOf(servicesNow.filter((x) => x.service_date.startsWith(m)))
              return <tr key={m}><td>{ymLabel(m)}</td><td>{s.n}</td><td>{r1(s.men)}</td><td>{r1(s.women)}</td><td>{r1(s.children)}</td><td>{r1(s.adults)}</td><td><b>{r1(s.total)}</b></td><td>{s.newMembers}</td><td>{money(s.received)}</td><td>{s.usdReceived ? money(s.usdReceived) : '–'}</td></tr>
            })}
            <tr className="tot"><td>Quarter</td><td>{qs.n}</td><td>{r1(qs.men)}</td><td>{r1(qs.women)}</td><td>{r1(qs.children)}</td><td>{r1(qs.adults)}</td><td>{r1(qs.total)}</td><td>{qs.newMembers}</td><td>{money(qs.received)}</td><td>{qs.usdReceived ? money(qs.usdReceived) : '–'}</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  )

  const avgRow = (n: number, label: string, k: string, c: { n: number; v: number | null }) => {
    const ov = answers[k + 'Override']
    const isEdited = edited(k, c)
    const open = editing === k || (!c.n && !isEdited)
    return (
      <div className="grow fill" key={k}>
        <div style={{ minWidth: 0 }}>
          <b>Q{n}. {label}</b>
          <div className="hint">
            {isEdited ? (
              <>Edited. The app calculated <b className="num">{c.v ?? 'nothing'}</b>. <button className="link" onClick={() => setAns(k + 'Override', null)}>Use app value</button></>
            ) : c.n ? `Average of men + women over ${c.n} Sundays` : 'No Sunday entries for this period, so type the number.'}
          </div>
        </div>
        <div className="fv">
          {open ? (
            <>
              <input type="number" min={0} inputMode="numeric" id={`qa-${k}`} value={isEdited ? ov : c.v ?? ''} style={{ width: 90, textAlign: 'right' }}
                onChange={(e) => setAns(k + 'Override', e.target.value === '' ? null : +e.target.value)} />
              {c.n > 0 && <button className="btn small" onClick={() => setEditing(null)}>Done</button>}
            </>
          ) : (
            <>
              <span className="v num">{isEdited ? ov : c.v}</span>
              {isEdited && <span className="pill warn">Edited</span>}
              <button className="link" onClick={() => setEditing(k)}>Edit</button>
            </>
          )}
        </div>
      </div>
    )
  }

  const control = (it: Question) => {
    const v = answerFor(it, ctx)
    if (it.kind === 'text') return <input type="text" id={`qa-${it.key}`} value={String(v ?? '')} onChange={(e) => setAns(it.key, e.target.value)} />
    if (it.kind === 'number')
      return (
        <>
          <input type="number" min={0} inputMode="numeric" id={`qa-${it.key}`} value={has(v) ? String(v) : ''} style={{ maxWidth: 160 }} onChange={(e) => setAns(it.key, e.target.value === '' ? '' : +e.target.value)} />
          {it.key === 'membershipNow' && (
            <span className="hint">New members recorded on Sundays this quarter: <b className="num">{qs.newMembers}</b>. Add them to last quarter&apos;s figure if that&apos;s how you count membership.</span>
          )}
        </>
      )
    if (it.kind === 'choice')
      return (
        <div className="opts">
          {it.opts!.map((o) => <button key={o} aria-pressed={o === v} onClick={() => setAns(it.key, v === o ? '' : o)}>{o}</button>)}
        </div>
      )
    if (it.kind === 'multi')
      return (
        <div className="opts">
          {it.opts!.map((o) => <button key={o} aria-pressed={Array.isArray(v) && v.includes(o)} onClick={() => toggleIn(it.key, o)}>{o}</button>)}
        </div>
      )
    if (it.kind === 'bands') {
      const mods: string[] = answers.abcModules ?? []
      const bands: Record<string, string> = answers.abcBands ?? {}
      return (
        <>
          {ABC.map((m) => (
            <div className="bandrow" key={m}>
              <span>{m}</span>
              <div className="opts">
                {BANDS.map((b) => (
                  <button key={b} aria-pressed={bands[m] === b} disabled={!mods.includes(m)}
                    onClick={() => setAns('abcBands', { ...bands, [m]: bands[m] === b ? '' : b })}>{b}</button>
                ))}
              </div>
            </div>
          ))}
          <span className="hint">Pick a range for each module you run. The form has no 16–20 option.</span>
        </>
      )
    }
    if (it.kind === 'fiscal') {
      const k = it.key as ObligationKey
      const f = fiscalFromMonthly(ctx, k)
      const cur = v as string[]
      const overridden = Array.isArray(answers.fiscal?.[k])
      return (
        <>
          <div className="opts">
            {it.opts!.map((o) => <button key={o} aria-pressed={cur.includes(o)} onClick={() => toggleFiscal(k, o)}>{o}</button>)}
          </div>
          <span className="hint">
            Monthly records: {f.labels.map((l, i) => `${l} ${f.st[i] ? STATUS_LABEL[f.st[i] as keyof typeof STATUS_LABEL] : 'not recorded'}`).join(' · ')}.{' '}
            {overridden ? <>You changed the pre-filled answer. <button className="link" onClick={() => resetFiscal(k)}>Use monthly records</button></> : 'Pre-filled from these.'}{' '}
            <Link href={`/monthly?month=${f.ms.find((m, i) => !f.st[i]) ?? f.ms[2]}`}>Edit monthly records</Link>
          </span>
        </>
      )
    }
    return null
  }

  const review = (it: Question) => {
    const v = answerFor(it, ctx)
    if (it.kind === 'note') return <p className="hint">Upload the signed PDF to the overseer&apos;s portal after your supervisor approves it.</p>
    if (it.kind === 'text' || it.kind === 'number') return <div className="rbox">{has(v) ? String(v) : ' '}</div>
    if (it.kind === 'bands') {
      const mods: string[] = answers.abcModules ?? []
      const bands: Record<string, string> = answers.abcBands ?? {}
      return (
        <>
          {ABC.map((m) => (
            <div className="bandrow" key={m} style={{ paddingLeft: 24 }}>
              <span>{m}</span>
              <div className="ropts">{BANDS.map((b) => <span key={b} className={mods.includes(m) && bands[m] === b ? 'on' : ''}>[ ] {b}</span>)}</div>
            </div>
          ))}
        </>
      )
    }
    const sel = Array.isArray(v) ? v : [String(v)]
    return <div className="rlist">{it.opts!.map((o) => <span key={o} className={sel.includes(o) ? 'on' : ''}><i />{o}</span>)}</div>
  }

  const saveLabel = saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'All changes saved' : saveState === 'error' ? 'Not saved – keep this page open and try again' : 'Unsaved changes'

  return (
    <div className="stack">
      <div>
        <h1>Quarterly Assembly Report</h1>
        <p className="lede">The app fills in the numbers it already has. You answer the rest, check the form, then download the PDF to submit.</p>
      </div>
      <div className="toolbar">
        <Link href="/reports" className="link">All reports</Link>
        <span className="hint">· {ORDL[q - 1]} Quarter {y}</span>
        {inProgress && <span className="pill warn">In progress</span>}
        <span className="spacer" />
        <span className={`pill ${saveState === 'saved' ? 'ok' : saveState === 'error' ? 'miss' : 'quiet'}`}>{saveLabel}</span>
      </div>

      {numbersPanel}

      <ol className="steps" ref={stepsRef}>
        {['Check the data', 'Answer the questions', 'Review and download'].map((l, i) => (
          <li key={l} aria-current={i + 1 === step ? 'step' : undefined} className={i + 1 < step ? 'done' : ''}>
            <button onClick={() => go(i + 1)}><b>{i + 1}</b>{l}</button>
          </li>
        ))}
      </ol>

      {step === 1 && (
        <>
          <div className="panel">
            <div className="toolbar" style={{ justifyContent: 'space-between' }}>
              <h2>Check the attendance averages</h2>
              <span className="chip ch-weekly">{SOURCE.weekly}</span>
            </div>
            <p className="hint" style={{ margin: '2px 0 4px' }}>The app fills these in from the Sunday entries. Use Edit only if a number should be different.</p>
            {avgRow(9, `Adult average attendance, ${MONTHS[q * 3 - 1]} ${y - 1}`, 'adultAvgPrev', c9)}
            {avgRow(10, `Adult average attendance, ${MONTHS[q * 3 - 1]} ${y}`, 'adultAvgNow', c10)}
            {recorded.length < expected.length && (
              <div className="grow">
                <div><b>Missing Sundays</b><div className="hint">{expected.filter((d) => !recorded.includes(d)).map(shortDate).join(', ')}. Q9 and Q10 only average the Sundays recorded.</div></div>
                <Link className="btn small" href={`/sunday?date=${expected.find((d) => !recorded.includes(d))}`}>Enter now</Link>
              </div>
            )}
            {monthsDone.length < 3 && (
              <div className="grow">
                <div><b>Monthly fiscal records incomplete</b><div className="hint">Q27–31 and Q34 are pre-filled from these. You can still answer them in step 2.</div></div>
                <Link className="btn small" href={`/monthly?month=${months.find((m) => !monthsDone.includes(m))}`}>Open monthly</Link>
              </div>
            )}
          </div>
          <div className="panel">
            <div className="toolbar" style={{ justifyContent: 'space-between' }}>
              <h2>Assembly details</h2>
              <span className="chip ch-assembly">Saved for every report</span>
            </div>
            {questions.filter((i) => i.src === 'assembly').map((i) => {
              const id = 'as-' + i.key
              const value = String((church as Record<string, unknown>)[i.key] ?? '')
              return (
                <div className="grow fill" key={i.key}>
                  <label htmlFor={id}><b>Q{i.n}.</b> {i.t}</label>
                  <div className="fv">
                    {editing === id ? (
                      <form onSubmit={(e) => { e.preventDefault(); const v = (e.currentTarget.elements.namedItem('v') as HTMLInputElement).value; setEditing(null); saveChurchField(i.key, v) }} style={{ display: 'flex', gap: 8 }}>
                        <input type="text" id={id} name="v" defaultValue={value} autoFocus style={{ width: 'min(240px, 50vw)' }} />
                        <button className="btn small">Done</button>
                      </form>
                    ) : (
                      <>
                        <span className="v">{value || <span className="hint">Not set</span>}</span>
                        {canEditChurch && <button className="link" onClick={() => setEditing(id)}>Edit</button>}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
            {!canEditChurch && <p className="hint" style={{ margin: '8px 0 0' }}>Only an admin can change these.</p>}
          </div>
          {initial.copiedFrom && (
            <p className="note">Answers for the next step are carried over from the {ORDL[+initial.copiedFrom.slice(6) - 1]} Quarter {initial.copiedFrom.slice(0, 4)} report, so you only change what&apos;s different.</p>
          )}
          <div className="toolbar"><span className="spacer" /><button className="btn primary" onClick={() => go(2)}>Generate report</button></div>
        </>
      )}

      {step === 2 && (
        <>
          <p className="note">
            {personQs.length} questions need a person to answer them. {personMissing.length ? <b>{personMissing.length} still need an answer.</b> : 'All are answered.'} Fiscal questions are pre-filled from the monthly records; change them here if needed.
          </p>
          <article className="form">
            <div className="fbody">
              {(() => {
                const out: React.ReactNode[] = []
                let sec: string | null = null
                let sub: string | null = null
                items.forEach((it) => {
                  if ('sec' in it) { sec = it.sec; sub = null; return }
                  if ('sub' in it) { sub = it.sub; return }
                  if (!isQuestion(it) || !PERSON(it)) return
                  if (sec) { out.push(<div className={`fsec ${sec.startsWith('II.') ? 'serif' : ''}`} key={'s' + it.n}>{sec}</div>); sec = null }
                  if (sub) { out.push(<div className="fsub" key={'b' + it.n}>{sub}</div>); sub = null }
                  out.push(
                    <div className={`q ${isMissing(it, ctx) ? 'missing' : ''}`} id={`q${it.n}`} key={it.n}>
                      <span className="n">{it.n}.</span>
                      <div className="t"><span>{it.t}{it.req ? ' *' : ''}</span></div>
                      <div className="ctl">{control(it)}</div>
                    </div>,
                  )
                })
                return out
              })()}
            </div>
          </article>
          <div className="toolbar"><button className="btn" onClick={() => go(1)}>Back</button><span className="spacer" /><button className="btn primary" onClick={() => go(3)}>Review report</button></div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="panel stack" style={{ gap: 8 }}>
            <h3>Ready to submit?</h3>
            <div className="readyrow"><span>Sunday entries</span><span className={`pill ${recorded.length === expected.length ? 'ok' : 'miss'}`}>{recorded.length} of {expected.length} Sundays</span></div>
            <div className="readyrow"><span>Required questions</span>{missing.length ? <span className="pill miss">{missing.length} unanswered</span> : <span className="pill ok">All answered</span>}</div>
            {missing.length > 0 && (
              <ul className="unanswered" aria-label="Unanswered questions">
                {missing.map((i) => (
                  <li key={i.n}>
                    <button type="button" className="link" onClick={() => (PERSON(i) ? go(2, `q${i.n}`) : go(1))}>Q{i.n}</button>
                    <span>{i.t}</span>
                  </li>
                ))}
              </ul>
            )}
            {inProgress && <span className="hint">This quarter is still in progress. Numbers will change until it ends.</span>}
            <div className="toolbar">
              <label className="check"><input type="checkbox" checked={appendix} onChange={(e) => setAppendix(e.target.checked)} /> Attach monthly appendix</label>
              <label className="check"><input type="checkbox" checked={includeOff} disabled={!appendix} onChange={(e) => setIncludeOff(e.target.checked)} /> Show offerings in appendix</label>
              <span className="spacer" />
              <button className="btn primary" onClick={download}>Download PDF</button>
            </div>
          </div>
          <article className="form">
            <div className="fhead"><h2>ASSEMBLY REPORTING FORM</h2><p>{q}<sup>{SUP[q - 1]}</sup> QUARTER {y}</p></div>
            <div className="fbody">
              {items.map((it, idx) => {
                if ('sec' in it) return <div key={idx} className={`fsec ${it.sec.startsWith('II.') ? 'serif' : ''}`}>{it.sec}</div>
                if ('sub' in it) return <div key={idx} className="fsub">{it.sub}</div>
                if (!isQuestion(it)) return null
                const edit = PERSON(it) ? <button className="link" onClick={() => go(2, `q${it.n}`)}>Edit</button> : it.src === 'assembly' || it.src === 'weekly' ? <button className="link" onClick={() => go(1)}>Edit</button> : null
                return (
                  <div key={idx} className={`q ${isMissing(it, ctx) ? 'missing' : ''}`}>
                    <span className="n">{it.n}.</span>
                    <div className="t"><span>{it.t}{it.req ? ' *' : ''}</span>{edit}</div>
                    <div className="ctl">{review(it)}</div>
                  </div>
                )
              })}
              <div className="sign">
                <div><span>{church.pastor_name}</span><b>Name of Pastor</b></div>
                <div><span>{supervisorName}</span><b>Name of Supervisor</b></div>
                <div><span className="sig">{signedInitials}</span><b>Signature</b></div>
                <div><span /><b>Signature</b></div>
                <div><span>{usDate(signedOn)}</span><b>Date Signed</b></div>
                <div><span /><b>Date Signed</b></div>
              </div>
              <div className="signin">
                <div className="stack" style={{ gap: 6 }}>
                  <label className="hint" htmlFor="sig-initials"><b>Pastor&apos;s signature</b> (initials, e.g. B.M)</label>
                  <input type="text" id="sig-initials" maxLength={12} autoComplete="off" placeholder="Initials" value={signedInitials} onChange={(e) => setSignedInitials(e.target.value)} />
                </div>
                <div className="stack" style={{ gap: 6 }}>
                  <label className="hint" htmlFor="sig-date">Date signed by pastor</label>
                  <input type="date" id="sig-date" value={signedOn} onChange={(e) => setSignedOn(e.target.value)} />
                </div>
                <div className="stack" style={{ gap: 6 }}>
                  <label className="hint" htmlFor="sig-sup">Name of Supervisor (optional)</label>
                  <input type="text" id="sig-sup" value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} />
                </div>
              </div>
            </div>
          </article>
          <div className="toolbar"><button className="btn" onClick={() => go(2)}>Back</button><span className="spacer" /><button className="btn primary" onClick={download}>Download PDF</button></div>
        </>
      )}
      {toast.node}
    </div>
  )
}

