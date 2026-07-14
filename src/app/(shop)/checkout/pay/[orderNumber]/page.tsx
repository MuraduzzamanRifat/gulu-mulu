import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { CreditCard, Landmark, Lock, ShieldAlert, Smartphone } from 'lucide-react'

import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatBDT } from '@/lib/format'
import { paymentMethodLabel, requiresGateway } from '@/lib/payments/methods'
import { PaymentStatus } from '@/generated/prisma/client'

import { MockGatewayForm } from './mock-gateway-form'

export const metadata: Metadata = {
  title: 'Payment (Demo)',
  robots: { index: false, follow: false },
}

interface PayPageProps {
  params: Promise<{ orderNumber: string }>
}

/**
 * A MOCK payment gateway.
 *
 * It is dressed as an SSLCommerz redirect on purpose — the hosted-page pattern (you leave the
 * merchant's domain, you pay, you are POSTed back) is what a Bangladeshi shopper expects, and a
 * demo that hides the redirect teaches the wrong flow. What it does NOT do is imitate a real
 * checkout well enough to fool anyone: there is no card field anywhere on this page, and a fat
 * amber banner says so before you can press a thing.
 *
 * The real thing is fully typed in '@/lib/payments/sslcommerz'. Wiring it up means calling
 * `initSession()` from `placeOrder()` and redirecting to the `GatewayPageURL` it hands back,
 * instead of redirecting here.
 */
export default async function MockPayPage({ params }: PayPageProps) {
  const { orderNumber } = await params
  const user = await requireUser()

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      orderNumber: true,
      userId: true,
      total: true,
      paymentMethod: true,
      paymentStatus: true,
      shipFullName: true,
      shipPhone: true,
      _count: { select: { items: true } },
    },
  })

  // 404, not 403. A wrong owner and a wrong id are indistinguishable from out here, which is the
  // point: an order number is a short, guessable string, and "this order exists but is not yours"
  // is an oracle nobody needs.
  if (!order || order.userId !== user.id) notFound()

  // COD never had a gateway leg. Someone typing this URL in gets bounced to their order.
  if (!requiresGateway(order.paymentMethod)) redirect(`/order/${order.orderNumber}`)

  // Already settled — there is nothing left to simulate, and re-running it would be the
  // double-charge bug this whole flow exists to demonstrate the absence of.
  if (order.paymentStatus === PaymentStatus.PAID) redirect(`/order/${order.orderNumber}`)

  const methodLabel = paymentMethodLabel(order.paymentMethod)
  const retrying = order.paymentStatus === PaymentStatus.FAILED

  return (
    <div className="min-h-[70vh] bg-surface-sunken px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-md">
        {/* ------------------------------------------------------------ The honesty banner */}
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-card border border-accent-300 bg-warning-soft px-4 py-3"
        >
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-accent-700" aria-hidden="true" />
          <div className="text-sm text-accent-700">
            <p className="font-bold">DEMO — no real payment is processed.</p>
            <p className="mt-0.5 text-xs">
              This is a simulated gateway. No card, wallet or bank account is ever charged, and no
              payment details are collected. Choose an outcome below to continue.
            </p>
          </div>
        </div>

        {/* ------------------------------------------------------------ The "gateway" */}
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-md">
          <header className="flex items-center justify-between gap-3 bg-ink px-4 py-3.5 text-ink-inverse sm:px-5">
            <div className="flex items-center gap-2">
              <Landmark className="size-5" aria-hidden="true" />
              <span className="text-sm font-bold tracking-tight">SSLC<span className="text-brand-400">OMMERZ</span></span>
            </div>

            <span className="flex items-center gap-1 text-xs text-white/70">
              <Lock className="size-3" aria-hidden="true" />
              Secure checkout
            </span>
          </header>

          <div className="border-b border-line bg-surface-muted px-4 py-4 sm:px-5">
            <p className="text-xs text-ink-muted">Paying</p>
            <p className="mt-0.5 text-3xl font-bold tabular-nums text-ink">
              {formatBDT(order.total)}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              to <strong className="font-semibold text-ink">Gulu Mulu</strong> · order{' '}
              <span className="font-mono font-semibold text-ink">{order.orderNumber}</span> ·{' '}
              {order._count.items} {order._count.items === 1 ? 'item' : 'items'}
            </p>
          </div>

          <dl className="space-y-2.5 border-b border-line px-4 py-4 text-sm sm:px-5">
            <div className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-2 text-ink-muted">
                {order.paymentMethod === 'SSLCOMMERZ' ? (
                  <CreditCard className="size-4" aria-hidden="true" />
                ) : (
                  <Smartphone className="size-4" aria-hidden="true" />
                )}
                Method
              </dt>
              <dd className="font-medium text-ink">{methodLabel}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Customer</dt>
              <dd className="truncate font-medium text-ink">{order.shipFullName}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Mobile</dt>
              <dd className="font-medium tabular-nums text-ink">{order.shipPhone}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Currency</dt>
              <dd className="font-medium text-ink">BDT</dd>
            </div>
          </dl>

          <div className="px-4 py-5 sm:px-5">
            {retrying ? (
              <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
                Your last payment attempt failed. Your order is still reserved — try again below, or
                cancel and pay cash on delivery.
              </p>
            ) : null}

            <MockGatewayForm orderNumber={order.orderNumber} />

            {/* ink-muted, not ink-subtle (~2.9:1 on white). This is the sentence that stops a
                shopper panicking on a payment screen — it has to be readable. */}
            <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted">
              Your order <span className="font-mono">{order.orderNumber}</span> is already placed and
              its stock reserved. Whatever you choose here, you can{' '}
              <Link
                href={`/order/${order.orderNumber}`}
                className="font-medium text-brand-600 underline hover:text-brand-700"
              >
                view the order
              </Link>
              .
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-ink-subtle">
          In production this page would live on{' '}
          <span className="font-mono">securepay.sslcommerz.com</span>, and the result would reach
          Gulu Mulu as a server-to-server IPN — validated against SSLCommerz&rsquo;s own API before a
          single Taka is believed.
        </p>
      </div>
    </div>
  )
}
