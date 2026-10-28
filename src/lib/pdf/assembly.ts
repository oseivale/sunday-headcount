import { ORDL, shortDate, usDate, ymLabel, qMonths } from '../dates'
import { ABC, BANDS, SUP, answerFor, assemblyForm, type FormContext } from '../reports/assembly-quarterly'
import { isQuestion } from '../reports/types'
import { money, offTot, r1, receivedTot, receivedTotUsd, statsOf, sum, tot } from '../stats'
import { OBLIGATIONS, STATUS_LABEL, type Service } from '../types'
import { APPENDIX_TABLE, BLUE, INK, footer, formKit, newDoc, table } from './common'

export type AssemblyPdfInput = {
  ctx: FormContext
  signedInitials: string
  signedOn: string
  supervisorName: string
  appendix: boolean
  includeOfferings: boolean
}

/** The Assembly Reporting Form, laid out to match the paper template. */
export function buildAssemblyPdf({ ctx, signedInitials, signedOn, supervisorName, appendix, includeOfferings }: AssemblyPdfInput) {
  const { y: yr, q, answers: a, church } = ctx
  const doc = newDoc()
  const k = formKit(doc)
  const L = 50
  const W = 612
  const RX = 560

  // Title with the superscript ordinal, as on the template
  k.font('bold', 14.5)
  doc.text('ASSEMBLY REPORTING FORM', W / 2, k.y, { align: 'center' })
  k.y += 17
  const sup = SUP[q - 1]
  const main = String(q)
  const rest = ` QUARTER ${yr}`
  k.font('bold', 10.5)
  const w1 = doc.getTextWidth(main)
  const w2 = doc.getTextWidth(rest)
  k.font('bold', 6.5)
  const ws = doc.getTextWidth(sup)
  const x0 = W / 2 - (w1 + ws + w2) / 2
  k.font('bold', 10.5)
  doc.text(main, x0, k.y)
  k.font('bold', 6.5)
  doc.text(sup, x0 + w1 + 0.5, k.y - 4.2)
  k.font('bold', 10.5)
  doc.text(rest, x0 + w1 + ws + 0.5, k.y)
  k.y += 30

  for (const it of assemblyForm(yr, q)) {
    if ('sec' in it) {
      k.section(it.sec, it.sec.startsWith('II.'))
      continue
    }
    if ('sub' in it) {
      k.sub(it.sub)
      continue
    }
    if (!isQuestion(it)) continue
    const late = it.n >= 22
    const tx = late ? 86 : L + (it.n >= 10 ? 15 : 12)
    k.font('normal', 9.5)
    const lines: string[] = doc.splitTextToSize(it.t + (it.req ? ' *' : ''), RX - tx)
    const v = answerFor(it, ctx)
    const bodyH =
      it.kind === 'note' ? 6 : it.kind === 'text' || it.kind === 'number' ? 42 : it.kind === 'bands' ? ABC.length * 17 + 14 : (it.opts ?? []).length * 16.6 + 14
    k.need(lines.length * 12.5 + bodyH + 18)
    doc.text(it.n + '.', L, k.y)
    doc.text(lines, tx, k.y, { lineHeightFactor: 1.3 })
    k.y += (lines.length - 1) * 12.4
    if (it.kind === 'text' || it.kind === 'number') {
      k.y += 9
      k.answerBox(late ? 68 : 62, v)
      k.y += 19
      continue
    }
    if (it.kind === 'bands') {
      k.y += 24
      const bands: Record<string, string> = a.abcBands ?? {}
      const mods: string[] = a.abcModules ?? []
      ABC.forEach((m) => {
        k.font('normal', 9.5)
        doc.text(m, 85, k.y)
        BANDS.forEach((x, i) => k.bracket(193 + i * 72, k.y, x, mods.includes(m) && bands[m] === x))
        k.y += 17
      })
      k.y += 26
      continue
    }
    if (it.kind === 'note') {
      k.y += 20
      continue
    }
    const sel = Array.isArray(v) ? v : [String(v)]
    k.y += 23
    ;(it.opts ?? []).forEach((o) => {
      k.option(85, k.y, o, sel.includes(o))
      k.y += 15.5
    })
    k.y += 13
  }

  // Signature page, as on the template
  doc.addPage()
  k.y = k.TOP
  k.signRow(church.pastor_name ?? '', 'Name of Pastor', supervisorName, 'Name of Supervisor')
  k.signRow(signedInitials, 'Signature', '', 'Signature')
  k.signRow(usDate(signedOn), 'Date Signed', '', 'Date Signed')
  const formPages = doc.getNumberOfPages()

  if (appendix) {
    doc.addPage()
    let y = 60
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('APPENDIX: MONTHLY ATTENDANCE DETAILS', W / 2, y, { align: 'center' })
    y += 16
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text(`${church.name} - ${ORDL[q - 1]} Quarter ${yr}. Adults = men + women; Q9 and Q10 use the adult average.`, W / 2, y, { align: 'center' })
    y += 20
    const ms = qMonths(yr, q)
    const inMonth = (m: string) => ctx.servicesNow.filter((s) => s.service_date.startsWith(m))
    const qs = statsOf(ctx.servicesNow)
    y =
      table(doc, {
        ...APPENDIX_TABLE,
        startY: y,
        head: [['Month', 'Sundays', 'Avg men', 'Avg women', 'Avg children', 'Avg adults', 'Avg total', 'New members', ...(includeOfferings ? ['Grand Total CAD', 'Grand Total USD'] : [])]],
        body: ms.map((m) => {
          const s = statsOf(inMonth(m))
          return [ymLabel(m), s.n, r1(s.men), r1(s.women), r1(s.children), r1(s.adults), r1(s.total), s.newMembers, ...(includeOfferings ? [money(s.received), money(s.usdReceived)] : [])]
        }),
        foot: [['Quarter', qs.n, r1(qs.men), r1(qs.women), r1(qs.children), r1(qs.adults), r1(qs.total), qs.newMembers, ...(includeOfferings ? [money(qs.received), money(qs.usdReceived)] : [])]],
      }) + 22
    ms.forEach((m) => {
      const list: Service[] = inMonth(m)
      const s = statsOf(list)
      if (y > 600) {
        doc.addPage()
        y = 60
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...BLUE)
      doc.text(ymLabel(m).toUpperCase(), 54, y)
      doc.setTextColor(...INK)
      const head = ['Date', 'Men', 'Women', 'Children', 'Total', 'New', ...(includeOfferings ? ['Offerings CAD', 'Tithe CAD', 'Pledge CAD', 'Grand Total CAD', 'Grand Total USD'] : [])]
      y =
        table(doc, {
          ...APPENDIX_TABLE,
          startY: y + 6,
          head: [head],
          body: list.length
            ? list.map((x) => [`${shortDate(x.service_date)}, ${x.service_date.slice(0, 4)}`, x.men, x.women, x.children, tot(x), x.new_members, ...(includeOfferings ? [money(offTot(x)), money(x.tithe), money(x.pledge), money(receivedTot(x)), money(receivedTotUsd(x))] : [])])
            : [['No Sundays recorded', ...head.slice(1).map(() => '')]],
          foot: list.length
            ? [
                ['Total', sum(list.map((x) => x.men)), sum(list.map((x) => x.women)), sum(list.map((x) => x.children)), sum(list.map(tot)), s.newMembers, ...(includeOfferings ? [money(s.offTotal), money(s.tithe), money(s.pledge), money(s.received), money(s.usdReceived)] : [])],
                ['Average per Sunday', r1(s.men), r1(s.women), r1(s.children), r1(s.total), '', ...(includeOfferings ? [money(s.offTotal / s.n), money(s.tithe / s.n), money(s.pledge / s.n), money(s.received / s.n), money(s.usdReceived / s.n)] : [])],
              ]
            : [],
        }) + 22
    })
    if (y > 620) {
      doc.addPage()
      y = 60
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...BLUE)
    doc.text('FISCAL OBLIGATIONS BY MONTH', 54, y)
    doc.setTextColor(...INK)
    table(doc, {
      ...APPENDIX_TABLE,
      startY: y + 6,
      head: [['Obligation', ...ms.map(ymLabel)]],
      body: OBLIGATIONS.map((o) => [`${o.label} (Q${o.n})`, ...ms.map((m) => {
        const st = ctx.monthly[m]?.[o.key]
        return st ? STATUS_LABEL[st] : 'Not recorded'
      })]),
    })
    footer(doc, `${church.name} - Appendix to the ${ORDL[q - 1]} Quarter ${yr} Assembly Reporting Form`, formPages + 1)
  }
  return doc
}

export const assemblyFileName = (churchName: string, y: number, q: number) => `${churchName} - ${ORDL[q - 1]} Quarter ${y} Assembly Report.pdf`
