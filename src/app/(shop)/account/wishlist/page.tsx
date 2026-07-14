import type { Metadata } from 'next'
import Link from 'next/link'
import { HeartOff } from 'lucide-react'

import { ProductCard } from '@/components/product'
import { buttonVariants, EmptyState } from '@/components/ui'
import { requireUser } from '@/lib/auth'
import { cn } from '@/lib/utils'

import { getWishlistEntries } from '../_queries'
import { WishlistItemActions } from './wishlist-item-actions'

export const metadata: Metadata = {
  title: 'Wishlist',
}

/**
 * Saved products.
 *
 * The tiles are the storefront's own `ProductCard` — same image, same price block, same discount
 * flash — with an action row bolted underneath. Reusing the card is the point: a wishlisted product
 * must look identical to the way it looked when it was hearted, or the page feels like a different
 * shop. The card's own heart is already filled and removes on tap; the explicit trash button next
 * to "Add to cart" is the same action with a label on it, for the shoppers who never learn that a
 * heart is a toggle.
 *
 * The grid columns match ProductGrid's, so the wishlist lines up with search and category pages.
 */
export default async function AccountWishlistPage() {
  const user = await requireUser()
  const entries = await getWishlistEntries(user.id)

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Wishlist</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {entries.length > 0
            ? `${entries.length} item${entries.length === 1 ? '' : 's'} saved for later.`
            : 'Tap the heart on any product to save it here.'}
        </p>
      </header>

      {entries.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {entries.map(({ id, product }, index) => (
            <div key={id} className="flex flex-col gap-2">
              <ProductCard product={product} wishlisted priority={index < 4} className="flex-1" />

              <WishlistItemActions
                productId={product.id}
                slug={product.slug}
                title={product.title}
                hasVariants={product.variants.length > 0}
                inStock={product.stock > 0}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-card border border-line bg-surface">
          <EmptyState
            icon={HeartOff}
            title="Your wishlist is empty"
            description="Save the things you’re thinking about, and they’ll be waiting here — on any device you sign in from."
            action={
              // Styled <Link> — a <button> nested inside an <a> is invalid markup.
              <Link href="/" className={cn(buttonVariants({ size: 'lg' }))}>
                Browse products
              </Link>
            }
          />
        </div>
      )}
    </div>
  )
}
