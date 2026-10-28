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

  const { error } = await createAdminClient().auth.admin.updateUserById(user.id, {
    password,
    app_metadata: { must_change_password: false },
  })
  if (error) return { ok: false, message: `Could not save the password. ${error.message}` }
  redirect('/sunday')
}
