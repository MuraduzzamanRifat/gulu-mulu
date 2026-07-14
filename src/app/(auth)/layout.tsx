import Link from 'next/link'
import { BadgePercent, ShieldCheck, Truck } from 'lucide-react'

import { Wordmark } from '@/components/layout/site-header'

const REASSURANCE = [
  { icon: ShieldCheck, label: 'No password — we text you a code' },
  { icon: Truck, label: 'Cash on delivery across Bangladesh' },
  { icon: BadgePercent, label: 'Member-only deals and coupons' },
] as const

/**
 * The auth shell. Deliberately NOT the storefront shell: no mega-menu, no cart, no
 * bottom tab bar. A sign-in screen with a header full of exits is a sign-in screen
 * people leave.
 *
 * On a phone this is a single centred column. On lg+ a second column appears with the
 * reassurance copy, which is the only place it belongs — it must never push the actual
 * form below the fold on the device most BD shoppers are holding.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Wordmark />
          <Link
            href="/"
            className="rounded-lg px-2 py-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Continue shopping
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1fr_26rem]">
          <section className="hidden lg:block">
            <h1 className="text-3xl font-extrabold tracking-tight text-balance text-ink xl:text-4xl">
              Everything Bangladesh shops for, from sellers you can trust.
            </h1>
            <p className="mt-4 max-w-md text-base text-pretty text-ink-muted">
              Sign in with your mobile number to track orders, save addresses and keep your
              wishlist across every device.
            </p>

            <ul className="mt-8 space-y-4">
              {REASSURANCE.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm font-medium text-ink">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </section>

          <div className="mx-auto w-full max-w-md lg:mx-0">{children}</div>
        </div>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-5 text-center text-xs text-ink-muted sm:flex-row sm:justify-between sm:text-left">
          <p>&copy; {new Date().getFullYear()} Gulu Mulu. All rights reserved.</p>
          <nav className="flex items-center gap-4">
            <Link href="/page/privacy-policy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <Link href="/page/terms" className="transition-colors hover:text-ink">
              Terms
            </Link>
            <Link href="/page/help" className="transition-colors hover:text-ink">
              Help
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
