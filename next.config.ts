import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Nodemailer runs on the Node.js server only; don't bundle it.
  serverExternalPackages: ['nodemailer'],
}

export default nextConfig
