'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Nav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname()
  return (
    <nav className="tabs" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={path.startsWith(i.href) ? 'page' : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  )
}
