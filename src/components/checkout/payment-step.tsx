'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, BadgeCheck, Banknote, CreditCard, Lock, Wallet } from 'lucide-react'

import { Badge, Button, buttonVariants } from '@/components/ui'
import { placeOrder } from '@/app/(shop)/checkout/_actions'
import type { PaymentMethodOption } from '@/lib/payments/methods'
import { formatBDT } from '@/lib/format'
import { cn } from '@/lib/utils'

import { checkoutHref } from './checkout-steps'

export interface PaymentStepProps {
  /**
   * Passed in from the Server Component — NOT imported here. `@/lib/payments/methods` pulls in the
   * Prisma enum, and `@/generated/prisma/client` drags `node:path` and the whole query engine with
   * it. It must never cross into a client bundle. Only the TYPE is imported above, and types are
   * erased at compile time.
   */
  options: readonly PaymentMethodOption[]
  /** From `?method=`, already coerced server-side to a real PaymentMethod (default: COD). */
  selected: string
  addressId: string
  /** For the button — a customer should see what they're about to commit to, on the button itself. */
  total: number
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  COD: Banknote,
  BKASH: Wallet,
  NAGAD: Wallet,
  SSLCOMMERZ: CreditCard,
}

export function PaymentStep({ options, selected, addressId, total }: PaymentStepProps) {
  const router = useRouter()

  const [method, setMethod] = React.useState(selected)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  const chosen = options.find((option) => option.method === method)

  function choose(next: string) {
    setMethod(next)
    setError(null)
    // Keep the URL in step with the choice, so a refresh (or the browser back button from the
    // gateway) lands the customer exactly where they were, with the method they picked.
    router.replace(checkoutHref({ step: 'payment', addressId, method: next }), { scroll: false })
  }

  function submit() {
    setError(null)

    startTransition(async () => {
      // On success this never returns — the Server Action redirects to the order (COD) or to the
      // mock gateway. So anything we get back is a failure worth showing.
      const result = await placeOrder({
        addressId,
        // Deliberately sent as a plain string. The action re-parses it with `z.enum(PaymentMethod)`
        // and would reject anything else; nothing here is load-bearing.
        paymentMethod: method as PaymentMethodOption['method'],
      })

      if (result && !result.ok) setError(result.error)
    })
  }

  return (
    <section className="rounded-card border border-line bg-surface">
      <header className="border-b border-line px-4 py-3.5 sm:px-5">
        <h2 className="text-base font-semibold text-ink">Payment method</h2>
      </header>

      <div className="p-4 sm:p-5">
        <ul role="radiogroup" aria-label="Payment method" className="space-y-3">
          {options.map((option) => {
            const active = method === option.method
            const Icon = ICONS[option.method] ?? CreditCard

            return (
              <li key={option.method}>
                <label
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-lg border p-3.5 transition-colors sm:p-4',
                    active
                      ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500'
                      : 'border-line hover:border-line-strong hover:bg-surface-muted',
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.method}
                    checked={active}
                    onChange={() => choose(option.method)}
                    disabled={pending}
                    className="mt-0.5 size-4 shrink-0 border-line text-brand-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
                  />

                  <Icon
                    className={cn(
                      'mt-0.5 size-5 shrink-0',
                      active ? 'text-brand-600' : 'text-ink-subtle',
                    )}
                    aria-hidden="true"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{option.label}</span>

                      {option.tag ? (
                        <Badge variant="success" size="sm">
                          <BadgeCheck aria-hidden="true" />
                          {option.tag}
                        </Badge>
                      ) : null}
                    </div>

                    <p className="mt-0.5 text-sm text-ink-muted">{option.description}</p>
                  </div>
                </label>
              </li>
            )
          })}
        </ul>

        {/* No pretending. If it isn't cash, it goes to a mock gateway, and the customer is told so
            BEFORE they commit — not after they've handed over a card number they think is live. */}
        {chosen?.redirectsToGateway ? (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-xs text-accent-700">
            <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            <span>
              <strong className="font-semibold">Demo:</strong> Gulu Mulu is not connected to a live
              payment gateway. You will be taken to a simulated {chosen.label} page where you can
              mark the payment as successful or failed. No real money moves.
            </span>
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <Button size="lg" fullWidth loading={pending} onClick={submit}>
            <Lock aria-hidden="true" />
            Place Order · {formatBDT(total)}
          </Button>

          <Link
            href={checkoutHref({ step: 'delivery', addressId, method })}
            className={cn(buttonVariants({ variant: 'outline', size: 'lg', fullWidth: true }))}
          >
            Back
          </Link>
        </div>

        <p className="mt-3 text-center text-xs text-ink-muted">
          By placing this order you agree to Gulu Mulu&rsquo;s{' '}
          <Link href="/page/terms" className="underline hover:text-ink">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/page/return-policy" className="underline hover:text-ink">
            Return Policy
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
