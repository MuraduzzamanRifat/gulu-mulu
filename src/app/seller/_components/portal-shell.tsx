'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Store,
  Wallet,
} from 'lucide-react'

import { signOutAction } from '@/components/layout/auth-actions'
import { Sheet } from '@/components/ui'
import { cn } from '@/lib/utils'

/** Only what the chrome needs. Keeps the client bundle free of the whole Seller row. */
export interface PortalShellSeller {
  businessName: string
  logoUrl: string | null
  commissionRate: number
}

export interface PortalShellProps {
  seller: PortalShellSeller
  children: React.ReactNode
}

const NAV = [
  { href: '/seller', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/seller/products', label: 'Products', icon: Package, exact: false },
  { href: '/seller/orders', label: 'Orders', icon: ReceiptText, exact: false },
  { href: '/seller/payouts', label: 'Payouts', icon: Wallet, exact: false },
] as const

function isActive(pathname: string, href: string, exact: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

/** The shop's initials, for when there is no logo — never a broken <img>. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

function ShopBadge({ seller }: { seller: PortalShellSeller }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/10 text-sm font-bold text-white">
        {seller.logoUrl ? (
          // A seller-entered URL can point at any host, so next/image (which validates against
          // remotePatterns) would 400 on it. A plain <img> is the honest choice until uploads
          // land on our own bucket.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={seller.logoUrl}
            alt=""
            className="size-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          initialsOf(seller.businessName)
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{seller.businessName}</p>
        <p className="truncate text-xs text-white/50">
          {Math.round(seller.commissionRate * 100)}% commission
        </p>
      </div>
    </div>
  )
}

const navLink = (active: boolean) =>
  cn(
    'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-400',
    '[&_svg]:size-5 [&_svg]:shrink-0',
    active
      ? 'bg-brand-500 text-white'
      : 'text-white/70 hover:bg-white/10 hover:text-white active:bg-white/15',
  )

function NavList({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Seller centre" className="space-y-1">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(pathname, href, exact)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={navLink(active)}
          >
            <Icon aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function ShellFooter() {
  return (
    <div className="space-y-1 border-t border-white/10 pt-3">
      <Link href="/" className={navLink(false)}>
        <Store aria-hidden="true" />
        Back to storefront
        <ExternalLink className="ml-auto size-3.5! text-white/40" aria-hidden="true" />
      </Link>

      <form action={signOutAction}>
        <button
          type="submit"
          className={cn(
            navLink(false),
            'w-full text-left text-white/70 hover:bg-danger/20 hover:text-white',
          )}
        >
          <LogOut aria-hidden="true" />
          Sign out
        </button>
      </form>
    </div>
  )
}

/**
 * The seller portal chrome: a dark rail that is deliberately nothing like the storefront, so it is
 * never in doubt that you have left the shop and are now running a business.
 *
 * Client component only because the nav needs `usePathname()` for the active state and the mobile
 * drawer needs open/closed state — every page rendered inside it stays a Server Component.
 */
export function PortalShell({ seller, children }: PortalShellProps) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const [lastPathname, setLastPathname] = React.useState(pathname)

  // Navigating from inside the drawer must dismiss it. Adjusted during render — an effect would
  // close it one paint too late and the new page would flash behind an open sheet.
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setOpen(false)
  }

  return (
    <div className="min-h-dvh bg-surface-muted lg:pl-64">
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-6 bg-ink p-4 lg:flex">
        <Link
          href="/"
          className="flex items-baseline gap-1 rounded-lg px-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <span className="text-lg font-extrabold tracking-tight text-brand-400">Gulu</span>
          <span className="text-lg font-extrabold tracking-tight text-white">Mulu</span>
          <span className="ml-1 text-[0.625rem] font-semibold tracking-widest text-white/40 uppercase">
            Seller
          </span>
        </Link>

        <ShopBadge seller={seller} />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavList pathname={pathname} />
        </div>

        <ShellFooter />
      </aside>

      {/* Mobile bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-ink px-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open seller menu"
          aria-expanded={open}
          className={cn(
            'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white',
            'transition-colors hover:bg-white/10',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-400',
          )}
        >
          <Menu className="size-6" aria-hidden="true" />
        </button>

        <span className="truncate text-sm font-semibold text-white">{seller.businessName}</span>

        <Link
          href="/"
          className={cn(
            'ml-auto inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white/70',
            'transition-colors hover:bg-white/10 hover:text-white',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-400',
          )}
        >
          <Store className="size-4" aria-hidden="true" />
          Storefront
        </Link>
      </header>

      {/* Mobile drawer — the shared <Sheet>, re-skinned dark to match the rail. */}
      <Sheet open={open} onOpenChange={setOpen} side="left" className="bg-ink border-white/10">
        <div className="flex h-full flex-col gap-6">
          <ShopBadge seller={seller} />
          <div className="min-h-0 flex-1">
            <NavList pathname={pathname} />
          </div>
          <ShellFooter />
        </div>
      </Sheet>

      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-10">{children}</main>
    </div>
  )
}
