import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { canReport, isAdmin } from '@/lib/roles'
import { requireMember } from '@/lib/session'

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { role, church } = await requireMember()
  const items = [
    { href: '/sunday', label: 'Sunday' },
    { href: '/trends', label: 'Trends' },
  ]
  if (canReport(role)) items.push({ href: '/monthly', label: 'Monthly' }, { href: '/reports', label: 'Reports' })
  if (isAdmin(role)) items.push({ href: '/settings', label: 'Settings' })
  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="hrow">
            <Link href="/sunday" className="brandmark" aria-label="Sunday Headcount home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-white.png" alt="" width={239} height={193} />
              <span className="brand">
                Sunday Headcount<small>{church.name}</small>
              </span>
            </Link>
            <div className="toolbar" style={{ gap: 14 }}>
              <Link href="/account" className="link">My account</Link>
              <form action="/auth/signout" method="post">
                <button className="link">Sign out</button>
              </form>
            </div>
          </div>
          <Nav items={items} />
        </div>
      </header>
      <main className="wrap">{children}</main>
    </>
  )
}
