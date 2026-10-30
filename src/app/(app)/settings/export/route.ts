import { buildExport } from '@/lib/export/build'
import { isAdmin } from '@/lib/roles'
import { requireMember } from '@/lib/session'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/** Admins only: everything the church has recorded, as one .zip of CSV files. */
export async function GET() {
  const { supabase, user, church } = await requireMember(isAdmin)
  let admin = null
  try {
    admin = createAdminClient()
  } catch {
    // Service key missing: the export still works, with names instead of emails.
  }

  const out = await buildExport(supabase, admin, church, { userId: user.id })

  // Record who exported, since the file holds money amounts and email addresses.
  try {
    await admin?.from('audit_log').insert({ church_id: church.id, user_id: user.id, table_name: 'export', action: 'EXPORT', new_row: { files: out.files, sundays: out.sundays } })
  } catch {
    // Logging must not block the export.
  }

  return new Response(new Uint8Array(out.zip), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${out.filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
