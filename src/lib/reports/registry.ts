import type { ReportTemplate } from './types'

/**
 * Every report the app knows about. To add a report for another group:
 *   1. Add an entry here (status 'planned' shows it as coming soon).
 *   2. Create its form definition next to assembly-quarterly.ts.
 *   3. Add its screen in src/app/(app)/reports/[template]/[period]/page.tsx.
 * Answers save to report_submissions with this key, so no database change is needed.
 */
export const REPORTS: ReportTemplate[] = [
  {
    key: 'assembly-quarterly',
    title: 'Assembly Reporting Form',
    description: 'Quarterly report from the pastor to the overseer and admin.',
    group: 'Pastor',
    cadence: 'quarterly',
    roles: ['admin', 'pastor'],
    status: 'ready',
  },
]

export const findReport = (key: string) => REPORTS.find((r) => r.key === key)
