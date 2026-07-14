'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, SlidersHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui'
import { cn } from '@/lib/utils'

import { addWishlistItemToCartAction, removeFromWishlistAction } from './_actions'

export interface WishlistItemActionsProps {
  productId: string
  slug: string
  title: string
  /** Products with options can't be one-tap added — the shopper must pick a size/colour first. */
  hasVariants: boolean
  inStock: boolean
}

/**
 * The action row under a wishlisted product: add to cart (or go choose options) + remove.
 *
 * Removal is optimistic in feel — the row disables itself the instant it's tapped, and the card
 * disappears when the Server Action's `revalidatePath` re-renders the grid. `router.refresh()`
 * is the belt to that braces: it repaints the page even if the revalidated segment is served
 * from the client router cache.
 */
export function WishlistItemActions({
  productId,
  slug,
  title,
  hasVariants,
  inStock,
}: WishlistItemActionsProps) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  function addToCart() {
    startTransition(async () => {
      const result = await addWishlistItemToCartAction({ productId })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      if (result.clampedTo != null) {
        toast.warning(`Only ${result.clampedTo} left in stock — that's what we added.`)
      } else {
        toast.success(`Added “${title}” to your cart`)
      }

      router.refresh()
    })
  }

  function remove() {
    startTransition(async () => {
      const result = await removeFromWishlistAction({ productId })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success('Removed from your wishlist')
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      {hasVariants ? (
        <Link
          href={`/product/${slug}`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-9 flex-1 px-2')}
        >
          <SlidersHorizontal aria-hidden="true" />
          <span className="truncate">Choose options</span>
        </Link>
      ) : (
        <Button
          size="sm"
          fullWidth
          className="h-9 flex-1 px-2"
          loading={pending}
          disabled={!inStock}
          onClick={addToCart}
        >
          {!pending ? <ShoppingCart aria-hidden="true" /> : null}
          <span className="truncate">{inStock ? 'Add to cart' : 'Out of stock'}</span>
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        className="size-9 shrink-0 px-0 text-ink-muted hover:border-danger hover:bg-danger-soft hover:text-danger"
        disabled={pending}
        onClick={remove}
        aria-label={`Remove ${title} from your wishlist`}
        title="Remove from wishlist"
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  )
}
