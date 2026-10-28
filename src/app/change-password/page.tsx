import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MIN_PASSWORD_LENGTH } from '@/lib/passwords'
import { ChangePasswordForm } from './ChangePasswordForm'

export default async function ChangePasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!user.app_metadata?.must_change_password) redirect('/account')
  return <ChangePasswordForm email={user.email ?? ''} min={MIN_PASSWORD_LENGTH} />
}
