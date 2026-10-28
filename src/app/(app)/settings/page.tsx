import { ROLE_LABEL, isAdmin } from '@/lib/roles'
import { requireMember } from '@/lib/session'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Role } from '@/lib/types'
import { displayName } from '@/lib/people'
import { addRecipient, changeRole, removeMember, removeRecipient, updateChurch, updateMemberName } from './actions'
import { AddPersonForm, ResetPasswordButton } from './TeamTools'

const ROLE_HELP: Record<Role, string> = {
  admin: 'Everything, including settings and the team',
  pastor: 'Sundays, monthly records and reports',
  usher: 'Enter Sundays and see trends',
  viewer: 'See Sundays and trends only',
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { supabase, user, church } = await requireMember(isAdmin)
  const sp = await searchParams
  const [{ data: recipients }, { data: members }] = await Promise.all([
    supabase.from('email_recipients').select('email').eq('church_id', church.id).order('email'),
    supabase.from('memberships').select('user_id, role').eq('church_id', church.id),
  ])
  const ids = (members ?? []).map((m) => m.user_id as string)
  const { data: profileRows } = ids.length ? await supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', ids) : { data: [] }
  const profiles = new Map<string, { first_name: string; last_name: string }>((profileRows ?? []).map((p): [string, { first_name: string; last_name: string }] => [p.user_id, p]))
  let emails = new Map<string, string>()
  try {
    const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 })
    emails = new Map<string, string>((data?.users ?? []).map((u): [string, string] => [u.id, u.email ?? '']))
  } catch {
    // Service key missing: show ids instead of emails.
  }
  const fields: [keyof typeof church, string][] = [
    ['pastor_name', 'Full Name of Pastor'],
    ['name', 'Name of Assembly'],
    ['region', 'Region of Assembly'],
    ['district', 'District of Assembly'],
    ['area', 'Area of Assembly'],
  ]

  return (
    <div className="stack">
      <div>
        <h1>Settings</h1>
        <p className="lede">Assembly details, who gets the Sunday email, and who can use the app.</p>
      </div>
      {sp.ok && <p className="note ok">{sp.ok}</p>}
      {sp.error && <p className="note error">{sp.error}</p>}

      <form action={updateChurch} className="panel stack" style={{ gap: 4 }}>
        <h2>Assembly details</h2>
        <p className="hint" style={{ margin: 0 }}>Used for questions 1–5 of the quarterly form and on every PDF.</p>
        {fields.map(([k, label]) => (
          <div className="grow" key={k}>
            <label htmlFor={`c-${k}`}>{label}</label>
            <input type="text" id={`c-${k}`} name={k} defaultValue={String(church[k] ?? '')} style={{ width: 'min(300px, 55vw)' }} />
          </div>
        ))}
        <div className="toolbar"><span className="spacer" /><button className="btn primary">Save details</button></div>
      </form>

      <section className="panel">
        <h2>Sunday email</h2>
        <p className="hint" style={{ margin: '4px 0 10px' }}>Each time a Sunday is saved, the summary is emailed to these addresses. It includes the offering amounts.</p>
        <div className="echips">
          {(recipients ?? []).map((r) => (
            <form action={removeRecipient} key={r.email} className="echip">
              {r.email}
              <input type="hidden" name="email" value={r.email} />
              <button aria-label={`Remove ${r.email}`}>×</button>
            </form>
          ))}
          {!recipients?.length && <span className="hint">No one yet. Add an address below.</span>}
        </div>
        <form action={addRecipient} className="addform">
          <input type="email" name="email" placeholder="name@yourchurch.org" aria-label="Add an email address" required />
          <button className="btn small">Add</button>
        </form>
      </section>

      <section className="panel">
        <h2>Team</h2>
        <p className="hint" style={{ margin: '4px 0 10px' }}>People sign in with their email and password. Only people listed here can open the app. New people and password resets get a one-time password, and they choose their own when they sign in.</p>
        {(members ?? []).map((m) => (
          <div className="grow" key={m.user_id}>
            <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <b>{displayName(profiles.get(m.user_id), emails.get(m.user_id) || m.user_id)}</b>
              {m.user_id === user.id && <span className="hint"> (you)</span>}
              {!profiles.get(m.user_id)?.first_name && <span className="pill warn" style={{ marginLeft: 6 }}>Add name</span>}
              <div className="hint">{emails.get(m.user_id)} · {ROLE_HELP[m.role as Role]}</div>
              <details className="namedit">
                <summary className="link">Edit name</summary>
                <form action={updateMemberName} className="addform">
                  <input type="hidden" name="user_id" value={m.user_id} />
                  <input type="text" name="first_name" aria-label="First name" placeholder="First name" defaultValue={profiles.get(m.user_id)?.first_name ?? ''} required maxLength={60} />
                  <input type="text" name="last_name" aria-label="Last name" placeholder="Last name" defaultValue={profiles.get(m.user_id)?.last_name ?? ''} required maxLength={60} />
                  <button className="btn small">Save name</button>
                </form>
              </details>
            </div>
            <div className="toolbar">
              <form action={changeRole} className="toolbar">
                <input type="hidden" name="user_id" value={m.user_id} />
                <select name="role" defaultValue={m.role} aria-label="Role">
                  {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
                <button className="btn small">Update</button>
              </form>
              {m.user_id !== user.id && <ResetPasswordButton userId={m.user_id} email={emails.get(m.user_id) || ''} />}
              {m.user_id !== user.id && (
                <form action={removeMember}>
                  <input type="hidden" name="user_id" value={m.user_id} />
                  <button className="btn small danger">Remove</button>
                </form>
              )}
            </div>
          </div>
        ))}
        <AddPersonForm roles={(Object.keys(ROLE_LABEL) as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
      </section>
    </div>
  )
}
