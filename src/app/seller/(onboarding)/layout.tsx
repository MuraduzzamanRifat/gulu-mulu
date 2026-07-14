import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: { default: 'Become a seller', template: '%s | Gulu Mulu' },
  robots: { index: false, follow: false },
}

/**
 * Onboarding chrome — for /seller/register and /seller/pending.
 *
 * These two pages live OUTSIDE the (portal) group on purpose. The portal layout calls
 * `requireSeller()`, which redirects a shopper with no shop to /seller/register and an unapproved
 * shop to /seller/pending. If those pages sat inside that layout, each would redirect to itself,
 * forever. So they are siblings, and they gate themselves with `requireUser()` instead.
 */
export default function SellerOnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <Link
            href="/"
            aria-label="Gulu Mulu — home"
            className="flex items-baseline gap-1 rounded-lg px-0.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <span className="text-xl font-extrabold tracking-tight text-brand-600">Gulu</span>
            <span className="text-xl font-extrabold tracking-tight text-ink">Mulu</span>
          </Link>

          <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-semibold text-ink-muted">
            Sell with us
          </span>

          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back to shopping</span>
            <span className="sm:hidden">Shop</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">{children}</main>
    </div>
  )
}
