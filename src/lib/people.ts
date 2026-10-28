export type Profile = { first_name: string; last_name: string }

/** "Kwame Asante", or the email when no name has been entered yet. */
export function displayName(p: Partial<Profile> | null | undefined, email?: string | null) {
  const name = `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim()
  return name || email || 'Unknown user'
}

/** Trim and length-check a name field. Returns null when invalid. */
export function cleanName(v: unknown) {
  const s = String(v ?? '').trim().replace(/\s+/g, ' ')
  return s.length >= 1 && s.length <= 60 ? s : null
}
