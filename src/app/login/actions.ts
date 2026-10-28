'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type LoginState = { ok: boolean; message: string } | null

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return { ok: false, message: 'Enter your email and password.' }
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // Logged on the server only. People see one neutral message, so the form can't reveal who has an account.
    console.error('[sign in]', error.status, error.message)
    if (error.status === 429) return { ok: false, message: 'Too many attempts. Wait a few minutes and try again.' }
    return { ok: false, message: 'That email and password don’t match. Check them, or ask an admin to reset your password.' }
  }
  redirect('/sunday')
}
