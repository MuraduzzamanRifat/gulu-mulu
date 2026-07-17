import Link from 'next/link'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowLeft,
  Heart,
  MapPin,
  Package,
  ReceiptText,
  Star,
  TrendingUp,
  Wallet,
} from 'lucide-react'

import { Card, EmptyState, Price, Stars } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { formatBDT, formatDate, PLACEHOLDER_IMAGE } from '@/lib/format'

import { OrderStatusChip, PaymentStatusChip } from '../../_components/chips'
import { StatCard } from '../../_components/stat-card'
import { getAdminCustomer } from '../../_lib/customers'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const customer = await getAdminCustomer(id)
  return { title: customer?.name ?? 'Customer' }
}

export default async function AdminCustomerDetailPage({ params }: PageProps) {
  await requireAdmin()

  const { id } = await params
  const customer = await getAdminCustomer(id)
  if (!customer) notFound()

  const { stats } = customer

  return (
    <>
      <Link
        href="/admin/customers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All customers
      </Link>

      {/* Identity */}
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-50 text-xl font-bold text-brand-600">
          {(customer.name?.trim()?.[0] ?? '#').toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {customer.name ?? 'Unnamed shopper'}
          </h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            <span className="tabular-nums">{customer.phone}</span>
            {customer.email ? <span> · {customer.email}</span> : null}
          </p>
          <p className="mt-0.5 text-xs text-ink-subtle">Joined {formatDate(customer.createdAt)}</p>
        </div>
      </Card>

      {/* Lifetime stats */}
      <section aria-label="Customer value" className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total spent"
          value={formatBDT(stats.totalSpent)}
          hint="Delivered orders only"
          icon={Wallet}
          tone="brand"
        />
        <StatCard
          label="Orders placed"
          value={stats.totalOrders.toLocaleString('en-US')}
          hint={`${stats.deliveredOrders} delivered`}
          icon={ReceiptText}
          tone="info"
        />
        <StatCard
          label="Average order"
          value={formatBDT(stats.avgOrder)}
          hint="Across delivered orders"
          icon={TrendingUp}
          tone="accent"
        />
        <StatCard
          label="Reviews written"
          value={customer._count.reviews.toLocaleString('en-US')}
          hint={`${customer._count.wishlist} saved to closet`}
          icon={Star}
          tone="success"
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Orders — the wide column */}
        <section aria-label="Recent orders" className="lg:col-span-2">
          <h2 className="mb-3 text-base font-semibold tracking-tight text-ink">Recent orders</h2>
          <Card>
            {customer.orders.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No orders yet"
                description="This shopper has an account but has not checked out."
              />
            ) : (
              <ul className="divide-y divide-line">
                {customer.orders.map((order) => {
                  const sellers = new Set(order.items.map((i) => i.sellerId)).size
                  return (
                    <li key={order.id}>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-muted"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-semibold text-ink">
                            {order.orderNumber}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <OrderStatusChip status={order.status} />
                            <PaymentStatusChip status={order.paymentStatus} />
                            <span className="text-xs text-ink-subtle">
                              {sellers} seller{sellers === 1 ? '' : 's'} · {formatDate(order.placedAt)}
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-ink tabular-nums">
                          {formatBDT(order.total)}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {/* Reviews */}
          <h2 className="mt-6 mb-3 text-base font-semibold tracking-tight text-ink">Reviews</h2>
          <Card>
            {customer.reviews.length === 0 ? (
              <EmptyState
                icon={Star}
                title="No reviews"
                description="This customer has not reviewed anything yet."
              />
            ) : (
              <ul className="divide-y divide-line">
                {customer.reviews.map((review) => (
                  <li key={review.id} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Stars value={review.rating} size="sm" />
                      <span className="text-xs text-ink-subtle">{formatDate(review.createdAt)}</span>
                    </div>
                    {review.comment ? (
                      <p className="mt-1.5 text-sm text-ink">{review.comment}</p>
                    ) : null}
                    <Link
                      href={`/product/${review.product.slug}`}
                      className="mt-1 inline-block text-xs font-medium text-brand-600 hover:underline"
                    >
                      {review.product.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* Sidebar: addresses + closet */}
        <section aria-label="Addresses and closet" className="space-y-6">
          <div>
            <h2 className="mb-3 text-base font-semibold tracking-tight text-ink">Addresses</h2>
            <Card className="p-4">
              {customer.addresses.length === 0 ? (
                <p className="text-sm text-ink-muted">No saved addresses.</p>
              ) : (
                <ul className="space-y-3">
                  {customer.addresses.map((address) => (
                    <li key={address.id} className="flex gap-2.5 text-sm">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="font-medium text-ink">
                          {address.fullName}
                          {address.isDefault ? (
                            <span className="ml-1.5 rounded-full bg-brand-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-brand-600">
                              Default
                            </span>
                          ) : null}
                        </p>
                        <p className="text-ink-muted">{address.addressLine}</p>
                        <p className="text-xs text-ink-subtle">
                          {address.area}, {address.district}, {address.division}
                        </p>
                        <p className="text-xs text-ink-subtle tabular-nums">{address.phone}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div>
            <h2 className="mb-3 flex items-center gap-1.5 text-base font-semibold tracking-tight text-ink">
              <Heart className="size-4 text-brand-500" aria-hidden="true" />
              My Closet
            </h2>
            <Card className="p-4">
              {customer.wishlist.length === 0 ? (
                <p className="text-sm text-ink-muted">Nothing saved yet.</p>
              ) : (
                <ul className="grid grid-cols-3 gap-2">
                  {customer.wishlist.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/product/${item.product.slug}`}
                        className="group block"
                        title={item.product.title}
                      >
                        <span className="relative block aspect-square overflow-hidden rounded-lg bg-surface-sunken">
                          <Image
                            src={item.product.images[0]?.url ?? PLACEHOLDER_IMAGE}
                            alt={item.product.title}
                            fill
                            sizes="80px"
                            unoptimized={!item.product.images[0]}
                            className="object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        </span>
                        <span className="mt-1 block">
                          <Price product={item.product} size="sm" showBadge={false} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </section>
      </div>
    </>
  )
}
