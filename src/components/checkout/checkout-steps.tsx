import Link from 'next/link'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Checkout is three steps, and ALL of its state lives in the URL.
 *
 *   /checkout?step=payment&address=cm...&method=COD
 *
 * That is the whole reason state is never lost here. Refresh the page, hit the browser back
 * button, tap a link in the stepper, or send the URL to yourself — the chosen address and payment
 * method are right there in the query string, re-validated server-side on every render (the
 * address must still belong to you; the method must still be a real PaymentMethod). There is no
 * client-held wizard state to drop, no context provider to remount, and no "your session expired,
 * start again" — the failure mode that kills more BD checkouts than any other, on flaky mobile
 * data where a page reload is routine.
 */
export type CheckoutStep = 'address' | 'delivery' | 'payment'

export const CHECKOUT_STEPS: readonly { step: CheckoutStep; label: string }[] = [
  { step: 'address', label: 'Address' },
  { step: 'delivery', label: 'Delivery' },
  { step: 'payment', label: 'Payment' },
]

const STEP_INDEX: Record<CheckoutStep, number> = { address: 0, delivery: 1, payment: 2 }

export interface CheckoutHrefParams {
  step: CheckoutStep
  addressId?: string | null
  method?: string | null
}

/** Build a checkout URL that carries the state forward. Pure — usable from server AND client. */
export function checkoutHref({ step, addressId, method }: CheckoutHrefParams): string {
  const params = new URLSearchParams({ step })
  if (addressId) params.set('address', addressId)
  if (method) params.set('method', method)

  return `/checkout?${params.toString()}`
}

/** Coerce an untrusted `?step=` into a real step. Anything unrecognised falls back to 'address'. */
export function parseStep(raw: string | undefined): CheckoutStep {
  return raw === 'delivery' || raw === 'payment' ? raw : 'address'
}

export interface CheckoutStepsProps {
  current: CheckoutStep
  /** Without an address, steps 2 and 3 have nothing to compute — so they aren't links. */
  addressId: string | null
  method: string | null
  className?: string
}

/**
 * The progress rail. Completed steps are links (going BACK to fix your address is a normal thing
 * to want, and forcing a restart to do it is how carts get abandoned); steps ahead of you are inert
 * until they have the data they need.
 */
export function CheckoutSteps({ current, addressId, method, className }: CheckoutStepsProps) {
  const currentIndex = STEP_INDEX[current]

  return (
    <nav aria-label="Checkout progress" className={cn('mb-6 sm:mb-8', className)}>
      <ol className="flex items-center">
        {CHECKOUT_STEPS.map(({ step, label }, index) => {
          const done = index < currentIndex
          const active = index === currentIndex
          // Only completed steps are links. You may always go BACK to fix something; you may never
          // click FORWARD past a step whose data the next one depends on.
          const reachable = done

          const marker = (
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                done && 'border-brand-500 bg-brand-500 text-white',
                active && 'border-brand-500 bg-brand-50 text-brand-700',
                !done && !active && 'border-line bg-surface text-ink-subtle',
              )}
            >
              {done ? <Check className="size-4" aria-hidden="true" /> : index + 1}
            </span>
          )

          const text = (
            <span
              className={cn(
                'text-xs font-medium sm:text-sm',
                active && 'text-ink',
                done && 'text-ink-muted',
                !done && !active && 'text-ink-subtle',
              )}
            >
              {label}
            </span>
          )

          return (
            <li key={step} className={cn('flex items-center', index > 0 && 'flex-1')}>
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'mx-2 h-px flex-1 transition-colors sm:mx-3',
                    index <= currentIndex ? 'bg-brand-500' : 'bg-line',
                  )}
                />
              ) : null}

              {reachable ? (
                <Link
                  href={checkoutHref({ step, addressId, method })}
                  aria-current={active ? 'step' : undefined}
                  className="flex items-center gap-2 rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                >
                  {marker}
                  {text}
                </Link>
              ) : (
                <span
                  aria-current={active ? 'step' : undefined}
                  className="flex items-center gap-2"
                >
                  {marker}
                  {text}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
