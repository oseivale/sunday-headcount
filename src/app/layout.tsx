import type { Metadata, Viewport } from 'next'
import { Montserrat, Source_Sans_3 } from 'next/font/google'
import './globals.css'

// Montserrat for headings and the brand name; Source Sans 3 for reading text and numbers (even-width digits).
const display = Montserrat({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' })
const body = Source_Sans_3({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'Sunday Headcount',
  description: 'Sunday attendance, offerings and assembly reports',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icons/favicon-48.png', apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Headcount', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0E1F11',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-CA" className={`${body.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  )
}
