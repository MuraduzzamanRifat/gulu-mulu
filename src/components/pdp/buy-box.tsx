'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, PackageX, ShoppingCart, Zap } from 'lucide-react'
import { toast } from 'sonner'

import { WishlistButton } from '@/components/product/wishlist-button'
import { Button, Price, QuantityInput, type PriceProduct } from '@/components/ui'
import { discountPercent, effectivePrice, formatBDT, isDiscounted } from '@/lib/format'
import { cn } from '@/lib/utils'

import {
  initialSelection,
  resolveVariant,
  VariantPicker,
  type PickerVariant,
  type VariantSelection,
} from './variant-picker'

/**
 * The whole right-hand buy column: price, stock, options, quantity, Add to Cart / Buy Now, heart.
 *
 * It is ONE client island rather than five, because every one of those things changes when the
 * shopper taps a different size — the price (a variant may override it), the stock line, the
 * quantity ceiling, and the id that goes to the cart. Splitting them would mean lifting the same
 * state into a wrapper anyway.
 *
 * It computes NOTHING authoritative. The unit price shown here mirrors `unitPriceFor()` in
 * '@/lib/cart' (variant override wins, else the product's effective price), but the number the
 * customer is actually charged is derived server-side from the DB row, from the ids this component
 * submits. If the two ever disagreed, the server would win — which is the correct outcome.
 */

/** Matches MAX_QTY_PER_LINE in '@/lib/cart'. */
const MAX_QTY = 99

/** Below this we start nudging ("Only 3 left!") — urgency, but only when it's true. */
const LOW_STOCK = 5

export interface BuyBoxProduct {
  id: string
  title: string
  price: number
  discountPrice: number | null
  stock: number
  variants: PickerVariant[]
}

export type AddToCartAction = (input: {
  productId: string
  variantId: string | null
  qty: number
}) => Promise<{ ok: true; count: number; clampedTo?: number } | { ok: false; error: string }>

export interface BuyBoxProps {
  product: BuyBoxProduct
  /** Server-known heart state. */
  wishlisted: boolean
  addToCartAction: AddToCartAction
  className?: string
}

type Mode = 'cart' | 'buy'

export function BuyBox({ product, wishlisted, addToCartAction, className }: BuyBoxProps) {
  const router = useRouter()

  const hasVariants = product.variants.length > 0
  const [selection, setSelection] = React.useState<VariantSelection>(() =>
    initialSelection(product.variants),
  )
  const [qty, setQty] = React.useState(1)
  const [pendingMode, setPendingMode] = React.useState<Mode | null>(null)
  const [isPending, startTransition] = React.useTransition()

  const variant = hasVariants ? resolveVariant(product.variants, selection) : null

  // A variant's `price` is an OVERRIDE, not a discount — when set, it IS the price, with no
  // strike-through. Same rule as unitPriceFor() in '@/lib/cart'.
  const priceProduct: PriceProduct =
    variant?.price != null ? { price: variant.price, discountPrice: null } : product

  const stock = hasVariants ? (variant?.stock ?? 0) : product.stock
  const outOfStock = stock <= 0
  const lowStock = stock > 0 && stock <= LOW_STOCK

  // The ceiling moves with the variant, so the committed qty is clamped at render rather than in an
  // effect — no flash of an impossible "10" while a state update settles.
  const maxQty = Math.max(1, Math.min(stock, MAX_QTY))
  const safeQty = Math.min(Math.max(1, qty), maxQty)

  const paid = effectivePrice(priceProduct)
  const discounted = isDiscounted(priceProduct)
  const saving = discounted ? priceProduct.price - paid : 0

  const busy = isPending && pendingMode !== null

  function submit(mode: Mode) {
    if (hasVariants && !variant) {
      toast.error('Please choose an option first.')
      return
    }
    if (outOfStock) return

    setPendingMode(mode)

    startTransition(async () => {
      const result = await addToCartAction({
        productId: product.id,
        variantId: variant?.id ?? null,
        qty: safeQty,
      })

      setPendingMode(null)

      if (!result.ok) {
        toast.error(result.error)
        // The stock we rendered is stale — pull the truth back down.
        router.refresh()
        return
      }

      if (result.clampedTo != null) {
        toast.warning(`Only ${result.clampedTo} left in stock — we added that many.`)
      } else {
        toast.success(`Added ${safeQty} × “${product.title}” to your cart`)
      }

      // Refresh so the header's cart badge (rendered in the shop layout) catches up.
      router.refresh()

      if (mode === 'buy') router.push('/checkout')
    })
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <Price product={priceProduct} size="xl" />

      {saving > 0 ? (
        <p className="mt-1.5 text-sm font-medium text-success">
          You save {formatBDT(saving)} ({discountPercent(priceProduct)}% off)
        </p>
      ) : null}

      <div className="mt-3">
        {outOfStock ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
            <PackageX className="size-4 shrink-0" aria-hidden="true" />
            Out of stock
          </span>
        ) : lowStock ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-danger">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            Only {stock} left!
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            In stock — {stock} available
          </span>
        )}
      </div>

      {hasVariants ? (
        <VariantPicker
          variants={product.variants}
          selection={selection}
          onChange={(next) => {
            setSelection(next)
            setQty(1) // a fresh option gets a fresh quantity; the old one may not fit its stock
          }}
          className="mt-5 border-t border-line pt-5"
        />
      ) : null}

      <div className="mt-5 flex items-center gap-3">
        <span className="text-sm font-semibold text-ink">Quantity</span>
        <QuantityInput
          value={safeQty}
          onChange={setQty}
          min={1}
          max={maxQty}
          disabled={outOfStock || busy}
          aria-label={`Quantity of ${product.title}`}
        />
        {!outOfStock && safeQty >= maxQty ? (
          <span className="text-xs text-ink-subtle">Max {maxQty}</span>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            disabled={outOfStock || busy}
            loading={busy && pendingMode === 'cart'}
            onClick={() => submit('cart')}
          >
            <ShoppingCart aria-hidden="true" />
            {outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Button>

          <WishlistButton
            productId={product.id}
            wishlisted={wishlisted}
            title={product.title}
            className="size-12 shrink-0 rounded-lg"
          />
        </div>

        <Button
          size="lg"
          fullWidth
          disabled={outOfStock || busy}
          loading={busy && pendingMode === 'buy'}
          onClick={() => submit('buy')}
        >
          <Zap aria-hidden="true" />
          Buy Now
        </Button>
      </div>

      <p className="mt-3 text-xs text-ink-subtle">
        Cash on Delivery available · Inspect before you pay
      </p>
    </div>
  )
}
