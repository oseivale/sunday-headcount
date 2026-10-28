'use server'

import { revalidatePath } from 'next/cache'
import { isISODate, parsePeriod } from '@/lib/dates'
import { findReport } from '@/lib/reports/registry'
import type { Answers } from '@/lib/reports/types'
import { canReport, isAdmin } from '@/lib/roles'
import { requireMember } from '@/lib/session'

export type ReportPayload = {
  answers: Answers
  signedInitials: string
  signedOn: string
  supervisorName: string
}

export async function saveReport(templateKey: string, periodKey: string, payload: ReportPayload): Promise<{ ok: boolean; error?: string; savedAt?: string }> {
  const { supabase, user, church, role } = await requireMember(canReport)
  const tpl = findReport(templateKey)
  if (!tpl || !tpl.roles.includes(role)) return { ok: false, error: 'You cannot edit this report.' }
  if (!parsePeriod(periodKey)) return { ok: false, error: 'Unknown period.' }
  if (JSON.stringify(payload.answers).length > 50_000) return { ok: false, error: 'The answers are too long to save.' }
  const savedAt = new Date().toISOString()
  const { error } = await supabase.from('report_submissions').upsert(
    {
      church_id: church.id,
      template_key: templateKey,
      period_key: periodKey,
      answers: payload.answers,
      signed_initials: payload.signedInitials.trim().slice(0, 12) || null,
      signed_on: isISODate(payload.signedOn) ? payload.signedOn : null,
      supervisor_name: payload.supervisorName.trim().slice(0, 120) || null,
      updated_by: user.id,
      updated_at: savedAt,
    },
    { onConflict: 'church_id,template_key,period_key' },
  )
  if (error) return { ok: false, error: error.message }
  revalidatePath('/reports')
  return { ok: true, savedAt }
}

const ASSEMBLY_FIELDS = ['pastor_name', 'name', 'region', 'district', 'area'] as const

export async function updateAssemblyDetail(field: string, value: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, church, role } = await requireMember()
  if (!isAdmin(role)) return { ok: false, error: 'Only admins can change the assembly details.' }
  if (!(ASSEMBLY_FIELDS as readonly string[]).includes(field)) return { ok: false, error: 'Unknown field.' }
  const v = value.trim().slice(0, 120)
  if (field === 'name' && !v) return { ok: false, error: 'The assembly needs a name.' }
  const { error } = await supabase.from('churches').update({ [field]: v || null }).eq('id', church.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/', 'layout')
  return { ok: true }
}
