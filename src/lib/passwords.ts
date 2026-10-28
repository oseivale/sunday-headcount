import 'server-only'
import { randomInt } from 'crypto'

export const MIN_PASSWORD_LENGTH = 12

// No look-alike characters (0/O, 1/l/I), so a temporary password is easy to read out or type.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

/** A random one-time password like "k7mq-x3dp-9ftw" (12 random characters, about 59 bits). */
export function generateTemporaryPassword() {
  const groups = [0, 1, 2].map(() => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(''))
  return groups.join('-')
}

/** Returns an error message, or null when the new password is acceptable. */
export function checkNewPassword(password: string, confirm: string, email?: string | null) {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  if (password.length > 72) return 'Use 72 characters or fewer.'
  if (password !== confirm) return "The two passwords don't match."
  if (email && password.toLowerCase().includes(email.split('@')[0].toLowerCase())) return "Don't include your email name in your password."
  return null
}
