import { MIN_PASSWORD_LENGTH } from '@/lib/passwords'
import { ROLE_LABEL } from '@/lib/roles'
import { requireMember } from '@/lib/session'
import { AccountForm, NameForm } from './AccountForm'

export default async function AccountPage() {
  const { supabase, user, role, church } = await requireMember()
  const { data: me } = await supabase.from('profiles').select('first_name, last_name').eq('user_id', user.id).maybeSingle()
  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <div>
        <h1>My account</h1>
        <p className="lede">{user.email} · {ROLE_LABEL[role]} at {church.name}</p>
      </div>
      <NameForm first={me?.first_name ?? ''} last={me?.last_name ?? ''} />
      <AccountForm email={user.email ?? ''} min={MIN_PASSWORD_LENGTH} />
    </div>
  )
}
