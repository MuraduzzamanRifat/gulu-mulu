import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'

import { AddressStep, type CheckoutAddress } from '@/components/checkout/address-step'
import { CheckoutSteps, parseStep } from '@/components/checkout/checkout-steps'
import { DeliveryStep, estimateDeliveryDate } from '@/components/checkout/delivery-step'
import { OrderSummary } from '@/components/checkout/order-summary'
import { PaymentStep } from '@/components/checkout/payment-step'
import { requireUser } from '@/lib/auth'
import { getCart, toPricedLines } from '@/lib/cart'
import { prisma } from '@/lib/db'
import { DEFAULT_PAYMENT_METHOD, PAYMENT_METHODS } from '@/lib/payments/methods'
import { summarizeCart } from '@/lib/pricing'
import { PaymentMethod } from '@/generated/prisma/client'

import { getAppliedCoupon } from '../cart/_coupon'

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Confirm your address, delivery and payment method.',
  robots: { index: false, follow: false },
}

/** `?method=` is a raw string off the URL. Anything that isn't a real PaymentMethod becomes COD. */
function parseMethod(raw: string | undefined): PaymentMethod {
  const methods = Object.values(PaymentMethod) as string[]
  return methods.includes(raw ?? '') ? (raw as PaymentMethod) : DEFAULT_PAYMENT_METHOD
}

interface CheckoutPageProps {
  searchParams: Promise<{ step?: string; address?: string; method?: string }>
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  // The proxy already bounced signed-out visitors to /login?next=/checkout. This is the REAL gate:
  // it re-reads the user from the DB, so a forged cookie buys nothing but a second redirect.
  const user = await requireUser()
  const params = await searchParams

  const [cart, coupon, addresses] = await Promise.all([
    getCart(),
    getAppliedCoupon(),
    prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    }),
  ])

  const pricedLines = toPricedLines(cart)

  // Nothing buyable — either the cart is empty, or every line went out of stock while the customer
  // was on their way here. Either way there is no order to place; send them back to see why.
  if (pricedLines.length === 0) redirect('/cart')

  /* ------------------------------------------------------------------ State, all from the URL */

  // The `?address=` id is untrusted. It is only ever honoured if it appears in THIS user's own
  // address list — which we just read from the database, scoped by userId.
  const requested = addresses.find((address) => address.id === params.address) ?? null
  const fallback = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null
  const selected = requested ?? fallback

  const method = parseMethod(params.method)

  // Steps 2 and 3 are meaningless without an address (there is no district, so no fee, so no
  // total). A hand-typed `?step=payment` with no address quietly lands back on step 1 instead of
  // rendering a checkout that cannot add up.
  const requestedStep = parseStep(params.step)
  const step = selected ? requestedStep : 'address'

  // The address is only *committed* once it is in the URL. Landing on /checkout with a default
  // address pre-highlighted is helpful; silently charging Sylhet delivery because a default
  // address the customer never looked at happened to be there is not. So the fee only applies
  // from the delivery step onward, once they have actively confirmed the address.
  const confirmedAddress = step === 'address' ? null : selected

  const summary = summarizeCart(pricedLines, coupon, confirmedAddress?.district ?? null)
  const itemCount = pricedLines.reduce((sum, line) => sum + line.quantity, 0)

  const asCheckoutAddress = (address: (typeof addresses)[number]): CheckoutAddress => ({
    id: address.id,
    label: address.label,
    fullName: address.fullName,
    phone: address.phone,
    division: address.division,
    district: address.district,
    area: address.area,
    addressLine: address.addressLine,
    isDefault: address.isDefault,
  })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="mb-5 text-xl font-bold tracking-tight text-ink sm:mb-6 sm:text-2xl">
        Checkout
      </h1>

      <CheckoutSteps current={step} addressId={selected?.id ?? null} method={method} />

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
        <div className="lg:col-span-7 xl:col-span-8">
          {step === 'address' ? (
            <AddressStep
              addresses={addresses.map(asCheckoutAddress)}
              selectedId={selected?.id ?? null}
              method={method}
              defaultFullName={user.name ?? ''}
              defaultPhone={user.phone}
            />
          ) : null}

          {/* `selected` is non-null whenever step !== 'address' — see the coercion above. The
              guard is here so TypeScript can see it too. */}
          {step === 'delivery' && selected ? (
            <DeliveryStep
              address={asCheckoutAddress(selected)}
              method={method}
              // Resolved here, at the request boundary — the clock is request-scoped data, not
              // something a component may reach for mid-render.
              estimatedDelivery={estimateDeliveryDate()}
            />
          ) : null}

          {step === 'payment' && selected ? (
            <PaymentStep
              options={PAYMENT_METHODS}
              selected={method}
              addressId={selected.id}
              total={summary.total}
            />
          ) : null}
        </div>

        <aside className="lg:col-span-5 lg:sticky lg:top-24 xl:col-span-4">
          <OrderSummary
            summary={summary}
            itemCount={itemCount}
            couponCode={summary.discount > 0 ? coupon?.code : null}
            district={confirmedAddress?.district ?? null}
            footnote={
              <span className="flex items-start gap-1.5">
                <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" aria-hidden="true" />
                <span>
                  Your order is only placed when you press <strong>Place Order</strong> on the
                  payment step.
                </span>
              </span>
            }
          />
        </aside>
      </div>
    </div>
  )
}
