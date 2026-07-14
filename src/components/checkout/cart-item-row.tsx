'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { QuantityInput } from '@/components/ui'
import { removeCartLine, setCartItemQty } from '@/app/(shop)/cart/_actions'
import { PLACEHOLDER_IMAGE, formatBDT } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface CartItemRowProps {
  itemId: string
  title: string
  slug: string
  imageUrl: string
  imageAlt: string
  variantLabel: string | null
  /** The EFFECTIVE unit price, resolved server-side by `unitPriceFor()`. */
  unitPrice: number
  /** The strike-through original, when this line is genuinely discounted. Else null. */
  originalPrice: number | null
  quantity: number
  /** `lineTotal()` from the pricing engine — computed on the server, never here. */
  lineTotal: number
  /** Stock ceiling for the stepper (already min'd against the per-line cap). */
  maxQty: number
  available: boolean
  /** Why not, when `available` is false: "Out of stock.", "This seller is no longer active." */
  unavailableReason?: string
}

/**
 * One cart line.
 *
 * The quantity is optimistic (`useOptimistic`) so the stepper answers the thumb instantly, but the
 * LINE TOTAL is not: it is a server-rendered prop and it only moves when the Server Action comes
 * back. That asymmetry is deliberate. Money is never computed in the browser — recomputing
 * `unitPrice × qty` here would be a second, unaudited implementation of the pricing engine, and
 * the day a variant override or a bulk rule lands, the cart would start disagreeing with the
 * invoice. The total is dimmed while it's in flight, which is honest: it says "not settled yet".
 */
export function CartItemRow({
  itemId,
  title,
  slug,
  imageUrl,
  imageAlt,
  variantLabel,
  unitPrice,
  originalPrice,
  quantity,
  lineTotal,
  maxQty,
  available,
  unavailableReason,
}: CartItemRowProps) {
  const [pending, startTransition] = React.useTransition()
  const [optimisticQty, setOptimisticQty] = React.useOptimistic(quantity)
  // WHICH action is in flight, not merely THAT one is. `pending` alone conflated the two: stepping
  // the quantity dimmed the whole row and swapped the trash icon for a spinner, as if the line were
  // being deleted.
  const [removing, setRemoving] = React.useState(false)

  function changeQty(next: number) {
    startTransition(async () => {
      setOptimisticQty(next)

      const result = await setCartItemQty(itemId, next)

      if (!result.ok) {
        toast.error(result.error)
      } else if (result.clampedTo != null) {
        toast.warning(`Only ${result.clampedTo} left in stock — we've adjusted the quantity.`)
      }
    })
  }

  function remove() {
    if (removing) return
    setRemoving(true)

    startTransition(async () => {
      const result = await removeCartLine(itemId)

      if (!result.ok) {
        // The row survives, so hand it back to the shopper.
        setRemoving(false)
        toast.error(result.error)
      } else {
        // On success the revalidation unmounts this row — stay dimmed until it goes.
        toast.success(`${title} removed from your cart.`)
      }
    })
  }

  return (
    <li
      className={cn(
        'flex gap-3 px-3 py-4 sm:gap-4 sm:px-4',
        removing && 'opacity-70',
        !available && 'bg-surface-muted',
      )}
    >
      <Link
        href={`/product/${slug}`}
        className={cn(
          'relative size-20 shrink-0 overflow-hidden rounded-lg bg-surface-sunken sm:size-24',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
        )}
        tabIndex={-1}
        aria-hidden="true"
      >
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          sizes="96px"
          quality={60}
          unoptimized={imageUrl === PLACEHOLDER_IMAGE}
          className={cn('object-cover', !available && 'grayscale')}
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/product/${slug}`}
              className="line-clamp-2 text-sm font-medium text-ink hover:text-brand-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 sm:text-base"
            >
              {title}
            </Link>

            {variantLabel ? (
              <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">{variantLabel}</p>
            ) : null}
          </div>

          {/* Desktop line total. On mobile it drops to the bottom row, beside the stepper. */}
          <p
            className={cn(
              'hidden shrink-0 text-right text-base font-semibold tabular-nums text-ink sm:block',
              pending && 'animate-pulse',
              !available && 'text-ink-subtle line-through',
            )}
          >
            {formatBDT(lineTotal)}
          </p>
        </div>

        {available ? (
          <p className="text-xs text-ink-muted tabular-nums">
            {formatBDT(unitPrice)} each
            {originalPrice != null ? (
              <s className="ml-1.5 text-ink-subtle">{formatBDT(originalPrice)}</s>
            ) : null}
          </p>
        ) : (
          <p className="text-xs font-medium text-danger">
            {unavailableReason ?? 'This item is no longer available.'}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-3">
          {available ? (
            /*
             * NOT `disabled={pending}`. Blocking the stepper for the whole round-trip defeated the
             * `useOptimistic` above: the number moved instantly but the control you'd use to keep
             * stepping went grey, so every tap during the ~2–3s BD-mobile wait was swallowed and a
             * shopper wanting 5 had to tap-wait-tap-wait once per unit.
             *
             * Safe because `setCartItemQty` takes an ABSOLUTE quantity, not a delta, and Next.js
             * serialises Server Actions — so overlapping steps are last-write-wins and the final
             * request agrees with the server. (Contrast `addProductToCart` on the PDP, which
             * accumulates and therefore genuinely must be guarded.)
             */
            <QuantityInput
              value={optimisticQty}
              onChange={changeQty}
              min={1}
              max={maxQty}
              size="sm"
              disabled={removing}
              aria-label={`Quantity for ${title}`}
            />
          ) : (
            <span className="text-xs text-ink-muted">Not charged</span>
          )}

          <div className="flex items-center gap-3">
            <p
              className={cn(
                'text-sm font-semibold tabular-nums text-ink sm:hidden',
                pending && 'animate-pulse',
                !available && 'text-ink-subtle line-through',
              )}
            >
              {formatBDT(lineTotal)}
            </p>

            {/* size-11 (44px), not size-9 (36px). A destructive action sitting ~12px from the
                quantity "−" must not be the smaller of the two: an aimed decrement that misses
                silently deletes the line. */}
            <button
              type="button"
              onClick={remove}
              disabled={removing}
              aria-busy={removing || undefined}
              aria-label={`Remove ${title} from cart`}
              className={cn(
                'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg',
                'text-ink-muted transition-colors',
                'hover:bg-danger-soft hover:text-danger active:bg-danger-soft',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                'disabled:pointer-events-none disabled:opacity-50',
              )}
            >
              {removing ? (
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}
