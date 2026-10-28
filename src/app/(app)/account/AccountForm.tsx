'use client'

import { useActionState, useEffect, useRef } from 'react'
import { changeOwnPassword, updateOwnName, type AccountState } from './actions'

export function AccountForm({ email, min }: { email: string; min: number }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(changeOwnPassword, null)
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state?.ok) form.current?.reset()
  }, [state])
  return (
    <form ref={form} action={action} className="panel stack">
      <h2>Change password</h2>
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <label htmlFor="current"><b>Current password</b></label>
      <input id="current" name="current" type="password" autoComplete="current-password" required className="pw" />
      <label htmlFor="password"><b>New password</b></label>
      <input id="password" name="password" type="password" autoComplete="new-password" minLength={min} required className="pw" />
      <span className="hint">At least {min} characters.</span>
      <label htmlFor="confirm"><b>Type the new password again</b></label>
      <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={min} required className="pw" />
      <button className="btn primary" disabled={pending}>{pending ? 'Saving…' : 'Change password'}</button>
      {state && <p className={`note ${state.ok ? 'ok' : 'error'}`} role="status">{state.message}</p>}
    </form>
  )
}

export function NameForm({ first, last }: { first: string; last: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(updateOwnName, null)
  return (
    <form action={action} className="panel stack">
      <h2>Your name</h2>
      <p className="hint" style={{ margin: 0 }}>Shown on the Sunday emails you send and in the team list.</p>
      <label htmlFor="first_name"><b>First name</b></label>
      <input id="first_name" name="first_name" type="text" autoComplete="given-name" defaultValue={first} required maxLength={60} />
      <label htmlFor="last_name"><b>Last name</b></label>
      <input id="last_name" name="last_name" type="text" autoComplete="family-name" defaultValue={last} required maxLength={60} />
      <button className="btn primary" disabled={pending}>{pending ? 'Saving…' : 'Save name'}</button>
      {state && <p className={`note ${state.ok ? 'ok' : 'error'}`} role="status">{state.message}</p>}
    </form>
  )
}
