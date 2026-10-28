import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from './supabase/server'
import type { Church, Role } from './types'

/** The signed-in user, their role and their church. Redirects when missing. */
export async function requireMember(check?: (r: Role) => boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  // People signing in with a temporary password must choose their own first.
  if (user.app_metadata?.must_change_password) redirect('/change-password')

  const { data: m } = await supabase
    .from('memberships')
    .select('role, church:churches(id, name, pastor_name, region, district, area, time_zone)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!m || !m.church) redirect('/not-set-up')

  const role = m.role as Role
  if (check && !check(role)) redirect('/sunday')
  return { supabase, user, role, church: m.church as unknown as Church }
}
