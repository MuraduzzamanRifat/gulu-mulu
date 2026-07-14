import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  MapPin,
  Package,
  Phone,
  Receipt,
  Store,
} from 'lucide-react'

import { Badge, buttonVariants } from '@/components/ui'
import {
  ORDER_STATUS_TONE,
  OrderTimeline,
  orderStatusLabel,
} from '@/components/checkout/order-timeline'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PLACEHOLDER_IMAGE, formatBDT, formatDate } from '@/lib/format'
import { paymentMethodLabel } from '@/lib/payments/methods'
import { OrderStatus, PaymentMethod, PaymentStatus } from '@/generated/prisma/client'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Your order',
  robots: { index: false, follow: false },
}

interface OrderPageProps {
  params: Promise<{ orderNumber: string }>
  searchParams: Promise<{ placed?: string }>
}

/** Payment status → how alarmed the customer should be. COD is handled separately: it's not "unpaid". */
const PAYMENT_TONE: Record<PaymentStatus, 'neutral' | 'success' | 'danger' | 'warning' | 'info'> = {
  [PaymentStatus.PENDING]: 'warning',
  [PaymentStatus.PAID]: 'success',
  [PaymentStatus.FAILED]: 'danger',
  [PaymentStatus.REFUNDED]: 'info',
}

export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  const { orderNumber } = await params
  const { placed } = await searchParams

  const user = await requireUser()

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      coupon: { select: { code: true } },
      items: {
        orderBy: { id: 'asc' },
        include: {
          product: { select: { slug: true, title: true } },
          seller: { select: { id: true, businessName: true, slug: true } },
        },
      },
    },
  })

  // THE ownership gate. `notFound()`, not a 403: an order number is six characters long and
  // therefore guessable, and "this order exists but isn't yours" is an oracle that tells an
  // attacker their guess landed. From out here, someone else's order and no order look identical.
  if (!order || order.userId !== user.id) notFound()

  /* ------------------------------------------------------------------ Group by seller */
  // Same as the cart: one order legitimately spans several shops, each packing and shipping its
  // own parcel. The customer needs to see that, or two deliveries on different days look like a
  // mistake.
  const groups = new Map<
    string,
    { businessName: string; slug: string; items: typeof order.items }
  >()

  for (const item of order.items) {
    const existing = groups.get(item.sellerId)
    if (existing) {
      existing.items.push(item)
    } else {
      groups.set(item.sellerId, {
        businessName: item.seller.businessName,
        slug: item.seller.slug,
        items: [item],
      })
    }
  }

  const sellerGroups = [...groups.values()]

  const isCod = order.paymentMethod === PaymentMethod.COD
  const paymentFailed = order.paymentStatus === PaymentStatus.FAILED
  const awaitingPayment =
    !isCod && (order.paymentStatus === PaymentStatus.PENDING || paymentFailed)
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    // max-w-6xl, same as /cart and /checkout: the funnel holds ONE width from basket to
    // confirmation, so the page does not snap inward at the last hop of a three-step flow.
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      {/* ---------------------------------------------------------------- Confirmation */}
      {placed === '1' && !awaitingPayment ? (
        <div className="mb-6 flex items-start gap-3 rounded-card border border-success/30 bg-success-soft p-4 sm:p-5">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-success" aria-hidden="true" />
          <div>
            <h1 className="text-lg font-bold text-ink sm:text-xl">Order placed. Thank you!</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {isCod
                ? 'Pay the rider in cash when your parcel arrives — check it first, then pay.'
                : 'Your payment is confirmed.'}{' '}
              We have sent the details to{' '}
              <strong className="font-medium text-ink">{order.shipPhone}</strong>.
            </p>
          </div>
        </div>
      ) : null}

      {awaitingPayment ? (
        <div className="mb-6 flex flex-col gap-3 rounded-card border border-danger/30 bg-danger-soft p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-danger">
                {paymentFailed ? 'Payment failed' : 'Payment not completed'}
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">
                Your order is placed and its stock is reserved — but{' '}
                {paymentMethodLabel(order.paymentMethod)} has not been settled.
              </p>
            </div>
          </div>

          <Link
            href={`/checkout/pay/${order.orderNumber}`}
            className={cn(buttonVariants({ size: 'md' }), 'shrink-0')}
          >
            Retry payment
          </Link>
        </div>
      ) : null}

      {/* ---------------------------------------------------------------- Header */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
            <Receipt className="size-3.5" aria-hidden="true" />
            Order
          </p>
          <h2 className="mt-1 font-mono text-2xl font-bold tracking-tight text-ink">
            {order.orderNumber}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Placed {formatDate(order.placedAt)} · {itemCount} {itemCount === 1 ? 'item' : 'items'}{' '}
            from {sellerGroups.length} {sellerGroups.length === 1 ? 'seller' : 'sellers'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={ORDER_STATUS_TONE[order.status]}>{orderStatusLabel(order.status)}</Badge>

          {isCod ? (
            <Badge variant="neutral">
              <Banknote aria-hidden="true" />
              Cash on Delivery
            </Badge>
          ) : (
            <Badge variant={PAYMENT_TONE[order.paymentStatus]}>
              {paymentMethodLabel(order.paymentMethod)} · {order.paymentStatus}
            </Badge>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          {/* ------------------------------------------------------------ Tracking */}
          <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink">
              <Package className="size-4 text-ink-subtle" aria-hidden="true" />
              Tracking
            </h3>

            <OrderTimeline status={order.status} />

            {order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.RETURNED ? (
              <p className="mt-4 border-t border-line pt-4 text-xs text-ink-muted">
                Estimated delivery within 48 hours of confirmation. Each seller dispatches
                separately, so a multi-seller order may arrive in more than one parcel.
              </p>
            ) : null}
          </section>

          {/* ------------------------------------------------------------ Items, by seller */}
          {sellerGroups.map((group) => (
            <section
              key={group.slug}
              className="overflow-hidden rounded-card border border-line bg-surface"
            >
              <header className="flex items-center gap-2 border-b border-line bg-surface-muted px-3 py-2.5 sm:px-4">
                <Store className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                <p className="min-w-0 text-sm text-ink-muted">
                  Sold by{' '}
                  <Link
                    href={`/seller/${group.slug}`}
                    className="font-semibold text-ink hover:text-brand-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    {group.businessName}
                  </Link>
                </p>
              </header>

              <ul className="divide-y divide-line">
                {group.items.map((item) => {
                  // The SNAPSHOT is what we render, not the live product. The seller may have
                  // renamed, repriced or delisted it since — the invoice must still show what was
                  // actually bought, at what it was actually charged.
                  const image = item.imageSnapshot ?? PLACEHOLDER_IMAGE

                  return (
                    <li key={item.id} className="flex gap-3 px-3 py-4 sm:gap-4 sm:px-4">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-sunken sm:size-20">
                        <Image
                          src={image}
                          alt={item.titleSnapshot}
                          fill
                          sizes="80px"
                          quality={60}
                          unoptimized={image === PLACEHOLDER_IMAGE}
                          className="object-cover"
                        />
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/product/${item.product.slug}`}
                            className="line-clamp-2 text-sm font-medium text-ink hover:text-brand-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
                          >
                            {item.titleSnapshot}
                          </Link>

                          <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                            {formatBDT(item.lineTotal)}
                          </p>
                        </div>

                        {item.variantLabel ? (
                          <p className="text-xs text-ink-muted">{item.variantLabel}</p>
                        ) : null}

                        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                          <p className="text-xs text-ink-muted tabular-nums">
                            {formatBDT(item.unitPrice)} × {item.quantity}
                          </p>

                          <Badge variant={ORDER_STATUS_TONE[item.status]} size="sm">
                            {orderStatusLabel(item.status)}
                          </Badge>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>

        {/* -------------------------------------------------------------- Aside */}
        <aside className="space-y-4 lg:col-span-5 xl:col-span-4">
          {/* Address SNAPSHOT — not a join to Address. The customer may have edited or deleted
              that row since, and the rider still has to find the flat this parcel was sold to. */}
          <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
              <MapPin className="size-4 text-ink-subtle" aria-hidden="true" />
              Delivery address
            </h3>

            <div className="space-y-1 text-sm">
              <p className="font-semibold text-ink">{order.shipFullName}</p>
              <p className="flex items-center gap-1.5 text-ink-muted tabular-nums">
                <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                {order.shipPhone}
              </p>
              <p className="pt-1 text-ink-muted">
                {order.shipAddressLine}
                <br />
                {order.shipArea}, {order.shipDistrict}
                <br />
                {order.shipDivision}
              </p>
            </div>
          </section>

          {/* Totals, straight off the Order row. These are the numbers the transaction committed —
              never re-derived at render time, or an invoice could drift from what was charged. */}
          <section className="rounded-card border border-line bg-surface">
            <div className="border-b border-line px-4 py-3.5 sm:px-5">
              <h3 className="text-base font-semibold text-ink">Payment summary</h3>
            </div>

            <dl className="space-y-3 px-4 py-4 text-sm sm:px-5">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="font-medium tabular-nums text-ink">{formatBDT(order.subtotal)}</dd>
              </div>

              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">Delivery</dt>
                <dd className="font-medium tabular-nums text-ink">
                  {formatBDT(order.deliveryFee)}
                </dd>
              </div>

              {order.discount > 0 ? (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="flex flex-wrap items-center gap-1.5 text-ink-muted">
                    Discount
                    {order.coupon ? (
                      <Badge variant="success" size="sm" className="font-mono uppercase">
                        {order.coupon.code}
                      </Badge>
                    ) : null}
                  </dt>
                  <dd className="font-medium tabular-nums text-success">
                    −{formatBDT(order.discount)}
                  </dd>
                </div>
              ) : null}

              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                <dt className="text-base font-semibold text-ink">Total</dt>
                <dd className="text-lg font-bold tabular-nums text-brand-600">
                  {formatBDT(order.total)}
                </dd>
              </div>

              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3 text-xs">
                <dt className="text-ink-muted">Method</dt>
                <dd className="font-medium text-ink">
                  {paymentMethodLabel(order.paymentMethod)}
                  {isCod ? null : ` · ${order.paymentStatus}`}
                </dd>
              </div>

              {order.transactionId ? (
                <div className="flex items-baseline justify-between gap-4 text-xs">
                  <dt className="text-ink-muted">Transaction</dt>
                  <dd className="font-mono font-medium text-ink">{order.transactionId}</dd>
                </div>
              ) : null}
            </dl>

            {isCod ? (
              <p className="flex items-start gap-2 border-t border-line px-4 py-3 text-xs text-ink-muted sm:px-5">
                <Banknote className="mt-px size-3.5 shrink-0 text-success" aria-hidden="true" />
                <span>
                  Pay <strong className="font-semibold text-ink">{formatBDT(order.total)}</strong> in
                  cash to the rider. Open the parcel and check it before you pay.
                </span>
              </p>
            ) : null}
          </section>

          <div className="flex flex-col gap-2">
            <Link
              href="/account/orders"
              className={cn(buttonVariants({ variant: 'outline', fullWidth: true }))}
            >
              View all orders
            </Link>
            <Link href="/" className={cn(buttonVariants({ variant: 'ghost', fullWidth: true }))}>
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
