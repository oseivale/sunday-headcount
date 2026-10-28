export type Role = 'admin' | 'pastor' | 'usher' | 'viewer'

export type Church = {
  id: string
  name: string
  pastor_name: string | null
  region: string | null
  district: string | null
  area: string | null
  time_zone: string
}

export type Service = {
  service_date: string // YYYY-MM-DD
  men: number
  women: number
  children: number
  offering_1: number // CAD
  offering_2: number // CAD
  offering_1_usd: number
  offering_2_usd: number
  offering_special: number // CAD
  offering_special_usd: number
  offering_special_note: string // e.g. "Building fund"
  pledge: number // CAD received towards pledges
  pledge_usd: number
  tithe: number // CAD
  tithe_usd: number
  new_members: number // people who joined this Sunday; already included in the counts above
}

export const OBLIGATIONS = [
  { key: 'ssnit', n: 27, label: 'SSNIT' },
  { key: 'tier2', n: 28, label: 'Tier 2' },
  { key: 'tier3', n: 29, label: 'Tier 3' },
  { key: 'paye', n: 30, label: 'PAYE' },
  { key: 'wht', n: 31, label: 'Withholding Tax' },
  { key: 'mcf', n: 34, label: 'MCF' },
] as const

export type ObligationKey = (typeof OBLIGATIONS)[number]['key']
export type ObligationStatus = 'paid' | 'not_paid' | 'na'
export const STATUS_LABEL: Record<ObligationStatus, string> = { paid: 'Paid', not_paid: 'Not paid', na: 'N/A' }

/** Monthly fiscal records keyed by 'YYYY-MM'. */
export type MonthlyRecords = Record<string, Partial<Record<ObligationKey, ObligationStatus>>>
