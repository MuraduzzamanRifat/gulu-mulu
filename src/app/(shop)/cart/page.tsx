import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ShieldCheck, ShoppingBag, Store } from 'lucide-react'

import { Button, EmptyState, buttonVariants } from '@/components/ui'
import { CartItemRow } from '@/components/checkout/cart-item-row'
import { CouponForm } from '@/components/checkout/coupon-form'
import { OrderSummary } from '@/components/checkout/order-summary'
import {
  getCart,
  lineAvailability,
  toPricedLines,
  unitPriceFor,
  type CartLine,
} from '@/lib/cart'
import { isDiscounted, primaryImage, variantLabel } from '@/lib/format'
import { lineTotal, summarizeCart } from '@/lib/pricing'
import { cn } from '@/lib/utils'

import { getAppliedCoupon } from './_coupon'

export const metadata: Metadata = {
  title: 'Shopping Cart',
  description: 'Review the items in your Gulu Mulu cart before checking out.',
  robots: { index: false, follow: false },
}

interface SellerGroup {
  sellerId: string
  businessName: string
  slug: string
  lines: CartLine[]
}

/**
 * Group the cart by seller, preserving the cart's own line order.
 *
 * This is not decoration. On a marketplace one basket routinely spans three shops, each of which
 * packs, ships and is paid separately — the customer needs to see that before they wonder why one
 * parcel turned up on Tuesday and the other on Thursday.
 */
function groupBySeller(lines: readonly CartLine[]): SellerGroup[] {
  const groups = new Map<string, SellerGroup>()

  for (const line of lines) {
    const { seller } = line.product

    const existing = groups.get(seller.id)
    if (existing) {
      existing.lines.push(line)
    } else {
      groups.set(seller.id, {
        sellerId: seller.id,
        businessName: seller.businessName,
        slug: seller.slug,
        lines: [line],
      })
    }
  }

  return [...groups.values()]
}

export default async function CartPage() {
  // Both reads are React-cached, so the header's badge (rendered by the layout above us) and this
  // page share the same two queries.
  const [cart, coupon] = await Promise.all([getCart(), getAppliedCoupon()])

  const lines = cart?.items ?? []

  if (lines.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Nothing here yet. Browse the deals, the new arrivals, or search for what you came for — everything ships within 48 hours."
          action={
            // A styled <Link>, not a <Button> wrapping one — an <a> inside a <button> is invalid
            // markup and screen readers hate it. `buttonVariants` gives the exact same pixels.
            <Link href="/" className={cn(buttonVariants({ size: 'lg' }), 'px-8')}>
              Start shopping
            </Link>
          }
        />
      </div>
    )
  }

  // `toPricedLines` drops anything unbuyable (rejected product, suspended shop, out of stock), so
  // an unavailable line renders on the page but never reaches the total. We never charge for
  // something we cannot ship.
  const pricedLines = toPricedLines(cart)
  const summary = summarizeCart(pricedLines, coupon, null)
  const itemCount = pricedLines.reduce((sum, line) => sum + line.quantity, 0)

  const groups = groupBySeller(lines)
  const unavailableCount = lines.length - pricedLines.length
  const canCheckout = pricedLines.length > 0

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-5 sm:mb-8">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Shopping Cart</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {itemCount} {itemCount === 1 ? 'item' : 'items'} from {groups.length}{' '}
          {groups.length === 1 ? 'seller' : 'sellers'}
          {unavailableCount > 0 ? (
            <span className="text-danger">
              {' '}
              · {unavailableCount} unavailable {unavailableCount === 1 ? 'item' : 'items'}
            </span>
          ) : null}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
        {/* ---------------------------------------------------------------- Lines */}
        <div className="space-y-4 lg:col-span-8">
          {groups.map((group) => (
            <section
              key={group.sellerId}
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
                {group.lines.map((line) => {
                  const { available, maxQty, reason } = lineAvailability(line)
                  const unitPrice = unitPriceFor(line.product, line.variant)
                  const image = primaryImage(line.product.images)

                  // The strike-through only makes sense on a line that takes the PRODUCT's price.
                  // A variant with its own `price` is an override, not a discount off the parent —
                  // showing the parent's old price beside it would be a lie.
                  const showOriginal =
                    line.variant?.price == null && isDiscounted(line.product)

                  return (
                    <CartItemRow
                      key={line.id}
                      itemId={line.id}
                      title={line.product.title}
                      slug={line.product.slug}
                      imageUrl={image}
                      imageAlt={
                        line.product.images.find((img) => img.url === image)?.alt ??
                        line.product.title
                      }
                      variantLabel={line.variant ? variantLabel(line.variant) : null}
                      unitPrice={unitPrice}
                      originalPrice={showOriginal ? line.product.price : null}
                      quantity={line.quantity}
                      lineTotal={lineTotal({ unitPrice, quantity: line.quantity })}
                      maxQty={maxQty}
                      available={available}
                      unavailableReason={reason}
                    />
                  )
                })}
              </ul>
            </section>
          ))}

          {/* min-h-11 / -ml-2: a 44px thumb target that still optically aligns with the cards
              above it. This is the only way back into the catalogue from the cart. */}
          <Link
            href="/"
            className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-ink-muted transition-colors hover:text-brand-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            Continue shopping
          </Link>
        </div>

        {/* -------------------------------------------------------------- Summary */}
        <aside className="space-y-4 lg:col-span-4 lg:sticky lg:top-24">
          <CouponForm appliedCode={coupon?.code ?? null} rejected={Boolean(summary.couponError)} />

          <OrderSummary
            summary={summary}
            itemCount={itemCount}
            couponCode={summary.discount > 0 ? coupon?.code : null}
            district={null}
            action={
              canCheckout ? (
                <Link
                  href="/checkout"
                  className={cn(buttonVariants({ size: 'lg', fullWidth: true }))}
                >
                  Proceed to Checkout
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Link>
              ) : (
                <Button size="lg" fullWidth disabled>
                  Nothing available to check out
                </Button>
              )
            }
            footnote={
              <span className="flex items-start gap-1.5">
                <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" aria-hidden="true" />
                <span>Cash on Delivery available. Pay only after you have checked the parcel.</span>
              </span>
            }
          />
        </aside>
      </div>
    </div>
  )
}
