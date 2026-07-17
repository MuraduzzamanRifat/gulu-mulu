import Link from 'next/link'
import {
  Camera,
  CirclePlay,
  MessageCircle,
  Music2,
  ThumbsUp,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Wordmark } from './site-header'

/**
 * Policy links resolve to the CMS `Page` rows (prisma model Page) rendered at
 * /pages/<slug> — nothing here is hardcoded copy.
 */
const POLICY_LINKS = [
  { label: 'Return & Refund Policy', href: '/pages/return-refund-policy' },
  { label: 'Exchange Policy', href: '/pages/exchange-policy' },
  { label: 'Shipping & Delivery Policy', href: '/pages/shipping-delivery-policy' },
  { label: 'Cancellation Policy', href: '/pages/cancellation-policy' },
  { label: 'Privacy Policy', href: '/pages/privacy-policy' },
  { label: 'Terms & Conditions', href: '/pages/terms-conditions' },
] as const

/**
 * lucide-react 1.x ships no brand marks, so each social channel gets the closest
 * semantic glyph and keeps its name as the visible label.
 */
const SOCIAL_LINKS: { label: string; icon: LucideIcon }[] = [
  { label: 'Facebook', icon: ThumbsUp },
  { label: 'Instagram', icon: Camera },
  { label: 'TikTok', icon: Music2 },
  { label: 'YouTube', icon: CirclePlay },
  { label: 'WhatsApp', icon: MessageCircle },
]

const PAYMENT_CHIPS = ['SSLCommerz', 'bKash', 'Nagad', 'Cash on Delivery'] as const

/*
 * min-h-11: a footer link was a 28px tall tap target stacked directly on the next one.
 * The ring is not decoration — `outline-hidden` with only a colour swap left the focused
 * link looking exactly like a hovered one, which is a colour-only focus indicator.
 */
const columnLinkClass = cn(
  'inline-flex min-h-11 items-center rounded-sm py-1 text-sm text-ink-muted transition-colors',
  'hover:text-brand-600',
  'focus-visible:outline-hidden focus-visible:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500',
)

function FooterColumn({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-sm font-semibold tracking-wide text-ink uppercase">{title}</h3>
      {children}
    </div>
  )
}

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-12 border-t border-line bg-surface-muted">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand blurb */}
          <div className="col-span-2 min-w-0 md:col-span-1">
            <Wordmark className="-ml-0.5" />
            <p className="mt-3 max-w-xs text-sm text-ink-muted">
              Bangladesh’s multi-vendor marketplace. Thousands of products from verified local
              sellers, delivered to your door — pay cash on delivery.
            </p>
          </div>

          <FooterColumn title="Policies">
            <ul>
              {POLICY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={columnLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterColumn>


          <FooterColumn title="Social">
            <ul>
              {SOCIAL_LINKS.map(({ label, icon: Icon }) => (
                <li key={label}>
                  <a href="#" className={cn(columnLinkClass, 'flex items-center gap-2')}>
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </FooterColumn>
        </div>

        {/* Payments */}
        <div className="mt-10 border-t border-line pt-6">
          <p className="mb-3 text-xs font-semibold tracking-wide text-ink-muted uppercase">
            We accept
          </p>
          <ul className="flex flex-wrap items-center gap-2">
            {PAYMENT_CHIPS.map((chip) => (
              <li
                key={chip}
                className={cn(
                  'rounded-lg border border-line bg-surface px-3 py-1.5',
                  'text-xs font-semibold text-ink-muted',
                )}
              >
                {chip}
              </li>
            ))}
          </ul>
        </div>

        {/* Copyright. text-ink-muted, not text-ink-subtle: subtle is ~3:1 on this surface and
            this row is real copy carrying a real link, not de-emphasised metadata. */}
        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Gulu Mulu. All rights reserved.</p>
          <p>
            Made in Bangladesh ·{' '}
            <Link
              href="/pages/about-us"
              className={cn(
                'inline-flex min-h-11 items-center rounded-sm transition-colors hover:text-brand-600',
                'focus-visible:outline-hidden focus-visible:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500',
              )}
            >
              About us
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
