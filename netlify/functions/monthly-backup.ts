// Monthly backup: on the 1st of each month, email the "Export all data" .zip to BACKUP_EMAIL.
// A Netlify scheduled function: it runs only on the live (production) site, and it cannot be opened by URL.
// To test it, open Netlify > Logs & metrics > Functions > monthly-backup > Run now.
//
// Settings it needs (Netlify > Project configuration > Environment variables):
//   BACKUP_EMAIL               where the backup goes (one address, or several separated by commas)
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM (already set for the app)
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { buildExport } from '../../src/lib/export/build'
import type { Church } from '../../src/lib/types'

/** Removes quotes pasted around a value in the Netlify UI, e.g. "Sunday Headcount <x@gmail.com>". */
const unquote = (v: string | undefined) => (v ?? '').trim().replace(/^(["'])(.*)\1$/, '$2').trim()

export default async () => {
  const env = process.env
  const to = unquote(env.BACKUP_EMAIL).split(',').map((s) => s.trim()).filter(Boolean)
  if (!to.length) return console.log('monthly-backup: BACKUP_EMAIL is not set, nothing sent.')
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return console.error('monthly-backup: Supabase settings are missing.')
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return console.error('monthly-backup: SMTP settings are missing.')

  // Service key: there is no signed-in user here. This code only runs on Netlify's schedule.
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const port = Number(env.SMTP_PORT || 465)
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })
  const from = unquote(env.EMAIL_FROM) || env.SMTP_USER

  const { data: churches, error } = await db.from('churches').select('id, name, pastor_name, region, district, area, time_zone')
  if (error) return console.error('monthly-backup: could not read churches:', error.message)

  for (const church of (churches ?? []) as Church[]) {
    let status: 'sent' | 'failed' = 'sent'
    let problem: string | null = null
    let subject = `Sunday Headcount backup – ${church.name}`
    try {
      const out = await buildExport(db, db, church, { label: 'Monthly backup' })
      const month = new Intl.DateTimeFormat('en-CA', { timeZone: church.time_zone, month: 'long', year: 'numeric' }).format(new Date())
      subject = `Sunday Headcount backup – ${church.name} – ${month}`
      await transport.sendMail({
        from,
        to,
        subject,
        text: [
          `Attached is the monthly backup of everything recorded in Sunday Headcount for ${church.name} (${out.sundays} Sundays so far).`,
          '',
          'It contains offering amounts and the team\'s email addresses. Save it somewhere private, for example a folder in the church\'s Google Drive, then delete this email.',
          'Open the .zip and each .csv file opens in Excel, Numbers or Google Sheets. README.txt explains each file.',
          '',
          '--',
          'Sent automatically on the 1st of each month. To stop it, remove BACKUP_EMAIL from the Netlify environment variables.',
        ].join('\n'),
        attachments: [{ filename: out.filename, content: out.zip, contentType: 'application/zip' }],
      })
      await db.from('audit_log').insert({ church_id: church.id, user_id: null, table_name: 'export', action: 'EXPORT', new_row: { files: out.files, sundays: out.sundays, emailed_to: to } })
      console.log(`monthly-backup: sent ${out.filename} for ${church.name}`)
    } catch (e) {
      status = 'failed'
      problem = e instanceof Error ? e.message : 'Unknown error'
      console.error(`monthly-backup: failed for ${church.name}:`, problem)
    }
    await db.from('email_log').insert({ church_id: church.id, service_id: null, recipients: to, subject, status, error: problem })
  }
}

// 11:00 UTC on the 1st of every month = 7:00 am in Toronto in summer, 6:00 am in winter.
export const config = { schedule: '0 11 1 * *' }
