'use client'

import * as React from 'react'
import { Tag, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button, Input } from '@/components/ui'
import { applyCouponCode, removeCouponCode } from '@/app/(shop)/cart/_actions'
import { formatBDT } from '@/lib/format'

export interface CouponFormProps {
  /** The code currently in the cookie, or null. */
  appliedCode: string | null
  /**
   * True when a code is applied but the pricing engine rejected it (expired, cart under the
   * minimum). The chip then shows as a warning rather than a win — the summary panel prints the
   * actual reason.
   */
  rejected?: boolean
}

/**
 * Apply / remove a coupon.
 *
 * The action returns the discount purely so the toast can be specific ("EIDSALE applied — ৳150
 * off"). Nothing is stored client-side and no total is computed here; the page re-renders from the
 * server with the real numbers.
 */
export function CouponForm({ appliedCode, rejected = false }: CouponFormProps) {
  const [pending, startTransition] = React.useTransition()
  const [code, setCode] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const entered = code.trim()
    if (!entered) {
      setError('Enter a coupon code.')
      return
    }

    startTransition(async () => {
      const result = await applyCouponCode(entered)

      if (!result.ok) {
        setError(result.error)
        return
      }

      setError(null)
      setCode('')
      toast.success(`${result.code} applied — ${formatBDT(result.discount)} off.`)
    })
  }

  function remove() {
    startTransition(async () => {
      await removeCouponCode()
      setError(null)
      toast.success('Coupon removed.')
    })
  }

  if (appliedCode) {
    return (
      <div className="rounded-card border border-line bg-surface p-4 sm:p-5">
        <p className="mb-3 text-sm font-semibold text-ink">Coupon</p>

        <div
          className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${
            rejected ? 'bg-danger-soft' : 'bg-success-soft'
          }`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Tag
              className={`size-4 shrink-0 ${rejected ? 'text-danger' : 'text-success'}`}
              aria-hidden="true"
            />
            <span
              className={`truncate font-mono text-sm font-semibold uppercase ${
                rejected ? 'text-danger' : 'text-success'
              }`}
            >
              {appliedCode}
            </span>
          </span>

          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label={`Remove coupon ${appliedCode}`}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={apply} className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <label htmlFor="coupon-code" className="mb-3 block text-sm font-semibold text-ink">
        Have a coupon?
      </label>

      <div className="flex gap-2">
        <Input
          id="coupon-code"
          name="code"
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
            if (error) setError(null)
          }}
          placeholder="EIDSALE"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          icon={Tag}
          // Boolean, not the string: the message is rendered below so it can't collide with the
          // one <Input> would emit under the same `${id}-error` id.
          error={Boolean(error)}
          aria-describedby={error ? 'coupon-code-error' : undefined}
          disabled={pending}
          containerClassName="flex-1"
          className="font-mono uppercase"
        />

        <Button type="submit" variant="outline" loading={pending} className="shrink-0">
          Apply
        </Button>
      </div>

      {error ? (
        <p id="coupon-code-error" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </form>
  )
}
