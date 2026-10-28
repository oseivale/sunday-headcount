import { prevYm, shortDate, ymLabel } from '../dates'
import { adults, money, offTot, r1, statsOf, sum, tot } from '../stats'
import { OBLIGATIONS, STATUS_LABEL, type Church, type ObligationStatus, type Service } from '../types'
import { FORM_TABLE, formKit, newDoc, table } from './common'

export type MonthlyPdfInput = {
  church: Church
  ym: string
  services: Service[]
  obligations: Partial<Record<string, ObligationStatus>>
  includeOfferings: boolean
}

/** Monthly attendance report, laid out in the style of the assembly form. */
export function buildMonthlyPdf({ church, ym, services, obligations, includeOfferings }: MonthlyPdfInput) {
  const doc = newDoc()
  const k = formKit(doc)
  const W = 612
  const st = statsOf(services)
  const field = (label: string, v: unknown) => {
    k.need(60)
    k.font('normal', 9.5)
    doc.text(label, 50, k.y)
    k.y += 9
    k.answerBox(62, v)
    k.y += 19
  }
  const grid = (label: string, head: string[], body: (string | number)[][], foot: (string | number)[][]) => {
    k.need(90)
    k.font('normal', 9.5)
    doc.text(label, 50, k.y)
    k.y = table(doc, { ...FORM_TABLE, startY: k.y + 9, head: [head], body: body.length ? body : [['No Sundays recorded', ...head.slice(1).map(() => '')]], foot }) + 26
  }
  const sd = (d: string) => `${shortDate(d)}, ${d.slice(0, 4)}`

  k.font('bold', 14.5)
  doc.text('MONTHLY ATTENDANCE REPORT', W / 2, k.y, { align: 'center' })
  k.y += 17
  k.font('bold', 10.5)
  doc.text(ymLabel(ym).toUpperCase(), W / 2, k.y, { align: 'center' })
  k.y += 30

  k.section('ASSEMBLY DETAILS')
  field('Full Name of Pastor', church.pastor_name)
  field('Name of Assembly', church.name)
  field('Region of Assembly', church.region)
  field('District of Assembly', church.district)
  field('Area of Assembly', church.area)

  k.section('I. CHURCH GROWTH AND MISSIONS')
  k.sub('B. CHURCH ATTENDANCE GROWTH [ADULT MEMBERS ONLY]')
  field(`Adult average attendance for ${ymLabel(ym)} (men + women)`, st.n ? r1(st.adults) : '')
  field(`Total average attendance for ${ymLabel(ym)} (men, women and children)`, st.n ? r1(st.total) : '')
  field(`Number of Sundays recorded in ${ymLabel(ym)}`, st.n)
  grid(
    'Attendance by Sunday',
    ['Date', 'Men', 'Women', 'Children', 'Adults', 'Total'],
    services.map((s) => [sd(s.service_date), s.men, s.women, s.children, adults(s), tot(s)]),
    services.length
      ? [
          ['Total', sum(services.map((s) => s.men)), sum(services.map((s) => s.women)), sum(services.map((s) => s.children)), sum(services.map(adults)), sum(services.map(tot))],
          ['Average per Sunday', r1(st.men), r1(st.women), r1(st.children), r1(st.adults), r1(st.total)],
        ]
      : [],
  )
  if (includeOfferings)
    grid(
      'Offerings by Sunday (CAD)',
      ['Date', '1st Offering', '2nd Offering (Project)', 'Total Offering'],
      services.map((s) => [sd(s.service_date), money(s.offering_1), money(s.offering_2), money(offTot(s))]),
      services.length
        ? [
            ['Total', money(st.off1), money(st.off2), money(st.offTotal)],
            ['Average per Sunday', money(st.off1 / st.n), money(st.off2 / st.n), money(st.offTotal / st.n)],
          ]
        : [],
    )

  k.section('IV. REGULATORY AND FISCAL OBLIGATIONS')
  k.sub('B. FISCAL OBLIGATIONS')
  OBLIGATIONS.forEach((o) => {
    const opts = o.key === 'mcf' ? ['Paid', 'Not Paid'] : ['Paid', 'Not Paid', 'N/A']
    const cur = obligations[o.key]
    k.need(30 + opts.length * 15.5)
    k.font('normal', 9.5)
    doc.text(`${o.key === 'wht' ? 'Withholding Tax' : o.label + ' obligations'} for ${ymLabel(ym)} (reported in Q${o.n} of the quarterly form)`, 50, k.y)
    k.y += 21
    opts.forEach((x) => {
      k.option(85, k.y, x, !!cur && STATUS_LABEL[cur].toLowerCase() === x.toLowerCase())
      k.y += 15.5
    })
    k.y += 12
  })

  k.need(120)
  k.y += 26
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  k.signRow(church.pastor_name ?? '', 'Name of Pastor', today, 'Date Prepared')
  return doc
}

export const monthlyFileName = (church: Church, ym: string) => `${church.name} - ${ymLabel(ym)} attendance report.pdf`
export { prevYm }
