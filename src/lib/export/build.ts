// Builds the "Export all data" .zip. Used by the Settings button and by the monthly backup email
// (netlify/functions/monthly-backup.ts), so both produce the same files.
// Imports are relative and nothing here imports 'server-only', so the Netlify function can bundle it.
import type { SupabaseClient } from '@supabase/supabase-js'
import { displayName } from '../people'
import { ROLE_LABEL } from '../roles'
import type { Church, Role } from '../types'
import { toCsv } from './csv'
import { makeZip } from './zip'

type Row = Record<string, unknown>

/** Every row of a church's table, 1000 at a time (Supabase returns at most 1000 per request). */
async function all(db: SupabaseClient, table: string, churchId: string, order: string): Promise<Row[]> {
  const out: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select('*').eq('church_id', churchId).order(order).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as Row[]))
    if (!data || data.length < 1000) return out
  }
}

export type ExportResult = { zip: Buffer; filename: string; files: string[]; sundays: number }

/**
 * @param db      reads the church's data: the signed-in admin's client (RLS applies) or the service client.
 * @param adminDb service client, only used to look up people's email addresses. Optional.
 * @param by      who asked for the export: a user id, or a label such as "Monthly backup".
 */
export async function buildExport(db: SupabaseClient, adminDb: SupabaseClient | null, church: Church, by: { userId?: string; label?: string }): Promise<ExportResult> {
  const [services, monthly, reports, members, recipients, emailLog, audit] = await Promise.all([
    all(db, 'services', church.id, 'service_date'),
    all(db, 'monthly_records', church.id, 'month'),
    all(db, 'report_submissions', church.id, 'period_key'),
    all(db, 'memberships', church.id, 'created_at'),
    all(db, 'email_recipients', church.id, 'email'),
    all(db, 'email_log', church.id, 'created_at'),
    all(db, 'audit_log', church.id, 'id'),
  ])

  // Names and emails, so the files say who did what instead of showing ids.
  const ids = new Set<string>(members.map((m) => String(m.user_id)))
  if (by.userId) ids.add(by.userId)
  for (const r of [...services, ...monthly, ...reports]) for (const k of ['created_by', 'updated_by']) if (r[k]) ids.add(String(r[k]))
  for (const a of audit) if (a.user_id) ids.add(String(a.user_id))
  const { data: profileRows } = ids.size ? await db.from('profiles').select('user_id, first_name, last_name').in('user_id', [...ids]) : { data: [] }
  const profiles = new Map((profileRows ?? []).map((p) => [String(p.user_id), p]))
  let emails = new Map<string, string>()
  if (adminDb) {
    try {
      const { data } = await adminDb.auth.admin.listUsers({ perPage: 1000 })
      emails = new Map((data?.users ?? []).map((u): [string, string] => [u.id, u.email ?? '']))
    } catch {
      // Names only.
    }
  }
  const who = (id: unknown) => (id ? displayName(profiles.get(String(id)), emails.get(String(id)) || String(id)) : '')

  const exportedAt = new Date()
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: church.time_zone }).format(exportedAt) // YYYY-MM-DD

  const sundayCols = [
    'service_date', 'kind', 'men', 'women', 'children', 'new_members',
    'offering_1', 'offering_1_usd', 'offering_2', 'offering_2_usd', 'offering_special', 'offering_special_usd', 'offering_special_note',
    'etransfer', 'tithe', 'tithe_usd', 'pledge', 'pledge_usd',
  ]
  const files = [
    {
      name: 'README.txt',
      content: [
        `Sunday Headcount export for ${church.name}`,
        `Exported ${exportedAt.toISOString()} by ${by.userId ? who(by.userId) : by.label ?? 'Sunday Headcount'}.`,
        '',
        "These files contain offering amounts and the team's email addresses. Store them somewhere private.",
        'Amounts are in the currency named by the column (no suffix = CAD). Dates are YYYY-MM-DD; times are UTC.',
        '',
        'sundays.csv            one row per Sunday: attendance, offerings, tithe, pledge, e-transfer',
        'monthly_records.csv    fiscal obligations per month (SSNIT, Tier 2, ...)',
        'reports.csv            each quarterly report: signature details and every answer (answers_json)',
        'report_answers.csv     the same answers, one per row',
        'team.csv               who can use the app and their role',
        'email_recipients.csv   who receives the Sunday email',
        'email_log.csv          every email sent or failed',
        'audit_log.csv          every change made in the app, with the row before and after',
        'church.csv             assembly details',
        '',
      ].join('\r\n'),
    },
    {
      name: 'sundays.csv',
      content: toCsv(
        [...sundayCols, 'created_by', 'created_at', 'updated_by', 'updated_at'],
        services.map((s) => [...sundayCols.map((c) => s[c] ?? ''), who(s.created_by), s.created_at, who(s.updated_by), s.updated_at]),
      ),
    },
    {
      name: 'monthly_records.csv',
      content: toCsv(['month', 'obligation', 'status', 'updated_by', 'updated_at'], monthly.map((m) => [String(m.month).slice(0, 7), m.obligation, m.status, who(m.updated_by), m.updated_at])),
    },
    {
      name: 'reports.csv',
      content: toCsv(
        ['template', 'period', 'signed_initials', 'signed_on', 'supervisor_name', 'updated_by', 'updated_at', 'answers_json'],
        reports.map((r) => [r.template_key, r.period_key, r.signed_initials, r.signed_on, r.supervisor_name, who(r.updated_by), r.updated_at, r.answers ?? {}]),
      ),
    },
    {
      name: 'report_answers.csv',
      content: toCsv(
        ['template', 'period', 'question', 'answer'],
        reports.flatMap((r) => Object.entries((r.answers ?? {}) as Row).map(([k, v]) => [r.template_key, r.period_key, k, v])),
      ),
    },
    {
      name: 'team.csv',
      content: toCsv(
        ['name', 'email', 'role', 'added'],
        members.map((m) => [who(m.user_id), emails.get(String(m.user_id)) ?? '', ROLE_LABEL[m.role as Role] ?? m.role, m.created_at]),
      ),
    },
    { name: 'email_recipients.csv', content: toCsv(['email', 'added'], recipients.map((r) => [r.email, r.created_at])) },
    {
      name: 'email_log.csv',
      content: toCsv(['sent_at', 'status', 'subject', 'recipients', 'error'], emailLog.map((e) => [e.created_at, e.status, e.subject, ((e.recipients as string[]) ?? []).join('; '), e.error])),
    },
    {
      name: 'audit_log.csv',
      content: toCsv(['at', 'who', 'table', 'action', 'before_json', 'after_json'], audit.map((a) => [a.at, a.user_id ? who(a.user_id) : '', a.table_name, a.action, a.old_row, a.new_row])),
    },
    {
      name: 'church.csv',
      content: toCsv(['name', 'pastor_name', 'region', 'district', 'area', 'time_zone'], [[church.name, church.pastor_name, church.region, church.district, church.area, church.time_zone]]),
    },
  ]

  return {
    zip: makeZip(files, exportedAt),
    filename: `sunday-headcount-export-${day}.zip`,
    files: files.map((f) => f.name),
    sundays: services.length,
  }
}
