import { cn } from '@/lib/utils'

import { ProductCard, type ProductCardProduct } from './product-card'

export interface ProductGridProps {
  products: ProductCardProduct[]
  /** Ids the current shopper has hearted — pass to keep the hearts filled on load. */
  wishlistedIds?: string[]
  /** How many leading cards get `priority` (above-the-fold images). Default 4. */
  priorityCount?: number
  className?: string
}

/**
 * The catalogue grid: 2 columns on a phone (BD's dominant device), stepping up to
 * 5 on a wide desktop.
 */
export function ProductGrid({
  products,
  wishlistedIds,
  priorityCount = 4,
  className,
}: ProductGridProps) {
  const wishlisted = new Set(wishlistedIds ?? [])

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5',
        className,
      )}
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          wishlisted={wishlisted.has(product.id)}
          priority={index < priorityCount}
        />
      ))}
    </div>
  )
}

export interface ProductRailProps {
  products: ProductCardProduct[]
  wishlistedIds?: string[]
  className?: string
}

/**
 * The horizontal variant — "Related products", "You may also like", homepage strips.
 *
 * Uses the `snap-rail` utility from globals.css: scrolls on the x-axis, snaps to each
 * card, and hides the scrollbar so it reads like a native app carousel. The negative
 * margins let the cards bleed to the screen edge on mobile while the section keeps its
 * `px-4` padding.
 */
export function ProductRail({ products, wishlistedIds, className }: ProductRailProps) {
  const wishlisted = new Set(wishlistedIds ?? [])

  return (
    <div
      className={cn(
        'snap-rail -mx-4 flex gap-3 px-4 pb-2 sm:mx-0 sm:gap-4 sm:px-0',
        className,
      )}
    >
      {products.map((product) => (
        <div
          key={product.id}
          className="w-40 shrink-0 snap-start sm:w-48 lg:w-56"
        >
          <ProductCard product={product} wishlisted={wishlisted.has(product.id)} />
        </div>
      ))}
    </div>
  )
}
