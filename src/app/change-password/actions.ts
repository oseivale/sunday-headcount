'use server'

import { redirect } from 'next/navigation'
import { checkNewPassword } from '@/lib/passwords'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type PwState = { ok: boolean; message: string } | null

/** First sign-in with a temporary password: the person chooses their own. */
export async function setOwnPassword(_prev: PwState, formData: FormData): Promise<PwState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const password = String(formData.get('password') ?? '')
  const problem = checkNewPassword(password, String(formData.get('confirm') ?? ''), user.email)
  if (problem) return { ok: false, message: problem }

  // Change the password through the person's own session, which keeps them signed in.
  // (Changing it with the admin API would sign them out of every session, including this one.)
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    console.error('[set password]', error.status, error.message)
    return { ok: false, message: error.code === 'same_password' ? 'Choose a password different from the temporary one.' : `Could not save the password. ${error.message}` }
  }
  // Clear the "must change" flag. Only the server can change app_metadata; this doesn't touch sessions.
  const { error: flagError } = await createAdminClient().auth.admin.updateUserById(user.id, { app_metadata: { must_change_password: false } })
  if (flagError) return { ok: false, message: `Password saved, but the account could not be updated. Try signing in again. ${flagError.message}` }
  redirect('/sunday')
}
