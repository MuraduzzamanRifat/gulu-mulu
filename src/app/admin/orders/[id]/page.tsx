import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Phone,
  Store,
  Ticket,
  User,
} from 'lucide-react'

import { Badge, Card } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { formatBDT, formatDate } from '@/lib/format'
import { CouponType, ProductStatus } from '@/generated/prisma/client'
import { cn } from '@/lib/utils'

import { OrderStatusChip, PaymentStatusChip } from '../../_components/chips'
import { Thumb } from '../../_components/thumb'
import { getAdminOrder, groupBySeller, type SellerBreakdown } from '../../_lib/data'
import { formatRate } from '../../_lib/rate'
import { PAYMENT_METHOD_LABEL } from '../../_lib/status'
import { OrderStatusPanel } from '../order-status-panel'

interface PageProps {
  // Next 16: params is a Promise.
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const order = await getAdminOrder(id)
  return { title: order ? order.orderNumber : 'Order' }
}

/* -------------------------------------------------------------------------- */
/* One seller's share of the basket                                           */
/* -------------------------------------------------------------------------- */

function SellerBlock({ group }: { group: SellerBreakdown }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-2">
          <Store className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
          <Link
            href={`/admin/products?sellerId=${group.sellerId}`}
            className="truncate font-semibold text-brand-600 hover:underline"
          >
            {group.businessName}
          </Link>
          <Badge variant="neutral">
            {group.lines.length} line{group.lines.length === 1 ? '' : 's'}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-[0.6875rem] text-ink-muted">Commission</p>
            <p className="text-sm font-bold text-brand-600 tabular-nums">
              {formatBDT(group.commission)}
            </p>
          </div>
          <div>
            <p className="text-[0.6875rem] text-ink-muted">Seller earns</p>
            <p className="text-sm font-bold text-ink tabular-nums">{formatBDT(group.earning)}</p>
          </div>
        </div>
      </div>

      <ul className="divide-y divide-line">
        {group.lines.map((line) => (
          <li key={line.id} className="flex gap-3 p-4 sm:p-5">
            {/* The SNAPSHOT, not the product's current image — the order must survive the seller
                renaming, re-photographing or deleting the listing. */}
            <Thumb src={line.imageSnapshot} alt="" className="size-14" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {/* Only link to a listing the storefront would actually serve. */}
                    {line.product.status === ProductStatus.APPROVED ? (
                      <Link
                        href={`/product/${line.product.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 hover:text-brand-600 hover:underline"
                      >
                        {line.titleSnapshot}
                        <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                      </Link>
                    ) : (
                      line.titleSnapshot
                    )}
                  </p>

                  {line.variantLabel ? (
                    <p className="mt-0.5 text-xs text-ink-muted">{line.variantLabel}</p>
                  ) : null}

                  <p className="mt-0.5 text-xs text-ink-subtle tabular-nums">
                    {formatBDT(line.unitPrice)} × {line.quantity}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-semibold text-ink tabular-nums">
                  {formatBDT(line.lineTotal)}
                </p>
              </div>

              {/* The split, frozen at purchase time. commission + earning === lineTotal, exactly,
                  by construction in splitCommission() — it is not re-derived here. */}
              <dl className="mt-2.5 grid grid-cols-3 gap-2 rounded-lg bg-surface-muted p-2 text-center">
                <div>
                  <dt className="text-[0.6875rem] text-ink-muted">Rate</dt>
                  <dd className="text-xs font-semibold text-ink tabular-nums">
                    {formatRate(line.commissionRate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.6875rem] text-ink-muted">Commission</dt>
                  <dd className="text-xs font-semibold text-brand-600 tabular-nums">
                    {formatBDT(line.commissionAmount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.6875rem] text-ink-muted">Seller earns</dt>
                  <dd className="text-xs font-semibold text-ink tabular-nums">
                    {formatBDT(line.sellerEarning)}
                  </dd>
                </div>
              </dl>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Money                                                                      */
/* -------------------------------------------------------------------------- */

function Row({
  label,
  value,
  tone,
  strong,
}: {
  label: React.ReactNode
  value: string
  tone?: 'success' | 'brand'
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={cn('text-sm', strong ? 'font-semibold text-ink' : 'text-ink-muted')}>
        {label}
      </dt>
      <dd
        className={cn(
          'shrink-0 tabular-nums',
          strong ? 'text-base font-bold text-ink' : 'text-sm font-medium text-ink',
          tone === 'success' && 'text-success!',
          tone === 'brand' && 'text-brand-600!',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function AdminOrderDetailPage({ params }: PageProps) {
  await requireAdmin()

  const { id } = await params
  const order = await getAdminOrder(id)
  if (!order) notFound()

  const groups = groupBySeller(order)

  const commissionTotal = groups.reduce((sum, group) => sum + group.commission, 0)
  const payableTotal = groups.reduce((sum, group) => sum + group.earning, 0)
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <>
      <Link
        href="/admin/orders"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All orders
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-mono text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {order.orderNumber}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Placed {formatDate(order.placedAt)} · {itemCount} item{itemCount === 1 ? '' : 's'} from{' '}
            {groups.length} seller{groups.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <OrderStatusChip status={order.status} />
          <PaymentStatusChip status={order.paymentStatus} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        {/* The multi-seller breakdown — the heart of the whole marketplace model. */}
        <section aria-label="Order lines by seller" className="space-y-4">
          {groups.length > 1 ? (
            <p className="rounded-lg border border-info/25 bg-info-soft px-3 py-2.5 text-xs text-info">
              This one basket is an obligation to {groups.length} different businesses, each at their
              own commission rate. Gulu Mulu delivers it as a single parcel — the split below is what
              makes that possible.
            </p>
          ) : null}

          {groups.map((group) => (
            <SellerBlock key={group.sellerId} group={group} />
          ))}
        </section>

        <aside className="space-y-4">
          <Card className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-ink">Money</h2>

            <dl className="mt-3 space-y-2">
              <Row label="Subtotal" value={formatBDT(order.subtotal)} />
              <Row label="Delivery" value={formatBDT(order.deliveryFee)} />

              {order.discount > 0 ? (
                <Row
                  label={
                    <span className="inline-flex items-center gap-1">
                      <Ticket className="size-3.5" aria-hidden="true" />
                      {order.coupon ? (
                        <span className="font-mono">{order.coupon.code}</span>
                      ) : (
                        'Discount'
                      )}
                      {order.coupon ? (
                        <span className="text-xs text-ink-subtle">
                          (
                          {order.coupon.type === CouponType.PERCENT
                            ? `${order.coupon.value}%`
                            : formatBDT(order.coupon.value)}
                          )
                        </span>
                      ) : null}
                    </span>
                  }
                  value={`−${formatBDT(order.discount)}`}
                  tone="success"
                />
              ) : null}

              <div className="border-t border-line pt-2">
                <Row label="Customer paid" value={formatBDT(order.total)} strong />
              </div>
            </dl>

            <div className="mt-4 space-y-2 rounded-lg bg-surface-muted p-3">
              <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                The split
              </p>
              <Row label="Gulu Mulu commission" value={formatBDT(commissionTotal)} tone="brand" />
              <Row label="Owed to sellers" value={formatBDT(payableTotal)} />
              <p className="pt-1 text-xs text-ink-subtle">
                Frozen at purchase time. Changing a seller&rsquo;s rate today cannot rewrite this.
              </p>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-ink">Customer</h2>

            <div className="mt-3 space-y-2.5 text-sm">
              <p className="flex items-start gap-2 text-ink">
                <User className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                <span className="min-w-0">
                  {order.user.name ?? order.shipFullName}
                  {order.user.email ? (
                    <span className="block truncate text-xs text-ink-subtle">
                      {order.user.email}
                    </span>
                  ) : null}
                </span>
              </p>

              <p className="flex items-start gap-2 text-ink">
                <Phone className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                <a href={`tel:${order.shipPhone}`} className="tabular-nums hover:underline">
                  {order.shipPhone}
                </a>
              </p>

              {/* The SNAPSHOT, not the live Address row — the parcel goes where it was sold to, even
                  if the customer has since edited or deleted that address. */}
              <p className="flex items-start gap-2 text-ink-muted">
                <MapPin className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                <span>
                  <span className="font-medium text-ink">{order.shipFullName}</span>
                  <br />
                  {order.shipAddressLine}
                  <br />
                  {order.shipArea}, {order.shipDistrict}
                  <br />
                  {order.shipDivision}
                </span>
              </p>

              <p className="border-t border-line pt-2.5 text-xs text-ink-subtle">
                Paid by {PAYMENT_METHOD_LABEL[order.paymentMethod]}
                {order.transactionId ? (
                  <>
                    {' '}
                    · <span className="font-mono">{order.transactionId}</span>
                  </>
                ) : null}
              </p>
            </div>
          </Card>

          <OrderStatusPanel
            orderId={order.id}
            orderNumber={order.orderNumber}
            status={order.status}
            paymentStatus={order.paymentStatus}
            paymentMethod={order.paymentMethod}
            total={order.total}
            itemCount={order.items.length}
          />
        </aside>
      </div>
    </>
  )
}
