import Link from 'next/link'
import { AlertTriangle, Package, Plus, ReceiptText, TrendingUp, Wallet } from 'lucide-react'

import { buttonVariants, Card, EmptyState } from '@/components/ui'
import { requireSeller } from '@/lib/auth'
import { formatBDT, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

import { OrderStatusChip } from '../_components/chips'
import { EarningsChart } from '../_components/earnings-chart'
import { PageHeader } from '../_components/page-header'
import { StatCard } from '../_components/stat-card'
import { Thumb } from '../_components/thumb'
import { getEarningsLast7Days, getRecentSellerItems, getSellerStats } from '../_lib/data'

export const metadata = { title: 'Dashboard' }

export default async function SellerDashboardPage() {
  const { seller } = await requireSeller()

  const [stats, days, recent] = await Promise.all([
    getSellerStats(seller.id),
    getEarningsLast7Days(seller.id),
    getRecentSellerItems(seller.id, 6),
  ])

  return (
    <>
      <PageHeader
        title={`Salaam, ${seller.businessName}`}
        description="Your shop at a glance — earnings, stock and the orders waiting on you."
        action={
          <Link href="/seller/products/new" className={buttonVariants({ variant: 'primary' })}>
            <Plus aria-hidden="true" />
            Add product
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total earnings"
          value={formatBDT(stats.revenue)}
          hint="Your cut of delivered orders"
          icon={TrendingUp}
          tone="brand"
        />
        <StatCard
          label="Orders"
          value={stats.orderCount.toLocaleString('en-US')}
          hint="Orders containing your products"
          icon={ReceiptText}
          tone="info"
        />
        <StatCard
          label="Live listings"
          value={stats.liveProducts.toLocaleString('en-US')}
          hint={
            stats.pendingProducts > 0
              ? `${stats.pendingProducts} awaiting review`
              : 'All listings approved'
          }
          icon={Package}
          tone="success"
        />
        <StatCard
          label="Pending payout"
          value={formatBDT(stats.unpaidBalance)}
          hint="Not yet covered by a payout"
          icon={Wallet}
          tone="accent"
        />
      </div>

      {stats.outOfStock > 0 ? (
        <Card className="mt-3 flex items-center gap-3 border-warning-soft bg-warning-soft p-4">
          <AlertTriangle className="size-5 shrink-0 text-accent-700" aria-hidden="true" />
          <p className="text-sm text-ink">
            <span className="font-semibold">
              {stats.outOfStock} live {stats.outOfStock === 1 ? 'listing is' : 'listings are'} out
              of stock.
            </span>{' '}
            Shoppers can still see them but cannot buy.{' '}
            <Link
              href="/seller/products?status=APPROVED"
              className="font-semibold text-brand-600 underline underline-offset-2"
            >
              Restock now
            </Link>
          </p>
        </Card>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="p-4 sm:p-5 lg:col-span-3">
          <EarningsChart days={days} />
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b border-line p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-ink">Commission</h2>
            <span className="text-xs text-ink-subtle">Frozen at purchase</span>
          </div>

          <div className="p-4 sm:p-5">
            <p className="text-3xl font-bold tracking-tight text-ink tabular-nums">
              {Math.round(seller.commissionRate * 100)}%
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Gulu Mulu keeps {Math.round(seller.commissionRate * 100)}% of every line you sell. The
              rest is yours, and it is frozen onto the order the moment the customer pays — a later
              rate change can never rewrite an order you have already earned.
            </p>

            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-muted">On a ৳1,000 sale you keep</dt>
                <dd className="font-semibold text-ink tabular-nums">
                  {formatBDT(1000 - Math.round(1000 * seller.commissionRate))}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-muted">Already covered by payouts</dt>
                <dd className="font-semibold text-ink tabular-nums">
                  {formatBDT(stats.revenue - stats.unpaidBalance)}
                </dd>
              </div>
            </dl>

            <Link
              href="/seller/payouts"
              className={cn(buttonVariants({ variant: 'outline', fullWidth: true }), 'mt-4')}
            >
              <Wallet aria-hidden="true" />
              View payouts
            </Link>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between gap-2 border-b border-line p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink">Recent orders</h2>
          <Link
            href="/seller/orders"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No orders yet"
            description="When a shopper buys one of your products, the line lands here — with its commission and your net earning already worked out."
            action={
              <Link href="/seller/products/new" className={buttonVariants({ variant: 'primary' })}>
                <Plus aria-hidden="true" />
                Add your first product
              </Link>
            }
          />
        ) : (
          <>
            {/* Mobile: a stacked list. A 6-column table at 375px is unreadable. */}
            <ul className="divide-y divide-line md:hidden">
              {recent.map((item) => (
                <li key={item.id} className="flex gap-3 p-4">
                  <Thumb src={item.imageSnapshot} alt={item.titleSnapshot} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium text-ink">
                        {item.titleSnapshot}
                      </p>
                      <OrderStatusChip status={item.status} />
                    </div>

                    <p className="mt-1 text-xs text-ink-subtle">
                      {item.order.orderNumber} · {formatDate(item.order.placedAt)} · ×
                      {item.quantity}
                    </p>

                    <p className="mt-1.5 text-sm font-semibold text-ink tabular-nums">
                      {formatBDT(item.sellerEarning)}{' '}
                      <span className="text-xs font-normal text-ink-subtle">
                        net of {formatBDT(item.commissionAmount)} commission
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-muted">
                    <th className="px-5 py-2.5 font-medium">Product</th>
                    <th className="px-5 py-2.5 font-medium">Order</th>
                    <th className="px-5 py-2.5 text-right font-medium">Sale</th>
                    <th className="px-5 py-2.5 text-right font-medium">Commission</th>
                    <th className="px-5 py-2.5 text-right font-medium">You earn</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recent.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-muted">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Thumb
                            src={item.imageSnapshot}
                            alt={item.titleSnapshot}
                            className="size-10"
                          />
                          <div className="min-w-0 max-w-56">
                            <p className="truncate font-medium text-ink">{item.titleSnapshot}</p>
                            <p className="truncate text-xs text-ink-subtle">
                              {item.variantLabel ? `${item.variantLabel} · ` : null}×{item.quantity}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-ink">{item.order.orderNumber}</p>
                        <p className="text-xs text-ink-subtle">{formatDate(item.order.placedAt)}</p>
                      </td>
                      <td className="px-5 py-3 text-right text-ink tabular-nums">
                        {formatBDT(item.lineTotal)}
                      </td>
                      <td className="px-5 py-3 text-right text-danger tabular-nums">
                        −{formatBDT(item.commissionAmount)}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-ink tabular-nums">
                        {formatBDT(item.sellerEarning)}
                      </td>
                      <td className="px-5 py-3">
                        <OrderStatusChip status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </>
  )
}
