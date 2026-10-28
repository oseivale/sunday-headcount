'use server'

import { checkNewPassword } from '@/lib/passwords'
import { cleanName } from '@/lib/people'
import { requireMember } from '@/lib/session'
import { createAdminClient } from '@/lib/supabase/admin'

export type AccountState = { ok: boolean; message: string } | null

/** Change your own password. Asks for the current one first. */
export async function changeOwnPassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const { supabase, user } = await requireMember()
  const current = String(formData.get('current') ?? '')
  const password = String(formData.get('password') ?? '')
  const problem = checkNewPassword(password, String(formData.get('confirm') ?? ''), user.email)
  if (problem) return { ok: false, message: problem }
  if (password === current) return { ok: false, message: 'Choose a password different from the current one.' }

  const { error: wrong } = await supabase.auth.signInWithPassword({ email: user.email ?? '', password: current })
  if (wrong) return { ok: false, message: 'Your current password is not right.' }

  const { error } = await createAdminClient().auth.admin.updateUserById(user.id, { password, app_metadata: { must_change_password: false } })
  if (error) return { ok: false, message: `Could not save the password. ${error.message}` }
  return { ok: true, message: 'Password changed. Use it next time you sign in.' }
}

/** Change your own first and last name. */
export async function updateOwnName(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const { supabase, user } = await requireMember()
  const first = cleanName(formData.get('first_name'))
  const last = cleanName(formData.get('last_name'))
  if (!first || !last) return { ok: false, message: 'Enter a first and last name (up to 60 characters each).' }
  const { error } = await supabase.from('profiles').upsert({ user_id: user.id, first_name: first, last_name: last, updated_at: new Date().toISOString() })
  if (error) return { ok: false, message: `Could not save your name. ${error.message}` }
  return { ok: true, message: 'Name saved. It appears on the Sunday emails you send.' }
}
