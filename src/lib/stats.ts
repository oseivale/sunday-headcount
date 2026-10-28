import type { Service } from './types'

export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
export const avg = (a: number[]) => (a.length ? sum(a) / a.length : 0)
export const r1 = (v: number) => Math.round(v)
export const tot = (s: Service) => s.men + s.women + s.children
export const adults = (s: Service) => s.men + s.women
/** Total offering = 1st + 2nd + special. Tithe and pledge are kept separate. */
export const offTot = (s: Service) => Number(s.offering_1) + Number(s.offering_2) + Number(s.offering_special) // CAD
export const offTotUsd = (s: Service) => Number(s.offering_1_usd) + Number(s.offering_2_usd) + Number(s.offering_special_usd)
/** Everything received: offerings + tithe + pledge. */
export const receivedTot = (s: Service) => offTot(s) + Number(s.tithe) + Number(s.pledge) // CAD
export const receivedTotUsd = (s: Service) => offTotUsd(s) + Number(s.tithe_usd) + Number(s.pledge_usd)
export const cad = (v: number) => 'CAD $' + (Number.isInteger(+v) ? +v : (+v).toFixed(2))
export const usd = (v: number) => 'USD $' + (Number.isInteger(+v) ? +v : (+v).toFixed(2))
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
  offTotal: number // CAD: 1st + 2nd + special
  special: number
  tithe: number
  pledge: number
  received: number // CAD: offerings + tithe + pledge
  usd1: number
  usd2: number
  usdSpecial: number
  usdTithe: number
  usdPledge: number
  usdTotal: number // USD offerings: 1st + 2nd + special
  usdReceived: number
  newMembers: number // total for the period
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
    special: sum(list.map((s) => Number(s.offering_special))),
    tithe: sum(list.map((s) => Number(s.tithe))),
    pledge: sum(list.map((s) => Number(s.pledge))),
    received: sum(list.map(receivedTot)),
    usd1: sum(list.map((s) => Number(s.offering_1_usd))),
    usd2: sum(list.map((s) => Number(s.offering_2_usd))),
    usdSpecial: sum(list.map((s) => Number(s.offering_special_usd))),
    usdTithe: sum(list.map((s) => Number(s.tithe_usd))),
    usdPledge: sum(list.map((s) => Number(s.pledge_usd))),
    usdTotal: sum(list.map(offTotUsd)),
    usdReceived: sum(list.map(receivedTotUsd)),
    newMembers: sum(list.map((s) => s.new_members)),
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
    offering_1_usd: Number(r.offering_1_usd) || 0,
    offering_2_usd: Number(r.offering_2_usd) || 0,
    new_members: Number(r.new_members) || 0,
    offering_special: Number(r.offering_special) || 0,
    offering_special_usd: Number(r.offering_special_usd) || 0,
    offering_special_note: String(r.offering_special_note ?? ''),
    pledge: Number(r.pledge) || 0,
    pledge_usd: Number(r.pledge_usd) || 0,
    tithe: Number(r.tithe) || 0,
    tithe_usd: Number(r.tithe_usd) || 0,
  }
}
export const SERVICE_COLUMNS = 'service_date, men, women, children, offering_1, offering_2, offering_1_usd, offering_2_usd, new_members, offering_special, offering_special_usd, offering_special_note, pledge, pledge_usd, tithe, tithe_usd'
