'use client'

import { useActionState } from 'react'
import { setOwnPassword, type PwState } from './actions'

export function ChangePasswordForm({ email, min }: { email: string; min: number }) {
  const [state, action, pending] = useActionState<PwState, FormData>(setOwnPassword, null)
  return (
    <main className="wrap">
      <div className="login stack">
        <div>
          <h1>Choose your password</h1>
          <p className="lede">You signed in with a temporary password. Choose your own to continue. Only you will know it.</p>
        </div>
        <form action={action} className="panel stack">
          <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
          <label htmlFor="password"><b>New password</b></label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={min} required className="pw" />
          <span className="hint">At least {min} characters. A short sentence works well, e.g. three or four words you&apos;ll remember.</span>
          <label htmlFor="confirm"><b>Type it again</b></label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={min} required className="pw" />
          <button className="btn primary" disabled={pending}>{pending ? 'Saving…' : 'Save and continue'}</button>
          {state && !state.ok && <p className="note error" role="alert">{state.message}</p>}
        </form>
        <form action="/auth/signout" method="post"><button className="link">Sign out</button></form>
      </div>
    </main>
  )
}
