import Link from 'next/link'
import Image from 'next/image'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarClock,
  Package,
  PackageX,
  ReceiptText,
  ShoppingBag,
  Star,
  Store,
  Ticket,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'

import { buttonVariants, Card, EmptyState, Stars } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { formatBDT, formatDate, PLACEHOLDER_IMAGE } from '@/lib/format'
import { cn } from '@/lib/utils'

import { OrderStatusChip, PaymentStatusChip } from './_components/chips'
import { ChartCard } from './_components/chart-card'
import { CategoryDonut, OrdersBarChart, RevenueAreaChart, Sparkline } from './_components/charts'
import { PageHeader } from './_components/page-header'
import { AttentionCard, StatCard } from './_components/stat-card'
import {
  deltaPct,
  getDashboardAnalytics,
  parseRange,
  RANGE_OPTIONS,
  type RangeDays,
} from './_lib/analytics'
import { getAttentionCounts, getDashboard, type RecentOrder } from './_lib/data'

export const metadata = { title: 'Overview' }

/** A single order can span several shops. That count IS the marketplace. */
function sellerCount(order: RecentOrder): number {
  return new Set(order.items.map((item) => item.sellerId)).size
}

/** The §12 global range filter. Links, not JS — shareable, and it works before hydration. */
function RangePicker({ current }: { current: RangeDays }) {
  return (
    <div
      role="group"
      aria-label="Date range"
      className="inline-flex rounded-lg border border-line bg-surface p-0.5"
    >
      {RANGE_OPTIONS.map((days) => (
        <Link
          key={days}
          href={`/admin?range=${days}`}
          aria-current={days === current ? 'true' : undefined}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
            days === current
              ? 'bg-brand-500 text-white'
              : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
          )}
        >
          {days}d
        </Link>
      ))}
    </div>
  )
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  await requireAdmin()

  const range = parseRange((await searchParams).range)

  const [stats, attention, analytics] = await Promise.all([
    getDashboard(),
    getAttentionCounts(),
    getDashboardAnalytics(range),
  ])

  const takeRate = stats.gmv > 0 ? Math.round((stats.commission / stats.gmv) * 1000) / 10 : 0
  const salesSpark = analytics.series.map((p) => p.sales)
  const ordersSpark = analytics.series.map((p) => p.orders)
  const salesDelta = deltaPct(analytics.salesInRange, analytics.salesPrevRange)
  const ordersDelta = deltaPct(analytics.ordersInRange, analytics.ordersPrevRange)

  return (
    <>
      <PageHeader
        title="Overview"
        description="Everything the marketplace did, and everything it is waiting on you for."
        action={<RangePicker current={range} />}
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

      {/* ------------------------- Trading window (the range) ------------------------- */}
      <section aria-label="Trading" className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={`Sales · last ${range}d`}
            value={formatBDT(analytics.salesInRange)}
            hint="Order value placed, excl. cancelled"
            icon={TrendingUp}
            tone="brand"
            delta={salesDelta}
            spark={<Sparkline data={salesSpark} positive={(salesDelta ?? 0) >= 0} />}
            href="/admin/orders"
          />

          <StatCard
            label={`Orders · last ${range}d`}
            value={analytics.ordersInRange.toLocaleString('en-US')}
            hint={`${analytics.ordersToday} today`}
            icon={ReceiptText}
            tone="info"
            delta={ordersDelta}
            spark={<Sparkline data={ordersSpark} positive={(ordersDelta ?? 0) >= 0} />}
            href="/admin/orders"
          />

          <StatCard
            label="Sales today"
            value={formatBDT(analytics.salesToday)}
            hint="Since midnight UTC"
            icon={CalendarClock}
            tone="accent"
            href="/admin/orders"
          />

          <StatCard
            label="Pending orders"
            value={analytics.pendingOrders.toLocaleString('en-US')}
            hint="Placed, not yet confirmed"
            icon={ShoppingBag}
            tone={analytics.pendingOrders > 0 ? 'brand' : 'neutral'}
            href="/admin/orders?status=PENDING"
          />
        </div>
      </section>

      {/* ------------------------------ Charts ------------------------------ */}
      <section aria-label="Trends" className="mt-6 grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard
            title={`Sales · last ${range} days`}
            subtitle="Order value placed per day, excluding cancelled orders"
            empty={analytics.salesInRange === 0}
          >
            <RevenueAreaChart series={analytics.series} />
          </ChartCard>
        </div>

        <ChartCard
          title="Sales by category"
          subtitle={`Top-level share · last ${range} days`}
          empty={analytics.byCategory.length === 0}
        >
          <CategoryDonut slices={analytics.byCategory.slice(0, 6)} />
        </ChartCard>
      </section>

      <section aria-label="Rankings" className="mt-3 grid gap-3 lg:grid-cols-3">
        <ChartCard
          title="Orders per day"
          subtitle={`Last ${range} days`}
          empty={analytics.ordersInRange === 0}
        >
          <OrdersBarChart series={analytics.series} />
        </ChartCard>

        <ChartCard
          title="Top products"
          subtitle={`By revenue · last ${range} days`}
          empty={analytics.topProducts.length === 0}
        >
          <ol className="space-y-2.5">
            {analytics.topProducts.map((product, i) => (
              <li key={product.id}>
                <Link
                  href={`/product/${product.slug}`}
                  className="group flex items-center gap-3 rounded-lg p-1 transition-colors hover:bg-surface-muted"
                >
                  <span className="w-4 shrink-0 text-xs font-bold text-ink-subtle tabular-nums">
                    {i + 1}
                  </span>
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                    <Image
                      src={product.imageUrl ?? PLACEHOLDER_IMAGE}
                      alt=""
                      fill
                      sizes="40px"
                      unoptimized={!product.imageUrl}
                      className="object-cover"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink group-hover:text-brand-600">
                      {product.title}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {product.units} unit{product.units === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-ink tabular-nums">
                    {formatBDT(product.revenue)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </ChartCard>

        <ChartCard
          title="Top sellers"
          subtitle={`By revenue · last ${range} days`}
          empty={analytics.topVendors.length === 0}
        >
          <ol className="space-y-2.5">
            {analytics.topVendors.map((vendor, i) => (
              <li key={vendor.sellerId} className="flex items-center gap-3 p-1">
                <span className="w-4 shrink-0 text-xs font-bold text-ink-subtle tabular-nums">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {vendor.businessName}
                  </span>
                  <span className="block text-xs text-ink-muted">
                    {formatBDT(vendor.commission)} commission
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-ink tabular-nums">
                  {formatBDT(vendor.revenue)}
                </span>
              </li>
            ))}
          </ol>
        </ChartCard>
      </section>

      {/* -------------------------- Banked money + platform -------------------------- */}
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
            label="Owed to sellers (delivered)"
            value={formatBDT(stats.sellerPayable)}
            hint="Frozen at purchase time"
            icon={Store}
            tone="neutral"
          />

          <StatCard
            label="Customers"
            value={stats.customers.toLocaleString('en-US')}
            hint={`${analytics.newCustomers} new in the last ${range}d`}
            icon={Users}
            tone="info"
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Active sellers"
            value={stats.activeSellers.toLocaleString('en-US')}
            hint={`${stats.liveProducts.toLocaleString('en-US')} live listings`}
            icon={BadgeCheck}
            tone="success"
            href="/admin/sellers"
          />

          <StatCard
            label="Out of stock"
            value={analytics.outOfStock.toLocaleString('en-US')}
            hint="Live listings a shopper cannot buy"
            icon={PackageX}
            tone={analytics.outOfStock > 0 ? 'brand' : 'neutral'}
            href="/admin/products"
          />

          <StatCard
            label="Low stock"
            value={analytics.lowStock.toLocaleString('en-US')}
            hint="5 units or fewer remaining"
            icon={AlertTriangle}
            tone={analytics.lowStock > 0 ? 'accent' : 'neutral'}
            href="/admin/products"
          />

          <StatCard
            label="Active coupons"
            value={analytics.activeCoupons.toLocaleString('en-US')}
            hint="Live and unexpired"
            icon={Ticket}
            tone="neutral"
          />
        </div>
      </section>

      {/* ------------------------------ Activity panels ------------------------------ */}
      <section aria-label="Recent activity" className="mt-6 grid gap-3 lg:grid-cols-2">
        <ChartCard
          title="Recent reviews"
          subtitle="Latest customer feedback across the catalogue"
          empty={analytics.recentReviews.length === 0}
        >
          <ul className="divide-y divide-line">
            {analytics.recentReviews.map((review) => (
              <li key={review.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <Stars value={review.rating} size="sm" className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">
                    {review.comment ?? <span className="text-ink-muted italic">No comment</span>}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {review.userName ?? 'Customer'} ·{' '}
                    <Link
                      href={`/product/${review.productSlug}`}
                      className="hover:text-brand-600 hover:underline"
                    >
                      {review.productTitle}
                    </Link>
                  </p>
                </div>
                <span className="shrink-0 text-xs text-ink-subtle">
                  {formatDate(review.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard
          title="Low inventory"
          subtitle="Approved listings about to sell out"
          action={
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              All products
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          }
          empty={analytics.lowStockRows.length === 0}
        >
          <ul className="divide-y divide-line">
            {analytics.lowStockRows.map((row) => (
              <li key={row.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                  <Image
                    src={row.imageUrl ?? PLACEHOLDER_IMAGE}
                    alt=""
                    fill
                    sizes="40px"
                    unoptimized={!row.imageUrl}
                    className="object-cover"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{row.title}</p>
                  <p className="truncate text-xs text-ink-muted">{row.sellerName}</p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                    row.stock <= 2 ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning',
                  )}
                >
                  {row.stock} left
                </span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </section>

      <section aria-label="Recent orders" className="mt-6">
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
