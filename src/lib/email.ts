import 'server-only'
import nodemailer, { type Transporter } from 'nodemailer'
import { createAdminClient } from './supabase/admin'
import { sundayMessage, sundaySubject } from './message'
import type { Service } from './types'

export type EmailOutcome = { sent: number; note?: string }

let transporter: Transporter | null = null

/** One SMTP connection setup per server instance, built from the SMTP_* settings. */
function getTransport(): Transporter | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  if (!transporter) {
    const port = Number(SMTP_PORT || 465)
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465, // 465 = TLS from the start; 587 upgrades with STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    })
  }
  return transporter
}

/** Email the Sunday summary to the church's recipient list and log the attempt. */
export type SavedBy = { name: string; timeZone: string }

/** The line under the summary: who saved it and when, in the church's time zone. */
function savedByLine(by: SavedBy, updated: boolean) {
  const when = new Intl.DateTimeFormat('en-CA', { timeZone: by.timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
  return `${updated ? 'Updated' : 'Saved'} by ${by.name} on ${when} in Sunday Headcount.`
}

export async function sendSundayEmail(churchId: string, serviceId: string, s: Service, updated: boolean, by: SavedBy): Promise<EmailOutcome> {
  const admin = createAdminClient()
  const { data: rows } = await admin.from('email_recipients').select('email').eq('church_id', churchId)
  const to = (rows ?? []).map((r) => String(r.email))
  if (!to.length) return { sent: 0, note: 'No email recipients are set up yet.' }

  const transport = getTransport()
  if (!transport) return { sent: 0, note: 'Email is not configured on the server.' }

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER!
  const subject = sundaySubject(s, updated)
  const text = `${sundayMessage(s)}\n\n--\n${savedByLine(by, updated)}`
  let error: string | null = null
  try {
    // Recipients go in bcc so they don't see each other's addresses.
    await transport.sendMail({ from, to: from, bcc: to, subject, text })
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown email error'
  }
  await admin.from('email_log').insert({
    church_id: churchId,
    service_id: serviceId,
    recipients: to,
    subject,
    status: error ? 'failed' : 'sent',
    error,
  })
  return error ? { sent: 0, note: 'The email could not be sent. Check the SMTP settings.' } : { sent: to.length }
}
