import { Truck } from 'lucide-react'

import { Badge } from '@/components/ui'
import { formatBDT } from '@/lib/format'
import type { CartSummary } from '@/lib/pricing'
import { cn } from '@/lib/utils'

export interface OrderSummaryProps {
  /** Straight from `summarizeCart()`. Never build this object by hand. */
  summary: CartSummary
  /** Units, not lines — "3 items" when it's one shirt ×3. */
  itemCount: number
  /** The code actually applied, so the discount row can name it. */
  couponCode?: string | null
  /**
   * Null on the cart page, where no address is chosen yet. The fee is then the OUTSIDE-Dhaka
   * estimate (the pricing engine's deliberate choice), so we say "estimated" rather than lie.
   */
  district?: string | null
  /** The CTA — "Proceed to Checkout", "Place Order", or nothing on a placed order. */
  action?: React.ReactNode
  /** Rendered under the CTA (e.g. the COD reassurance line). */
  footnote?: React.ReactNode
  className?: string
}

/**
 * The money panel. Every figure comes from `summarizeCart()` — this component does no arithmetic
 * whatsoever, not even a subtraction, so the cart, the checkout and the order confirmation are
 * mathematically incapable of disagreeing with each other.
 */
export function OrderSummary({
  summary,
  itemCount,
  couponCode,
  district,
  action,
  footnote,
  className,
}: OrderSummaryProps) {
  const { subtotal, deliveryFee, discount, total, couponError } = summary
  const feeIsEstimate = !district

  return (
    <div className={cn('rounded-card border border-line bg-surface', className)}>
      <div className="border-b border-line px-4 py-3.5 sm:px-5">
        <h2 className="text-base font-semibold text-ink">Order Summary</h2>
      </div>

      <dl className="space-y-3 px-4 py-4 text-sm sm:px-5">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-muted">
            Subtotal
            <span className="ml-1 text-ink-subtle">
              ({itemCount} {itemCount === 1 ? 'item' : 'items'})
            </span>
          </dt>
          <dd className="font-medium tabular-nums text-ink">{formatBDT(subtotal)}</dd>
        </div>

        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-muted">
            Delivery
            {feeIsEstimate ? <span className="ml-1 text-ink-subtle">(estimated)</span> : null}
          </dt>
          <dd className="font-medium tabular-nums text-ink">
            {deliveryFee > 0 ? formatBDT(deliveryFee) : '—'}
          </dd>
        </div>

        {discount > 0 ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="flex flex-wrap items-center gap-1.5 text-ink-muted">
              Discount
              {couponCode ? (
                <Badge variant="success" size="sm" className="font-mono uppercase">
                  {couponCode}
                </Badge>
              ) : null}
            </dt>
            <dd className="font-medium tabular-nums text-success">−{formatBDT(discount)}</dd>
          </div>
        ) : null}

        {/* A coupon that WAS applied and has since gone bad (expired mid-session, cart fell under
            its minimum). Silence here would just show a total that quietly went up. */}
        {couponError ? (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
            {couponError} It has not been applied.
          </p>
        ) : null}

        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <dt className="text-base font-semibold text-ink">Total</dt>
          <dd className="text-lg font-bold tabular-nums text-brand-600">{formatBDT(total)}</dd>
        </div>
      </dl>

      {action || footnote ? (
        <div className="space-y-3 border-t border-line px-4 py-4 sm:px-5">
          {action}
          {footnote ? <div className="text-xs text-ink-muted">{footnote}</div> : null}
        </div>
      ) : null}

      {feeIsEstimate && subtotal > 0 ? (
        <p className="flex items-start gap-2 border-t border-line px-4 py-3 text-xs text-ink-muted sm:px-5">
          <Truck className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span>
            Delivery is {formatBDT(60)} inside Dhaka and {formatBDT(120)} elsewhere. The exact fee is
            set once you choose an address.
          </span>
        </p>
      ) : null}
    </div>
  )
}
