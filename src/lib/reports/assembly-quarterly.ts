import { MONTHS, MON } from '../dates'
import { adults, avg, r1 } from '../stats'
import { OBLIGATIONS, type Church, type MonthlyRecords, type ObligationKey, type Service } from '../types'
import type { Answers, FormItem, Question } from './types'

export const ABC = ['New Believers', 'Membership Class', 'Maturity', 'Ministry']
export const BANDS = ['1-5', '6-10', '11-15', '>20']
export const FAMILY = ["Men's Ministry", "Women's Ministry", 'Singles Ministry', 'Couples Ministry', 'Ministry to the Elderly']
export const SUP = ['ST', 'ND', 'RD', 'TH']

export const SOURCE: Record<Question['src'], string> = {
  weekly: 'From Sunday entries',
  monthly: 'From monthly records',
  quarter: 'Answered each quarter',
  assembly: 'Assembly details',
  derived: 'Calculated',
  outside: 'Done outside the app',
}

/** Everything the form needs to work out its answers. */
export type FormContext = {
  y: number
  q: number
  church: Church
  answers: Answers
  servicesNow: Service[] // Sundays in this quarter
  servicesPrev: Service[] // Sundays in the same quarter last year
  monthly: MonthlyRecords
}

/** The Assembly Reporting Form, question for question, in the template's order and wording. */
export function assemblyForm(y: number, q: number): FormItem[] {
  const end = `${MONTHS[q * 3 - 1]} ${y}`
  const endPrev = `${MONTHS[q * 3 - 1]} ${y - 1}`
  const ms = [1, 2, 3].map((i) => MONTHS[q * 3 - 3 + i - 1])
  const fis = [...ms, 'Not Paid', 'N/A']
  const yn = ['Yes', 'No']
  const fiscalQ = (key: ObligationKey, n: number, label: string): FormItem => ({
    n,
    t: key === 'wht' ? 'Which of these periods has your assembly fully complied with Withholding Tax?' : `Which of these periods has your assembly fully complied with ${label} obligations?`,
    req: true,
    kind: 'fiscal',
    src: 'monthly',
    key,
    opts: key === 'mcf' ? [...ms, 'Not Paid'] : fis,
  })
  return [
    { sec: 'ASSEMBLY DETAILS' },
    { n: 1, t: 'Full Name of Pastor', req: true, kind: 'text', src: 'assembly', key: 'pastor_name' },
    { n: 2, t: 'Name of Assembly', kind: 'text', src: 'assembly', key: 'name' },
    { n: 3, t: 'Region of Assembly', kind: 'text', src: 'assembly', key: 'region' },
    { n: 4, t: 'District of Assembly', kind: 'text', src: 'assembly', key: 'district' },
    { n: 5, t: 'Area of Assembly', kind: 'text', src: 'assembly', key: 'area' },
    { sec: 'I. CHURCH GROWTH AND MISSIONS' },
    { sub: 'A. CHURCH MEMBERSHIP GROWTH [ADULT MEMBERS ONLY]' },
    { n: 6, t: "Indicate your Assembly's total adult membership category", req: true, kind: 'choice', src: 'derived', key: 'category', opts: ['1 - 100', '101 - 250', '251 - 500', '501 above'] },
    { n: 7, t: `Indicate your Assembly's total adult membership at the end of ${endPrev}`, req: true, kind: 'number', src: 'quarter', key: 'membershipPrev' },
    { n: 8, t: `Indicate your Assembly's total adult membership at the end of ${end}`, req: true, kind: 'number', src: 'quarter', key: 'membershipNow' },
    { sub: 'B. CHURCH ATTENDANCE GROWTH [ADULT MEMBERS ONLY]' },
    { n: 9, t: `Indicate the Assembly's total adult average attendance at the end of ${endPrev}`, req: true, kind: 'number', src: 'weekly', key: 'adultAvgPrev', yq: [y - 1, q] },
    { n: 10, t: `Indicate the Assembly's total adult average attendance at the end of ${end}`, req: true, kind: 'number', src: 'weekly', key: 'adultAvgNow', yq: [y, q] },
    { sub: 'C. VOLUNTEER PARTICIPATION' },
    { n: 11, t: `Indicate the Assembly's total number of volunteers (Church Workers) at the end of ${endPrev}`, req: true, kind: 'number', src: 'quarter', key: 'volunteersPrev' },
    { n: 12, t: `Indicate the Assembly's total number of volunteers (Church Workers) at the end of ${end}`, req: true, kind: 'number', src: 'quarter', key: 'volunteersNow' },
    { sec: 'II. MEMBERSHIP GROWTH' },
    { sub: 'A. DISCIPLESHIP PROGRAMME [ADULT BIBLE CLASS]' },
    { n: 13, t: 'Does ABC programme run in your Assembly?', req: true, kind: 'choice', src: 'quarter', key: 'abcRuns', opts: yn },
    { n: 14, t: 'If yes, indicate the ABC modules run in your Assembly', kind: 'multi', src: 'quarter', key: 'abcModules', opts: ABC },
    { n: 15, t: 'Indicate the number of participants at each level', kind: 'bands', src: 'quarter', key: 'abcBands' },
    { sub: 'B. MEMBERSHIP CARE AND FELLOWSHIP' },
    { n: 16, t: 'Indicate the family support group established in your Assembly', req: true, kind: 'multi', src: 'quarter', key: 'familyGroups', opts: FAMILY },
    { n: 17, t: 'Indicate if family support group leaders in your Assembly participated in the effective small group training', req: true, kind: 'choice', src: 'quarter', key: 'trainSmallGroup', opts: yn },
    { n: 18, t: 'Indicate if the Admin. staff in your Assembly participated in the Workplace Etiquette and Professionalism and Effective Teamwork Training.', req: true, kind: 'choice', src: 'quarter', key: 'trainAdmin', opts: yn },
    { n: 19, t: "Indicate if the Pastor in your Assembly participated in the 2-Day Pastors' Training Workshop.", req: true, kind: 'choice', src: 'quarter', key: 'trainPastor', opts: yn },
    { n: 20, t: 'Indicate if the LCC / LMC in your Assembly participated in the Effective Supervision Training', req: true, kind: 'choice', src: 'quarter', key: 'trainLCC', opts: yn },
    { sec: 'III. Infrastructure Development' },
    { n: 21, t: "Does your Assembly have a dedicated space for Children's Ministry?", req: true, kind: 'choice', src: 'quarter', key: 'childrenSpace', opts: yn },
    { sec: 'IV. REGULATORY AND FISCAL OBLIGATIONS' },
    { sub: 'A. REGULATORY OBLIGATIONS' },
    { n: 22, t: 'Has your Assembly acquired fire certificate for the auditorium?', req: true, kind: 'choice', src: 'quarter', key: 'fireCert', opts: yn },
    { n: 23, t: 'If yes, provide proof of fire certificate', kind: 'text', src: 'quarter', key: 'fireProof' },
    { n: 24, t: 'Does your Assembly own their premises?', req: true, kind: 'choice', src: 'quarter', key: 'ownPremises', opts: yn },
    { n: 25, t: 'Has your Assembly licensed [gazetted] the auditorium for marriage ceremonies?', req: true, kind: 'choice', src: 'quarter', key: 'gazetted', opts: yn },
    { n: 26, t: 'If yes, provide proof of licensed [gazetted] certificate', kind: 'text', src: 'quarter', key: 'gazettedProof' },
    { sub: 'B. FISCAL OBLIGATIONS' },
    ...OBLIGATIONS.slice(0, 5).map((o) => fiscalQ(o.key, o.n, o.label)),
    { n: 32, t: `Indicate if your assembly has complied with ${y - 1} GFM Contributions?`, req: true, kind: 'choice', src: 'quarter', key: 'gfm', opts: ['Paid', 'Not Paid'] },
    { n: 33, t: 'Indicate if your assembly has complied with central aid contributions', kind: 'choice', src: 'quarter', key: 'centralAid', opts: ['Paid', 'Not Paid'] },
    fiscalQ('mcf', 34, 'MCF'),
    { sec: 'V. LEGACY' },
    { n: 35, t: 'Does your assembly have an active New Breed Ministry?', req: true, kind: 'choice', src: 'quarter', key: 'newBreed', opts: yn },
    { n: 36, t: 'Indicate how frequently meetings are held for the New Breed', kind: 'choice', src: 'quarter', key: 'newBreedFreq', opts: ['Once a week', 'Twice a week', 'Once a Month'] },
    { n: 37, t: 'If other, specify how meetings are held for New Breed', kind: 'text', src: 'quarter', key: 'newBreedOther' },
    { n: 38, t: 'Kindly upload the validated form approved by your supervisor.', kind: 'note', src: 'outside', key: 'upload' },
  ]
}

export function category(n: unknown) {
  const v = Number(n)
  if (!v) return ''
  return v <= 100 ? '1 - 100' : v <= 250 ? '101 - 250' : v <= 500 ? '251 - 500' : '501 above'
}

/** Average of men + women over the Sundays given. */
export function adultAverage(list: Service[]) {
  return { n: list.length, v: list.length ? r1(avg(list.map(adults))) : null }
}

export function fiscalFromMonthly(ctx: FormContext, key: ObligationKey) {
  const ms = [1, 2, 3].map((i) => `${ctx.y}-${String(ctx.q * 3 - 3 + i).padStart(2, '0')}`)
  const st = ms.map((m) => ctx.monthly[m]?.[key] ?? '')
  const ticks: string[] = []
  ms.forEach((m, i) => {
    if (st[i] === 'paid') ticks.push(MONTHS[+m.slice(5) - 1])
  })
  if (st.includes('not_paid')) ticks.push('Not Paid')
  if (st.every((s) => s === 'na')) ticks.push('N/A')
  return { ticks, st, ms, labels: ms.map((m) => MON[+m.slice(5) - 1]), complete: st.every(Boolean) }
}

const has = (v: unknown) => v !== '' && v !== null && v !== undefined

/** The answer the form will show for a question. App-calculated values win unless someone edited them. */
export function answerFor(it: Question, ctx: FormContext): string | number | string[] {
  const a = ctx.answers
  if (it.src === 'assembly') return (ctx.church as Record<string, any>)[it.key] ?? '' // eslint-disable-line @typescript-eslint/no-explicit-any
  if (it.key === 'category') return category(a.membershipNow)
  if (it.src === 'weekly') {
    const ov = a[it.key + 'Override']
    if (has(ov)) return ov
    const c = adultAverage(it.key === 'adultAvgPrev' ? ctx.servicesPrev : ctx.servicesNow).v
    return c === null ? '' : c
  }
  if (it.kind === 'fiscal') {
    const ov = a.fiscal?.[it.key]
    return Array.isArray(ov) ? ov : fiscalFromMonthly(ctx, it.key as ObligationKey).ticks
  }
  const v = a[it.key]
  return v ?? (it.kind === 'multi' ? [] : '')
}

export function isMissing(it: Question, ctx: FormContext) {
  if (!it.req) return false
  const v = answerFor(it, ctx)
  return Array.isArray(v) ? !v.length : !has(v)
}

/** Starting answers for a new quarter: last quarter's answers, minus this quarter's numbers. */
export function carryOver(previous: Answers | null, sameQuarterLastYear: Answers | null): Answers {
  const base: Answers = previous ? JSON.parse(JSON.stringify(previous)) : {}
  delete base.fiscal
  delete base.adultAvgPrevOverride
  delete base.adultAvgNowOverride
  base.membershipNow = ''
  base.volunteersNow = ''
  base.membershipPrev = sameQuarterLastYear?.membershipNow ?? ''
  base.volunteersPrev = sameQuarterLastYear?.volunteersNow ?? ''
  return base
}
