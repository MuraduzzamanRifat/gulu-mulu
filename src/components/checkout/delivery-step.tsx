import Link from 'next/link'
import { ArrowRight, CalendarClock, MapPin, Truck } from 'lucide-react'

import { buttonVariants } from '@/components/ui'
import { formatBDT, formatDate } from '@/lib/format'
import { DELIVERY_FEE_INSIDE_DHAKA, calcDeliveryFee } from '@/lib/pricing'
import { cn } from '@/lib/utils'

import { checkoutHref } from './checkout-steps'
import type { CheckoutAddress } from './address-step'

export interface DeliveryStepProps {
  address: CheckoutAddress
  method: string | null
  /**
   * When the parcel should land. Passed IN rather than computed here.
   *
   * `Date.now()` is impure, and a component that reads the clock mid-render is a component whose
   * output changes on a re-render it did not ask for — which is exactly what `react-hooks/purity`
   * exists to catch. The estimate is request-scoped data, so the page resolves it once, at the
   * request boundary, and hands the component a fixed instant.
   */
  estimatedDelivery: Date
}

/** The promise on the tin, from the site metadata: "delivery within 48 hours". */
export const DELIVERY_WINDOW_HOURS = 48

/** The 48-hour estimate, resolved once per request by the caller. Impure by nature — hence not in render. */
export function estimateDeliveryDate(from: number = Date.now()): Date {
  return new Date(from + DELIVERY_WINDOW_HOURS * 60 * 60 * 1000)
}

/**
 * Show what delivery will cost and when it will land — a Server Component, because there is
 * nothing here to interact with. The fee is `calcDeliveryFee()` on the district of the address the
 * customer just picked; the same call runs again inside `placeOrder()`, against the same Address
 * row, so what is shown here is exactly what will be charged.
 */
export function DeliveryStep({ address, method, estimatedDelivery }: DeliveryStepProps) {
  const fee = calcDeliveryFee(address.district)
  // Ask the engine what "inside Dhaka" means rather than hard-coding 120 — the two rates live in
  // '@/lib/pricing' and this copy must never be able to contradict the number beside it.
  const insideDhaka = fee === DELIVERY_FEE_INSIDE_DHAKA

  return (
    <section className="rounded-card border border-line bg-surface">
      <header className="border-b border-line px-4 py-3.5 sm:px-5">
        <h2 className="text-base font-semibold text-ink">Delivery</h2>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3 rounded-lg bg-surface-muted p-3.5 sm:p-4">
          <MapPin className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />

          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold text-ink">{address.fullName}</p>
            <p className="text-ink-muted">{address.phone}</p>
            <p className="mt-1 text-ink-muted">
              {address.addressLine}, {address.area}, {address.district}, {address.division}
            </p>
          </div>

          <Link
            href={checkoutHref({ step: 'address', addressId: address.id, method })}
            className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Change
          </Link>
        </div>

        <div className="rounded-lg border border-line">
          <div className="flex items-start gap-3 border-b border-line p-3.5 sm:p-4">
            <Truck className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden="true" />

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Standard Delivery</p>
                <p className="text-base font-bold tabular-nums text-ink">{formatBDT(fee)}</p>
              </div>
              <p className="mt-0.5 text-sm text-ink-muted">
                {insideDhaka
                  ? `Inside Dhaka city — our own fleet delivers to ${address.area}.`
                  : `Outside Dhaka — courier delivery to ${address.district}.`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 sm:p-4">
            <CalendarClock className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                Estimated delivery within {DELIVERY_WINDOW_HOURS} hours
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">
                Expected by{' '}
                <strong className="font-medium text-ink">{formatDate(estimatedDelivery)}</strong>. A
                multi-seller order may arrive in more than one parcel — each shop dispatches its own.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Link
            href={checkoutHref({ step: 'payment', addressId: address.id, method })}
            className={cn(buttonVariants({ size: 'lg', fullWidth: true }))}
          >
            Continue to payment
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>

          <Link
            href={checkoutHref({ step: 'address', addressId: address.id, method })}
            className={cn(buttonVariants({ variant: 'outline', size: 'lg', fullWidth: true }))}
          >
            Back
          </Link>
        </div>
      </div>
    </section>
  )
}
