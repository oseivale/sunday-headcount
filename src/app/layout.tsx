import type { Metadata, Viewport } from 'next'
// Fonts are bundled from npm (Fontsource) and served from this site,
// so the build never has to download them from Google.
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import '@fontsource/source-sans-3/700.css'
import './globals.css'

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
    <html lang="en-CA">
      <body>{children}</body>
    </html>
  )
}
