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
            <div className="toolbar hdractions">
              <Link href="/account" className="link hdrlink" aria-label="My account" title="My account">
                <svg className="hdricon" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
                </svg>
                <span className="hdrlabel">My account</span>
                <span className="hdrshort" aria-hidden="true">My account</span>
              </Link>
              <form action="/auth/signout" method="post">
                <button className="link hdrlink" aria-label="Sign out" title="Sign out">
                  <svg className="hdricon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
                    <path d="M10 8l-4 4 4 4" />
                    <path d="M6 12h10" />
                  </svg>
                  <span className="hdrlabel">Sign out</span>
                  <span className="hdrshort" aria-hidden="true">Log out</span>
                </button>
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
