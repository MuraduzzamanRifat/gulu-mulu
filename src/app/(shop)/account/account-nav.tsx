'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  /** Shorter label for the mobile tab rail, where horizontal space is the scarce resource. */
  shortLabel: string
  icon: LucideIcon
}

const ITEMS: NavItem[] = [
  { href: '/account', label: 'Dashboard', shortLabel: 'Overview', icon: LayoutDashboard },
  { href: '/account/orders', label: 'My orders', shortLabel: 'Orders', icon: Package },
  { href: '/account/wishlist', label: 'Wishlist', shortLabel: 'Wishlist', icon: Heart },
  { href: '/account/addresses', label: 'Addresses', shortLabel: 'Addresses', icon: MapPin },
  { href: '/account/profile', label: 'Profile', shortLabel: 'Profile', icon: UserRound },
]

/**
 * `/account` must only light up on `/account` itself — a `startsWith` would leave the Dashboard
 * tab lit on every child route. Everything else matches its own subtree, so
 * `/account/addresses/new` keeps "Addresses" active.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === '/account') return pathname === '/account'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export interface AccountNavProps {
  name: string | null
  phone: string
}

/**
 * The account navigation. ONE component, two shapes:
 *
 *  - phone  : a horizontally scrolling tab rail pinned above the content. Five items will not fit
 *             in 375px, so they scroll rather than wrap into a two-line stack that pushes the
 *             actual page below the fold.
 *  - lg+    : a sidebar card with the identity header and the sign-out button.
 *
 * Sign-out is a real `<form method="post" action="/logout">`, not an onClick — it survives a
 * failed JS bundle, which is exactly when you most want to be able to get out.
 */
export function AccountNav({ name, phone }: AccountNavProps) {
  const pathname = usePathname()
  const displayName = name?.trim() || 'Gulu Mulu shopper'

  return (
    <>
      {/* ---------------- Mobile: tab rail ---------------- */}
      <nav
        aria-label="Account sections"
        className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 lg:hidden"
      >
        {ITEMS.map(({ href, shortLabel, icon: Icon }) => {
          const active = isActive(pathname, href)

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative -mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3',
                'text-sm font-medium whitespace-nowrap transition-colors',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                active
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-ink-muted hover:text-ink',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {shortLabel}
            </Link>
          )
        })}
      </nav>

      {/* ---------------- Desktop: sidebar ---------------- */}
      <div className="hidden lg:block">
        <div className="rounded-card border border-line bg-surface">
          <div className="flex items-center gap-3 border-b border-line p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
              <UserRound className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
              <p className="truncate text-xs text-ink-muted tabular-nums">{phone}</p>
            </div>
          </div>

          <nav aria-label="Account sections" className="p-2">
            {ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href)

              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium',
                    'transition-colors',
                    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              )
            })}
          </nav>

          <form action="/logout" method="post" className="border-t border-line p-2">
            {/* min-h-11 keeps sign-out a 44px target, like every other control. */}
            <button
              type="submit"
              className={cn(
                'flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2.5',
                'text-sm font-medium text-danger transition-colors hover:bg-danger-soft',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-danger',
              )}
            >
              <LogOut className="size-4 shrink-0" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
