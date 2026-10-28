// Rescue tool: set the password of an existing user directly with the service key.
// Use it when the only admin is locked out. Everyone else gets a reset from Settings → Team.
// Usage (from the project folder):
//   node --env-file=.env.local scripts/set-test-password.mjs you@example.com 'a-new-long-password'
import { createClient } from '@supabase/supabase-js'

const [email, password] = process.argv.slice(2)
if (!email || !password) {
  console.error("Usage: node --env-file=.env.local scripts/set-test-password.mjs you@example.com 'a-new-long-password'")
  process.exit(1)
}
if (password.length < 12) {
  console.error('Use a password of at least 12 characters.')
  process.exit(1)
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local')
  process.exit(1)
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
if (error) {
  console.error('Could not list users:', error.message)
  process.exit(1)
}
const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
if (!user) {
  console.error(`No user with the email ${email}. Create them in Supabase → Authentication → Users first.`)
  process.exit(1)
}
const { error: upd } = await admin.auth.admin.updateUserById(user.id, {
  password,
  email_confirm: true,
  app_metadata: { must_change_password: false },
})
if (upd) {
  console.error('Could not set the password:', upd.message)
  process.exit(1)
}
console.log(`Password set for ${email}. Sign in on the login page.`)
