import type { Role } from '../types'

/**
 * A report the app can produce. Each group's report (the pastor's assembly form today,
 * other groups later) is one template. Answers are stored in report_submissions
 * under (template_key, period_key), so adding a template needs no database change.
 */
export type ReportTemplate = {
  key: string // used in the URL and the database, e.g. 'assembly-quarterly'
  title: string
  description: string
  group: string // who owns the report, e.g. 'Pastor', 'Youth Ministry'
  cadence: 'monthly' | 'quarterly'
  roles: Role[] // who can open and fill it
  status: 'ready' | 'planned'
}

export type Answers = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

/** One question on a form, laid out like the paper template. */
export type FormItem =
  | { sec: string }
  | { sub: string }
  | {
      n: number
      t: string
      req?: boolean
      kind: 'text' | 'number' | 'choice' | 'multi' | 'bands' | 'fiscal' | 'note'
      src: 'assembly' | 'weekly' | 'monthly' | 'quarter' | 'derived' | 'outside'
      key: string
      opts?: string[]
      yq?: [number, number]
    }

export type Question = Extract<FormItem, { n: number }>
export const isQuestion = (i: FormItem): i is Question => 'n' in i
