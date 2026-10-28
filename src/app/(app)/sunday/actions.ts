'use server'

import { revalidatePath } from 'next/cache'
import { isISODate, shortDate } from '@/lib/dates'
import { sendSundayEmail } from '@/lib/email'
import { displayName } from '@/lib/people'
import { canEnterSundays } from '@/lib/roles'
import { requireMember } from '@/lib/session'
import type { Service } from '@/lib/types'

export type SaveResult = { ok: false; error: string } | { ok: true; message: string }

const count = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 9999
const amount = (v: unknown) => typeof v === 'number' && isFinite(v) && v >= 0 && v <= 1_000_000

export async function saveSunday(input: Service): Promise<SaveResult> {
  const { supabase, user, role, church } = await requireMember()
  if (!canEnterSundays(role)) return { ok: false, error: 'You can view Sundays but not change them.' }
  if (!isISODate(input.service_date)) return { ok: false, error: 'Pick a valid date.' }
  if (![input.men, input.women, input.children].every(count)) return { ok: false, error: 'Counts must be whole numbers from 0 to 9999.' }
  if (![input.offering_1, input.offering_2, input.offering_1_usd, input.offering_2_usd, input.offering_special, input.offering_special_usd, input.pledge, input.pledge_usd, input.tithe, input.tithe_usd].every(amount))
    return { ok: false, error: 'Amounts must be 0 or more.' }
  const note = String(input.offering_special_note ?? '').trim().replace(/\s+/g, ' ')
  if (note.length > 80) return { ok: false, error: 'Keep the special offering description to 80 characters.' }
  if (!Number.isInteger(input.new_members) || input.new_members < 0 || input.new_members > 999) return { ok: false, error: 'New members must be a whole number from 0 to 999.' }

  const s: Service = {
    service_date: input.service_date,
    men: input.men,
    women: input.women,
    children: input.children,
    offering_1: Math.round(input.offering_1 * 100) / 100,
    offering_2: Math.round(input.offering_2 * 100) / 100,
    offering_1_usd: Math.round(input.offering_1_usd * 100) / 100,
    offering_2_usd: Math.round(input.offering_2_usd * 100) / 100,
    new_members: input.new_members,
    offering_special: Math.round(input.offering_special * 100) / 100,
    offering_special_usd: Math.round(input.offering_special_usd * 100) / 100,
    offering_special_note: note,
    pledge: Math.round(input.pledge * 100) / 100,
    pledge_usd: Math.round(input.pledge_usd * 100) / 100,
    tithe: Math.round(input.tithe * 100) / 100,
    tithe_usd: Math.round(input.tithe_usd * 100) / 100,
  }
  const { data: existing } = await supabase
    .from('services')
    .select('id')
    .eq('church_id', church.id)
    .eq('service_date', s.service_date)
    .eq('kind', 'sunday')
    .maybeSingle()

  const now = new Date().toISOString()
  const { data: row, error } = await supabase
    .from('services')
    .upsert(
      { church_id: church.id, kind: 'sunday', ...s, updated_by: user.id, updated_at: now, ...(existing ? {} : { created_by: user.id }) },
      { onConflict: 'church_id,service_date,kind' },
    )
    .select('id')
    .single()
  if (error || !row) return { ok: false, error: `Could not save. ${error?.message ?? ''}`.trim() }

  revalidatePath('/sunday')
  revalidatePath('/trends')
  revalidatePath('/monthly')
  revalidatePath('/reports', 'layout')

  let message = `Saved ${shortDate(s.service_date)}.`
  try {
    const { data: me } = await supabase.from('profiles').select('first_name, last_name').eq('user_id', user.id).maybeSingle()
    const mail = await sendSundayEmail(church.id, row.id, s, !!existing, { name: displayName(me, user.email), timeZone: church.time_zone })
    message += mail.sent ? ` Emailed to ${mail.sent} ${mail.sent === 1 ? 'person' : 'people'}.` : ` Not emailed: ${mail.note}`
  } catch {
    message += ' Not emailed: the email service is not set up.'
  }
  return { ok: true, message }
}
