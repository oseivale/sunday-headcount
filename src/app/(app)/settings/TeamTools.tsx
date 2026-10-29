'use client'

import { useActionState, useState } from 'react'
import { addPerson, resetPassword, type TeamState } from './actions'

function TempPassword({ state }: { state: NonNullable<TeamState> }) {
  const [copied, setCopied] = useState(false)
  if (!state.tempPassword) return <p className={`note ${state.ok ? 'ok' : 'error'}`} role="status">{state.message}</p>
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.tempPassword!)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="temp" role="status">
      <span className="hint" style={{ color: 'var(--ink)' }}>{state.message}</span>
      <div className="toolbar">
        <span className="hint">{state.email}</span>
        <code>{state.tempPassword}</code>
        <button type="button" className="btn small" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <span className="hint">This is shown once. If it&apos;s lost, use Reset password again.</span>
    </div>
  )
}

export function AddPersonForm({ roles }: { roles: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(addPerson, null)
  return (
    <div className="addperson">
      <h3>Add a person</h3>
      <form action={action} className="personform">
        <input type="text" name="first_name" placeholder="First name" aria-label="First name" required maxLength={60} autoComplete="off" />
        <input type="text" name="last_name" placeholder="Last name" aria-label="Last name" required maxLength={60} autoComplete="off" />
        <input type="email" name="email" placeholder="usher@example.com" aria-label="Email of the person to add" required autoComplete="off" />
        <select name="role" defaultValue="usher" aria-label="Role for the new person">
          {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button className="btn primary full" disabled={pending}>{pending ? 'Adding…' : 'Add person'}</button>
      </form>
      {state && <TempPassword state={state} />}
    </div>
  )
}

export function ResetPasswordButton({ userId, email }: { userId: string; email: string }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(resetPassword, null)
  const [confirming, setConfirming] = useState(false)
  return (
    <div className={confirming || state ? 'resetbox open' : 'resetbox'}>
      {!confirming && !state && <button type="button" className="btn" onClick={() => setConfirming(true)}>Reset password</button>}
      {confirming && !state && (
        <form action={action} className="confirmreset">
          <input type="hidden" name="user_id" value={userId} />
          <span className="hint">Reset {email || 'this person'}&apos;s password?</span>
          <button className="btn small danger" disabled={pending}>{pending ? 'Resetting…' : 'Yes, reset'}</button>
          <button type="button" className="btn small" onClick={() => setConfirming(false)}>Cancel</button>
        </form>
      )}
      {state && <TempPassword state={state} />}
    </div>
  )
}
