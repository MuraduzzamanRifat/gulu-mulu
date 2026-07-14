import Image from 'next/image'
import Link from 'next/link'

import { DiscountBadge, Price, Stars } from '@/components/ui'
import type { Brand, Product, ProductImage } from '@/generated/prisma/client'
import { discountPercent, isDiscounted, primaryImage, PLACEHOLDER_IMAGE } from '@/lib/format'
import { cn } from '@/lib/utils'

import { WishlistButton } from './wishlist-button'

/**
 * Exactly what a card needs — nothing more. Query with:
 *
 *   include: { images: true, brand: true }
 */
export type ProductCardProduct = Pick<
  Product,
  'id' | 'title' | 'slug' | 'price' | 'discountPrice' | 'stock' | 'rating' | 'reviewCount'
> & {
  images: Pick<ProductImage, 'url' | 'alt' | 'displayOrder'>[]
  brand?: Pick<Brand, 'name'> | null
}

export interface ProductCardProps {
  product: ProductCardProduct
  /** Whether the current shopper has already hearted this product. */
  wishlisted?: boolean
  /** Set on the first row above the fold — everything else stays lazy. */
  priority?: boolean
  className?: string
}

/** Dense grid on mobile, roomier on desktop — tells the optimizer which width to ship. */
const IMAGE_SIZES =
  '(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw'

/**
 * The workhorse of the storefront. A Server Component: the only client code is the
 * wishlist heart, so a grid of 40 cards ships almost no JS.
 *
 * The whole card is a link (a full-bleed overlay <a>), which keeps the markup a single
 * tap target on mobile without nesting interactive elements inside an anchor.
 */
export function ProductCard({
  product,
  wishlisted = false,
  priority = false,
  className,
}: ProductCardProps) {
  const src = primaryImage(product.images)
  const alt = product.images.find((image) => image.url === src)?.alt ?? product.title
  const outOfStock = product.stock <= 0
  const discounted = isDiscounted(product)

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface',
        'transition-[transform,box-shadow,border-color] duration-200',
        'hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        'focus-within:border-line-strong focus-within:shadow-md',
        className,
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-sunken">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={IMAGE_SIZES}
          priority={priority}
          quality={60}
          // The local SVG placeholder must bypass the optimizer (SVG is not optimizable).
          unoptimized={src === PLACEHOLDER_IMAGE}
          className={cn(
            'object-cover transition-transform duration-300 group-hover:scale-105',
            'motion-reduce:transition-none motion-reduce:group-hover:scale-100',
            outOfStock && 'opacity-70',
          )}
        />

        {discounted ? (
          <DiscountBadge
            percent={discountPercent(product)}
            size="sm"
            className="absolute top-2 left-2 z-20 shadow-xs"
          />
        ) : null}

        <WishlistButton
          productId={product.id}
          wishlisted={wishlisted}
          title={product.title}
          className="absolute top-2 right-2 z-20"
        />

        {outOfStock ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/45">
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink shadow-xs">
              Out of stock
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3">
        {/* ink-muted, not ink-subtle: the brand is content the shopper reads, and
            ink-subtle on white sits under 3:1. */}
        {product.brand ? (
          <p className="truncate text-xs text-ink-muted">{product.brand.name}</p>
        ) : null}

        <h3 className="line-clamp-2 text-sm leading-snug font-medium text-ink transition-colors group-hover:text-brand-600">
          {product.title}
        </h3>

        <Stars
          value={product.rating}
          count={product.reviewCount}
          size="sm"
          className="mt-0.5"
        />

        <Price product={product} size="md" showBadge={false} className="mt-auto pt-1.5" />
      </div>

      {/* Full-bleed link: sits above the image but below the wishlist heart (z-20). */}
      <Link
        href={`/product/${product.slug}`}
        className={cn(
          'absolute inset-0 z-10 cursor-pointer rounded-card',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        )}
      >
        <span className="sr-only">{product.title}</span>
      </Link>
    </article>
  )
}
