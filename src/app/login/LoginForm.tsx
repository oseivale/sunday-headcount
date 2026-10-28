'use client'

import { useActionState } from 'react'
import { signIn, type LoginState } from './actions'

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, null)
  return (
    <main className="wrap">
      <div className="login stack">
        <div className="loginhero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-white.png" alt="Rehoboth Temple logo" width={239} height={193} />
          <h1>Sunday Headcount</h1>
          <p>Rehoboth Temple – Toronto</p>
        </div>
        <p className="lede" style={{ margin: 0 }}>Sign in with the email and password your admin set up for you.</p>
        <form action={action} className="panel stack">
          <label htmlFor="email"><b>Email</b></label>
          <input id="email" name="email" type="email" autoComplete="username" required placeholder="name@yourchurch.org" />
          <label htmlFor="password"><b>Password</b></label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="pw" />
          <button className="btn primary" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
          {state && !state.ok && <p className="note error" role="alert">{state.message}</p>}
        </form>
        <p className="hint">Forgot your password? Ask an admin to reset it. You&apos;ll get a temporary one and choose a new password when you sign in.</p>
      </div>
    </main>
  )
}
