import Link from 'next/link'
import {
  Heart,
  MapPin,
  Package,
  ShoppingBag,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

import { buttonVariants, EmptyState } from '@/components/ui'
import { requireUser } from '@/lib/auth'
import { formatBDT } from '@/lib/format'
import { cn } from '@/lib/utils'

import { getAccountSummary, getUserOrders } from './_queries'
import { OrderCard } from './order-card'

const RECENT_ORDER_COUNT = 3

interface StatTileProps {
  href: string
  icon: LucideIcon
  label: string
  value: string
  tone: 'brand' | 'accent' | 'success' | 'info'
}

const TONES: Record<StatTileProps['tone'], string> = {
  brand: 'bg-brand-50 text-brand-600',
  accent: 'bg-accent-100 text-accent-700',
  success: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
}

/** A stat that is also a shortcut — a number nobody can act on is just decoration. */
function StatTile({ href, icon: Icon, label, value, tone }: StatTileProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-card border border-line bg-surface p-3.5 sm:p-4',
        'transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-sm',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
      )}
    >
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', TONES[tone])}>
        <Icon className="size-5" aria-hidden="true" />
      </span>

      <span className="min-w-0">
        <span className="block text-xl font-extrabold tracking-tight text-ink tabular-nums">
          {value}
        </span>
        <span className="block truncate text-xs text-ink-muted">{label}</span>
      </span>
    </Link>
  )
}

export default async function AccountDashboardPage() {
  const user = await requireUser()

  const [summary, recentOrders] = await Promise.all([
    getAccountSummary(user.id),
    getUserOrders(user.id, RECENT_ORDER_COUNT),
  ])

  const firstName = user.name?.trim().split(/\s+/)[0]

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
          {firstName ? `Welcome back, ${firstName}` : 'Welcome to Gulu Mulu'}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {summary.totalOrders > 0
            ? 'Track your orders, manage addresses and pick up where you left off.'
            : 'You haven’t ordered anything yet — your first order will show up right here.'}
        </p>
      </header>

      <section aria-labelledby="account-stats">
        <h2 id="account-stats" className="sr-only">
          Account summary
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatTile
            href="/account/orders"
            icon={Package}
            tone="brand"
            label={summary.totalOrders === 1 ? 'Order placed' : 'Orders placed'}
            value={String(summary.totalOrders)}
          />
          <StatTile
            href="/account/orders"
            icon={Truck}
            tone="info"
            label="On the way"
            value={String(summary.activeOrders)}
          />
          <StatTile
            href="/account/wishlist"
            icon={Heart}
            tone="accent"
            label="Wishlisted"
            value={String(summary.wishlistCount)}
          />
          <StatTile
            href="/account/orders"
            icon={Wallet}
            tone="success"
            label="Total spent"
            value={formatBDT(summary.totalSpent)}
          />
        </div>
      </section>

      <section aria-labelledby="recent-orders">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <h2 id="recent-orders" className="text-base font-bold tracking-tight text-ink sm:text-lg">
            Recent orders
          </h2>

          {summary.totalOrders > 0 ? (
            <Link
              href="/account/orders"
              className="rounded-lg px-1 py-0.5 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              View all
            </Link>
          ) : null}
        </div>

        {recentOrders.length > 0 ? (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-line bg-surface">
            <EmptyState
              icon={ShoppingBag}
              title="No orders yet"
              description="Once you place an order you’ll be able to track it from here, right down to the delivery."
              action={
                // Styled <Link> — a <button> nested inside an <a> is invalid markup.
                <Link href="/" className={cn(buttonVariants({ size: 'lg' }))}>
                  Start shopping
                </Link>
              }
            />
          </div>
        )}
      </section>

      {summary.addressCount === 0 ? (
        <section
          aria-label="Add a delivery address"
          className="flex flex-col gap-3 rounded-card border border-dashed border-line-strong bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-ink-muted">
              <MapPin className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Save a delivery address</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                Add one now and checkout becomes a two-tap job next time.
              </p>
            </div>
          </div>

          <Link
            href="/account/addresses/new"
            className={cn(
              buttonVariants({ variant: 'outline', fullWidth: true }),
              'shrink-0 sm:w-auto',
            )}
          >
            Add address
          </Link>
        </section>
      ) : null}
    </div>
  )
}
