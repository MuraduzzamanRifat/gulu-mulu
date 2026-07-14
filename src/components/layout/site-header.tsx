import Link from 'next/link'
import { BadgePercent, Clock, Heart, Search, ShoppingCart, Truck, Undo2 } from 'lucide-react'

import { buttonVariants, Input } from '@/components/ui'
import type { User } from '@/generated/prisma/client'
import { cn } from '@/lib/utils'

import { AccountMenu, type AccountMenuUser } from './account-menu'
import { CategoryMenu } from './category-menu'
import { MobileMenu } from './mobile-menu'
import type { CategoryNode } from './shell-data'

export interface SiteHeaderProps {
  categories: CategoryNode[]
  cartCount: number
  user: User | null
}

const TRUST_POINTS = [
  { icon: Truck, label: 'Cash on Delivery' },
  { icon: Undo2, label: 'Instant Return' },
  { icon: Clock, label: 'Delivery Within 48hrs' },
  { icon: BadgePercent, label: 'Best Price Deal' },
] as const

/** The brand wordmark. Deliberately typographic — no logo asset to 404. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Gulu Mulu — home"
      className={cn(
        'group inline-flex shrink-0 items-baseline gap-1 rounded-lg px-0.5',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
        className,
      )}
    >
      <span className="text-xl font-extrabold tracking-tight text-brand-600 sm:text-2xl">Gulu</span>
      <span className="relative text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
        Mulu
        <span
          aria-hidden="true"
          className="absolute -right-1.5 bottom-1 size-1.5 rounded-full bg-accent-500"
        />
      </span>
    </Link>
  )
}

/**
 * The header's search box. A plain GET form — it works with zero JavaScript.
 * Rendered twice (desktop row + mobile row), hence the explicit `id` so the two
 * label/field pairs never collide.
 */
function SearchForm({ id, className }: { id: string; className?: string }) {
  return (
    <form
      action="/products/search"
      method="get"
      role="search"
      className={cn('relative flex items-center', className)}
    >
      <label htmlFor={id} className="sr-only">
        Search products
      </label>
      <Input
        id={id}
        name="search"
        type="search"
        icon={Search}
        autoComplete="off"
        placeholder="Search for products, brands and more…"
        containerClassName="w-full"
        className="h-11 rounded-full border-line bg-surface-muted pr-24 pl-9 focus-visible:bg-surface"
      />
      <button
        type="submit"
        className={cn(
          'absolute top-1 right-1 bottom-1 inline-flex cursor-pointer items-center rounded-full bg-brand-500 px-4',
          'text-sm font-semibold text-white transition-colors',
          'hover:bg-brand-600 active:bg-brand-700',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
        )}
      >
        Search
      </button>
    </form>
  )
}

function CartButton({ count }: { count: number }) {
  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart'}
      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative')}
    >
      <ShoppingCart aria-hidden="true" />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-1.5 right-1.5 grid min-w-4.5 place-items-center rounded-full',
            'bg-brand-500 px-1 text-[0.625rem] leading-4 font-bold text-white tabular-nums',
            'ring-2 ring-surface',
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  )
}

/**
 * The storefront header: trust strip, wordmark, mega-menu, search, and the
 * cart / wishlist / account cluster. Server Component — the only client bits are
 * the three menus, which own their own open/close state.
 */
export function SiteHeader({ categories, cartCount, user }: SiteHeaderProps) {
  const accountUser: AccountMenuUser | null = user
    ? { name: user.name, phone: user.phone, role: user.role }
    : null

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-sm supports-[backdrop-filter]:bg-surface/80">
      {/* Trust strip — desktop only; on mobile the space is worth more to the search box. */}
      <div className="hidden border-b border-line bg-surface-muted md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-6 px-4 py-1.5 sm:px-6 lg:justify-between lg:gap-8 lg:px-8">
          {TRUST_POINTS.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted"
            >
              <Icon className="size-3.5 shrink-0 text-brand-500" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Main bar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-2 md:gap-4">
          <MobileMenu categories={categories} user={accountUser} />

          <Wordmark />

          <CategoryMenu categories={categories} className="hidden md:block" />

          <SearchForm id="site-search-desktop" className="hidden flex-1 md:flex" />

          {/* gap-2: these are the most-tapped controls on the site and they sit on every
              page — 2px apart, a thumb aimed at the cart lands on the account menu. */}
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Link
              href="/account/wishlist"
              aria-label="Wishlist"
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'hidden sm:inline-flex')}
            >
              <Heart aria-hidden="true" />
            </Link>

            <CartButton count={cartCount} />

            {accountUser ? (
              <AccountMenu user={accountUser} />
            ) : (
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'ml-1 h-9 px-4')}
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        {/* Mobile search sits on its own row — a cramped search box kills conversion. */}
        <div className="pb-3 md:hidden">
          <SearchForm id="site-search-mobile" />
        </div>
      </div>
    </header>
  )
}
