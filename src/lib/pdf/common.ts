import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export const BLUE: [number, number, number] = [79, 129, 189]
export const INK: [number, number, number] = [25, 25, 25]
export const YELLOW: [number, number, number] = [255, 255, 0]

export function newDoc() {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  doc.setTextColor(...INK)
  return doc
}

export type Doc = ReturnType<typeof newDoc>

/** Draw a table and return the y position under it. */
export function table(doc: Doc, options: Record<string, unknown>): number {
  autoTable(doc, options as Parameters<typeof autoTable>[1])
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
}

/** Grey, template-style table used inside form pages. */
export const FORM_TABLE = {
  theme: 'grid',
  styles: { font: 'helvetica', fontSize: 9, cellPadding: 4.5, lineColor: [205, 205, 205], lineWidth: 0.8, textColor: INK },
  headStyles: { fillColor: [242, 242, 242], textColor: INK, fontStyle: 'bold' },
  footStyles: { fillColor: [255, 255, 255], textColor: INK, fontStyle: 'bold' },
  margin: { left: 62, right: 52 },
  pageBreak: 'avoid',
  didParseCell: (c: { column: { index: number }; cell: { styles: { halign: string } } }) => {
    if (c.column.index > 0) c.cell.styles.halign = 'right'
  },
}

/** Blue-header table used in the appendix. */
export const APPENDIX_TABLE = {
  theme: 'grid',
  styles: { fontSize: 8.5, cellPadding: 4, lineColor: [210, 214, 220], textColor: INK },
  headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
  footStyles: { fillColor: [236, 240, 246], textColor: INK, fontStyle: 'bold' },
  margin: { left: 54, right: 54 },
  didParseCell: (c: { column: { index: number }; cell: { styles: { halign: string } } }) => {
    if (c.column.index > 0) c.cell.styles.halign = 'right'
  },
}

/** Page helpers shared by the form-style pages. */
export function formKit(doc: Doc) {
  const kit = {
    y: 50,
    TOP: 50,
    BOT: 752,
    need(h: number) {
      if (kit.y + h > kit.BOT) {
        doc.addPage()
        kit.y = kit.TOP
      }
    },
    font(style: 'normal' | 'bold', size: number, family = 'helvetica') {
      doc.setFont(family, style)
      doc.setFontSize(size)
    },
    /** Template checkbox: empty square and label; the chosen answer is highlighted yellow. */
    option(x: number, yy: number, label: string, selected: boolean) {
      kit.font('normal', 9.5)
      const bw = 7.2
      const tw = doc.getTextWidth(label)
      if (selected) {
        doc.setFillColor(...YELLOW)
        doc.rect(x - 1.5, yy - 9, bw + 6 + tw + 3, 12, 'F')
      }
      doc.setDrawColor(40, 40, 40)
      doc.setLineWidth(0.6)
      doc.rect(x, yy - 7.4, bw, bw)
      doc.text(label, x + bw + 4.5, yy)
    },
    bracket(x: number, yy: number, label: string, selected: boolean) {
      kit.font('normal', 8.5)
      const t = '[ ] ' + label
      const tw = doc.getTextWidth(t)
      if (selected) {
        doc.setFillColor(...YELLOW)
        doc.rect(x - 1, yy - 8.2, tw + 2, 11, 'F')
      }
      doc.text(t, x, yy)
    },
    answerBox(x: number, v: unknown) {
      doc.setDrawColor(205, 205, 205)
      doc.setLineWidth(2)
      doc.rect(x, kit.y, 373, 31)
      if (v !== '' && v !== null && v !== undefined) {
        kit.font('normal', 10.5, 'times')
        doc.text(String(v), x + 186.5, kit.y + 19.5, { align: 'center' })
      }
      kit.y += 31
    },
    section(text: string, serif = false) {
      kit.need(80)
      kit.y += 2
      kit.font('bold', serif ? 12.5 : 11.5, serif ? 'times' : 'helvetica')
      doc.setTextColor(...BLUE)
      doc.text(text, 50, kit.y)
      doc.setTextColor(...INK)
      kit.y += 22
    },
    sub(text: string) {
      kit.need(75)
      kit.font('bold', 9.5)
      doc.text(text, 50, kit.y)
      kit.y += 19
    },
    /** Name / signature / date rows with dotted lines, as on the template's last page. */
    signRow(leftValue: string, leftLabel: string, rightValue: string, rightLabel: string) {
      kit.font('normal', 10)
      if (leftValue) doc.text(leftValue, 85, kit.y - 4)
      if (rightValue) doc.text(rightValue, 423, kit.y - 4, { align: 'center' })
      doc.setDrawColor(60, 60, 60)
      doc.setLineWidth(0.9)
      doc.setLineDashPattern([0.9, 1.8], 0)
      doc.line(63, kit.y, 232, kit.y)
      doc.line(333, kit.y, 513, kit.y)
      doc.setLineDashPattern([], 0)
      kit.font('bold', 9.5)
      doc.text(leftLabel, 148, kit.y + 13, { align: 'center' })
      doc.text(rightLabel, 423, kit.y + 13, { align: 'center' })
      kit.y += 58
    },
  }
  return kit
}

export function footer(doc: Doc, text: string, from = 1) {
  const n = doc.getNumberOfPages()
  for (let i = from; i <= n; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(110, 110, 110)
    doc.text(text, 54, 770)
    doc.text(`Page ${i - from + 1} of ${n - from + 1}`, 558, 770, { align: 'right' })
    doc.setTextColor(...INK)
  }
}
