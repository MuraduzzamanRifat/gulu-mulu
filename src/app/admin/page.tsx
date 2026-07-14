import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Package,
  ReceiptText,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react'

import { buttonVariants, Card, EmptyState } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { formatBDT, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

import { OrderStatusChip, PaymentStatusChip } from './_components/chips'
import { PageHeader } from './_components/page-header'
import { AttentionCard, StatCard } from './_components/stat-card'
import { getAttentionCounts, getDashboard, type RecentOrder } from './_lib/data'

export const metadata = { title: 'Overview' }

/** A single order can span several shops. That count IS the marketplace. */
function sellerCount(order: RecentOrder): number {
  return new Set(order.items.map((item) => item.sellerId)).size
}

export default async function AdminOverviewPage() {
  await requireAdmin()

  const [stats, attention] = await Promise.all([getDashboard(), getAttentionCounts()])

  const takeRate = stats.gmv > 0 ? Math.round((stats.commission / stats.gmv) * 1000) / 10 : 0

  return (
    <>
      <PageHeader
        title="Overview"
        description="Everything the marketplace did, and everything it is waiting on you for."
      />

      {/* The queues come FIRST — above the money. A number you cannot act on can wait; a seller who
          has been in the review queue for three days cannot. */}
      <section aria-label="Needs attention" className="grid gap-3 sm:grid-cols-2">
        <AttentionCard
          count={attention.sellers}
          noun="seller"
          description="Shops that have submitted their trade licence and NID and cannot sell until you review them."
          href="/admin/sellers?status=PENDING"
          icon={Store}
          clearLabel="No shops waiting"
        />

        <AttentionCard
          count={attention.products}
          noun="product"
          description="Listings held back from the storefront until an admin approves them."
          href="/admin/products?status=PENDING"
          icon={Package}
          clearLabel="No listings waiting"
        />
      </section>

      <section aria-label="Marketplace performance" className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="GMV (delivered)"
            value={formatBDT(stats.gmv)}
            hint={`${stats.deliveredCount} order${stats.deliveredCount === 1 ? '' : 's'} delivered`}
            icon={TrendingUp}
            tone="brand"
          />

          <StatCard
            label="Commission earned"
            value={formatBDT(stats.commission)}
            hint={
              stats.pipelineCommission > 0
                ? `${formatBDT(stats.pipelineCommission)} more in flight`
                : `${takeRate}% effective take rate`
            }
            icon={Banknote}
            tone="accent"
          />

          <StatCard
            label="Orders placed"
            value={stats.orderCount.toLocaleString('en-US')}
            hint={
              stats.cancelledCount > 0
                ? `${stats.cancelledCount} cancelled`
                : 'No cancellations yet'
            }
            icon={ReceiptText}
            tone="info"
          />

          <StatCard
            label="Active sellers"
            value={stats.activeSellers.toLocaleString('en-US')}
            hint={`${stats.liveProducts.toLocaleString('en-US')} live listings`}
            icon={BadgeCheck}
            tone="success"
          />
        </div>

        {/* The second row is context, not headline — smaller, quieter, still true. */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <StatCard
            label="Owed to sellers (delivered)"
            value={formatBDT(stats.sellerPayable)}
            hint="Gross sales minus commission, frozen at purchase time"
            icon={Store}
            tone="neutral"
          />

          <StatCard
            label="Registered customers"
            value={stats.customers.toLocaleString('en-US')}
            hint="Accounts with the CUSTOMER role"
            icon={Users}
            tone="neutral"
          />
        </div>
      </section>

      <section aria-label="Recent orders" className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight text-ink">Recent orders</h2>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            All orders
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <Card>
          {stats.recentOrders.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No orders yet"
              description="The moment a customer checks out, the order lands here — and the commission lands in the numbers above."
              action={
                <Link href="/" className={buttonVariants({ variant: 'outline' })}>
                  Visit the storefront
                </Link>
              }
            />
          ) : (
            <>
              {/* Mobile: cards. A seven-column table at 375px is a table nobody reads. */}
              <ul className="divide-y divide-line md:hidden">
                {stats.recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="block p-4 transition-colors hover:bg-surface-muted"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-semibold text-ink">
                            {order.orderNumber}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-ink-muted">
                            {order.shipFullName} · {order.shipPhone}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-ink tabular-nums">
                          {formatBDT(order.total)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <OrderStatusChip status={order.status} />
                        <PaymentStatusChip status={order.paymentStatus} />
                        <span className="text-xs text-ink-subtle">
                          {sellerCount(order)} seller{sellerCount(order) === 1 ? '' : 's'}
                        </span>
                        <span className="ml-auto text-xs text-ink-subtle">
                          {formatDate(order.placedAt)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Desktop: table. */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-ink-muted">
                      <th className="px-5 py-2.5 font-medium">Order</th>
                      <th className="px-5 py-2.5 font-medium">Customer</th>
                      <th className="px-5 py-2.5 font-medium">Sellers</th>
                      <th className="px-5 py-2.5 font-medium">Status</th>
                      <th className="px-5 py-2.5 font-medium">Payment</th>
                      <th className="px-5 py-2.5 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {stats.recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-surface-muted">
                        <td className="px-5 py-3">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-mono font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                          <p className="mt-0.5 text-xs text-ink-subtle">
                            {formatDate(order.placedAt)}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="max-w-40 truncate font-medium text-ink">
                            {order.user.name ?? order.shipFullName}
                          </p>
                          <p className="text-xs text-ink-subtle tabular-nums">{order.shipPhone}</p>
                        </td>
                        <td className="px-5 py-3 text-ink-muted tabular-nums">
                          {sellerCount(order)}
                        </td>
                        <td className="px-5 py-3">
                          <OrderStatusChip status={order.status} />
                        </td>
                        <td className="px-5 py-3">
                          <PaymentStatusChip status={order.paymentStatus} />
                        </td>
                        <td
                          className={cn('px-5 py-3 text-right font-semibold text-ink tabular-nums')}
                        >
                          {formatBDT(order.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </section>
    </>
  )
}
