import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client with the service role key. It bypasses row-level security,
 * so only use it on the server for the few jobs that need it (inviting users,
 * reading the email list when sending, writing the email log).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
