import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'

import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

const DESCRIPTION =
  'Bangladesh’s multi-vendor marketplace. Shop fashion, beauty, kids and home essentials from ' +
  'trusted local sellers — cash on delivery, easy returns and delivery within 48 hours.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Gulu Mulu — Online Shopping in Bangladesh',
    template: '%s | Gulu Mulu',
  },
  description: DESCRIPTION,
  applicationName: 'Gulu Mulu',
  keywords: [
    'Gulu Mulu',
    'online shopping Bangladesh',
    'marketplace',
    'cash on delivery',
    'fashion',
    'beauty',
    'Dhaka',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Gulu Mulu',
    title: 'Gulu Mulu — Online Shopping in Bangladesh',
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'en_BD',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gulu Mulu — Online Shopping in Bangladesh',
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-surface text-ink">
        {children}
        <Toaster position="top-center" richColors closeButton expand={false} />
      </body>
    </html>
  )
}
