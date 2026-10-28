'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/lib/roles'
import { requireMember } from '@/lib/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateTemporaryPassword } from '@/lib/passwords'
import { cleanName } from '@/lib/people'
import type { Role } from '@/lib/types'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const ROLES: Role[] = ['admin', 'pastor', 'usher', 'viewer']
const done = (msg: string, ok = true): never => {
  revalidatePath('/settings')
  redirect(`/settings?${ok ? 'ok' : 'error'}=${encodeURIComponent(msg)}`)
}

export async function updateChurch(formData: FormData) {
  const { supabase, church } = await requireMember(isAdmin)
  const v = (k: string) => String(formData.get(k) ?? '').trim().slice(0, 120) || null
  const name = v('name')
  if (!name) done('The assembly needs a name.', false)
  const { error } = await supabase
    .from('churches')
    .update({ name, pastor_name: v('pastor_name'), region: v('region'), district: v('district'), area: v('area') })
    .eq('id', church.id)
  if (error) done(error.message, false)
  revalidatePath('/', 'layout')
  done('Assembly details saved.')
}

export async function addRecipient(formData: FormData) {
  const { supabase, church } = await requireMember(isAdmin)
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!EMAIL.test(email)) done('Enter a full email address, like name@yourchurch.org.', false)
  const { count } = await supabase.from('email_recipients').select('email', { count: 'exact', head: true }).eq('church_id', church.id)
  if ((count ?? 0) >= 10) done('You can add up to 10 addresses.', false)
  const { error } = await supabase.from('email_recipients').insert({ church_id: church.id, email })
  if (error) done(error.code === '23505' ? 'That address is already on the list.' : error.message, false)
  done(`${email} will get the Sunday email.`)
}

export async function removeRecipient(formData: FormData) {
  const { supabase, church } = await requireMember(isAdmin)
  const email = String(formData.get('email') ?? '')
  await supabase.from('email_recipients').delete().eq('church_id', church.id).eq('email', email)
  done(`${email} removed.`)
}

export async function changeRole(formData: FormData) {
  const { supabase, user, church } = await requireMember(isAdmin)
  const userId = String(formData.get('user_id') ?? '')
  const role = String(formData.get('role') ?? '') as Role
  if (!ROLES.includes(role)) done('Pick a role.', false)
  if (userId === user.id && role !== 'admin') done("You can't remove your own admin role. Ask another admin.", false)
  const { error } = await supabase.from('memberships').update({ role }).eq('church_id', church.id).eq('user_id', userId)
  if (error) done(error.message, false)
  done('Role updated.')
}

export async function removeMember(formData: FormData) {
  const { supabase, user, church } = await requireMember(isAdmin)
  const userId = String(formData.get('user_id') ?? '')
  if (userId === user.id) done("You can't remove yourself.", false)
  const { error } = await supabase.from('memberships').delete().eq('church_id', church.id).eq('user_id', userId)
  if (error) done(error.message, false)
  done('Removed from the team. Their account can no longer open this church.')
}

export type TeamState = { ok: boolean; message: string; email?: string; tempPassword?: string } | null

/** Create an account with a one-time password and add it to the team. The password is returned once, never stored by the app. */
export async function addPerson(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const { supabase, church } = await requireMember(isAdmin)
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const role = String(formData.get('role') ?? 'usher') as Role
  const first = cleanName(formData.get('first_name'))
  const last = cleanName(formData.get('last_name'))
  if (!first || !last) return { ok: false, message: 'Enter a first and last name (up to 60 characters each).' }
  if (!EMAIL.test(email)) return { ok: false, message: 'Enter a full email address.' }
  if (!ROLES.includes(role)) return { ok: false, message: 'Pick a role.' }

  const admin = createAdminClient()
  const tempPassword = generateTemporaryPassword()
  const created = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    app_metadata: { must_change_password: true },
  })

  let userId = created.data.user?.id ?? null
  let existing = false
  if (!userId) {
    // The address may already have an account (e.g. added before). Find it, but don't touch its password.
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
    userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null
    existing = !!userId
    if (!userId) return { ok: false, message: `Could not create the account. ${created.error?.message ?? ''}`.trim() }
  }

  const { data: already } = await supabase.from('memberships').select('user_id').eq('church_id', church.id).eq('user_id', userId).maybeSingle()
  if (already) return { ok: false, message: `${email} is already on the team. Use Reset password if they can't sign in.` }

  const { error } = await supabase.from('memberships').insert({ church_id: church.id, user_id: userId, role })
  if (error) return { ok: false, message: error.message }
  const { error: nameErr } = await supabase.from('profiles').upsert({ user_id: userId, first_name: first, last_name: last, updated_at: new Date().toISOString() })
  if (nameErr) console.error('[add person] name not saved', nameErr.message)
  revalidatePath('/settings')
  return existing
    ? { ok: true, email, message: `${email} already had an account and has been added. If they don't know their password, click Reset password next to their name.` }
    : { ok: true, email, tempPassword, message: `${email} added. Give them this temporary password in person or by text. They'll choose their own when they first sign in.` }
}

/** Give a team member a new one-time password (e.g. they forgot theirs). */
export async function resetPassword(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const { supabase, user, church } = await requireMember(isAdmin)
  const userId = String(formData.get('user_id') ?? '')
  if (userId === user.id) return { ok: false, message: 'Change your own password in My account.' }
  const { data: member } = await supabase.from('memberships').select('user_id').eq('church_id', church.id).eq('user_id', userId).maybeSingle()
  if (!member) return { ok: false, message: 'That person is not on this team.' }

  const admin = createAdminClient()
  const tempPassword = generateTemporaryPassword()
  const { data, error } = await admin.auth.admin.updateUserById(userId, { password: tempPassword, app_metadata: { must_change_password: true } })
  if (error) return { ok: false, message: `Could not reset the password. ${error.message}` }
  return { ok: true, email: data.user?.email ?? '', tempPassword, message: 'New temporary password. Give it to them in person or by text. Their old password no longer works.' }
}

/** Admin edits a team member's name. */
export async function updateMemberName(formData: FormData) {
  const { supabase, church } = await requireMember(isAdmin)
  const userId = String(formData.get('user_id') ?? '')
  const first = cleanName(formData.get('first_name'))
  const last = cleanName(formData.get('last_name'))
  if (!first || !last) done('Enter a first and last name (up to 60 characters each).', false)
  const { data: member } = await supabase.from('memberships').select('user_id').eq('church_id', church.id).eq('user_id', userId).maybeSingle()
  if (!member) done('That person is not on this team.', false)
  const { error } = await supabase.from('profiles').upsert({ user_id: userId, first_name: first, last_name: last, updated_at: new Date().toISOString() })
  if (error) done(error.message, false)
  done('Name saved.')
}
