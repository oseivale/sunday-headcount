import type { Service } from './types'

export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
export const avg = (a: number[]) => (a.length ? sum(a) / a.length : 0)
export const r1 = (v: number) => Math.round(v)
export const tot = (s: Service) => s.men + s.women + s.children
export const adults = (s: Service) => s.men + s.women
export const offTot = (s: Service) => Number(s.offering_1) + Number(s.offering_2)
export const cad = (v: number) => 'CAD $' + (Number.isInteger(+v) ? +v : (+v).toFixed(2))
export const money = (v: number) => '$' + (+v || 0).toFixed(2)
export function pct(a: number, b: number | null | undefined) {
  return b ? ((a - b) / b) * 100 : null
}

export type Stats = {
  n: number
  men: number
  women: number
  children: number
  adults: number
  total: number
  off1: number
  off2: number
  offTotal: number
  peak: Service | null
}

export function statsOf(list: Service[]): Stats {
  return {
    n: list.length,
    men: avg(list.map((s) => s.men)),
    women: avg(list.map((s) => s.women)),
    children: avg(list.map((s) => s.children)),
    adults: avg(list.map(adults)),
    total: avg(list.map(tot)),
    off1: sum(list.map((s) => Number(s.offering_1))),
    off2: sum(list.map((s) => Number(s.offering_2))),
    offTotal: sum(list.map(offTot)),
    peak: list.reduce<Service | null>((b, s) => (!b || tot(s) > tot(b) ? s : b), null),
  }
}

/** Normalise a row from the database (numeric columns can arrive as strings). */
export function toService(r: Record<string, unknown>): Service {
  return {
    service_date: String(r.service_date),
    men: Number(r.men) || 0,
    women: Number(r.women) || 0,
    children: Number(r.children) || 0,
    offering_1: Number(r.offering_1) || 0,
    offering_2: Number(r.offering_2) || 0,
  }
}
export const SERVICE_COLUMNS = 'service_date, men, women, children, offering_1, offering_2'
