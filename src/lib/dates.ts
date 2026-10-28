export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const MON = MONTHS.map((m) => m.slice(0, 3))
export const ORDL = ['1st', '2nd', '3rd', '4th']

const pad = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
export const D = (s: string) => new Date(s + 'T12:00:00Z')
export const isISODate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(D(s).getTime())

/** Today's date in the church's time zone, as YYYY-MM-DD. */
export function todayISO(timeZone = 'America/Toronto') {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
export function addDays(s: string, n: number) {
  const d = D(s)
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}
export function lastSunday(s: string) {
  return addDays(s, -D(s).getUTCDay())
}
export function sundaysBetween(a: string, b: string) {
  const out: string[] = []
  let d = lastSunday(a)
  if (d < a) d = addDays(d, 7)
  while (d <= b) {
    out.push(d)
    d = addDays(d, 7)
  }
  return out
}
export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
export const longDate = (s: string) => {
  const d = D(s)
  return `Sunday, ${ordinal(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
export const shortDate = (s: string) => {
  const d = D(s)
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`
}
export const usDate = (s: string) => (s ? `${s.slice(5, 7)}/${s.slice(8, 10)}/${s.slice(0, 4)}` : '')
export const ymLabel = (ym: string) => `${MONTHS[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`
export const monthEnd = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return iso(new Date(Date.UTC(y, m, 0, 12)))
}
export const prevYm = (ym: string) => {
  let [y, m] = ym.split('-').map(Number)
  m--
  if (!m) {
    m = 12
    y--
  }
  return `${y}-${pad(m)}`
}
export function monthList(fromYm: string, toYm: string) {
  const out: string[] = []
  let ym = fromYm
  while (ym <= toYm) {
    out.push(ym)
    let [y, m] = ym.split('-').map(Number)
    m++
    if (m > 12) {
      m = 1
      y++
    }
    ym = `${y}-${pad(m)}`
  }
  return out
}
export const qMonths = (y: number, q: number) => [1, 2, 3].map((i) => `${y}-${pad(q * 3 - 3 + i)}`)
export const quarterRange = (y: number, q: number): [string, string] => {
  const ms = qMonths(y, q)
  return [ms[0] + '-01', monthEnd(ms[2])]
}
export const quarterOf = (date: string) => ({ y: +date.slice(0, 4), q: Math.ceil(+date.slice(5, 7) / 3) })
export const periodKey = (y: number, q: number) => `${y}-Q${q}`
export function parsePeriod(key: string): { y: number; q: number } | null {
  const m = /^(\d{4})-Q([1-4])$/.exec(key)
  return m ? { y: +m[1], q: +m[2] } : null
}
