import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Inter, Noto_Sans_Bengali } from 'next/font/google'
import { Toaster } from 'sonner'

import { ThemeProvider } from '@/components/theme-provider'

import './globals.css'

// Editorial display serif for headings — the fashion-magazine voice.
const display = Playfair_Display({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
})

// Clean, legible body sans.
const body = Inter({
  variable: '--font-sans-body',
  subsets: ['latin'],
  display: 'swap',
})

// Bengali face that pairs with the Latin type — the storefront is EN/বাংলা.
const bengali = Noto_Sans_Bengali({
  variable: '--font-bengali',
  subsets: ['bengali'],
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

const DESCRIPTION =
  'Bangladesh’s women-first fashion & lifestyle destination. Shop outfits and trends — sarees, ' +
  'kurtis, modest wear, beauty and more — with cash on delivery, easy returns and 48-hour delivery.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Gulu Mulu — Women’s Fashion & Lifestyle in Bangladesh',
    template: '%s | Gulu Mulu',
  },
  description: DESCRIPTION,
  applicationName: 'Gulu Mulu',
  keywords: [
    'Gulu Mulu',
    'women fashion Bangladesh',
    'online shopping',
    'saree',
    'kurti',
    'modest fashion',
    'beauty',
    'cash on delivery',
    'Dhaka',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Gulu Mulu',
    title: 'Gulu Mulu — Women’s Fashion & Lifestyle in Bangladesh',
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'en_BD',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gulu Mulu — Women’s Fashion & Lifestyle in Bangladesh',
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFDFD' },
    { media: '(prefers-color-scheme: dark)', color: '#241019' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${bengali.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface text-ink">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster position="top-center" richColors closeButton expand={false} />
        </ThemeProvider>
      </body>
    </html>
  )
}
