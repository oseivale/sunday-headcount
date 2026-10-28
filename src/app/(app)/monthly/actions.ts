'use server'

import { revalidatePath } from 'next/cache'
import { canReport } from '@/lib/roles'
import { requireMember } from '@/lib/session'
import { OBLIGATIONS, type ObligationStatus } from '@/lib/types'

export async function setObligation(ym: string, key: string, status: ObligationStatus | ''): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user, church } = await requireMember(canReport)
  if (!/^\d{4}-\d{2}$/.test(ym) || !OBLIGATIONS.some((o) => o.key === key)) return { ok: false, error: 'Unknown month or obligation.' }
  const month = ym + '-01'
  const q = status
    ? supabase.from('monthly_records').upsert({ church_id: church.id, month, obligation: key, status, updated_by: user.id, updated_at: new Date().toISOString() })
    : supabase.from('monthly_records').delete().eq('church_id', church.id).eq('month', month).eq('obligation', key)
  const { error } = await q
  if (error) return { ok: false, error: error.message }
  revalidatePath('/monthly')
  revalidatePath('/reports', 'layout')
  return { ok: true }
}
