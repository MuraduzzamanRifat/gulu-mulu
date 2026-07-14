import * as React from 'react'
import type { Product } from '@/generated/prisma/client'
import { discountPercent, effectivePrice, formatBDT, isDiscounted } from '@/lib/format'
import { cn } from '@/lib/utils'
import { DiscountBadge } from './badge'

/**
 * Anything with a `price` and a nullable `discountPrice` — a Product row, or a
 * variant-adjusted object built at the call site. Money is always whole Taka.
 */
export type PriceProduct = Pick<Product, 'price' | 'discountPrice'>

export type PriceSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZES: Record<PriceSize, { price: string; original: string; badge: 'sm' | 'md' }> = {
  sm: { price: 'text-sm', original: 'text-xs', badge: 'sm' },
  md: { price: 'text-base', original: 'text-xs', badge: 'sm' },
  lg: { price: 'text-xl', original: 'text-sm', badge: 'md' },
  xl: { price: 'text-2xl sm:text-3xl', original: 'text-base', badge: 'md' },
}

export interface PriceProps extends React.HTMLAttributes<HTMLDivElement> {
  product: PriceProduct
  size?: PriceSize
  /** Hide the "40% OFF" flash (e.g. when the card already shows one on the image). */
  showBadge?: boolean
}

/**
 * The canonical price block: what you pay, in bold brand ink, with the struck
 * original and the saving beside it when the product is genuinely on offer.
 *
 * All derivation goes through the helpers in '@/lib/format' — never recompute
 * the discount here, or a bogus `discountPrice >= price` row would render a
 * fake saving.
 */
export function Price({ product, size = 'md', showBadge = true, className, ...props }: PriceProps) {
  const s = SIZES[size]
  const paid = effectivePrice(product)
  const discounted = isDiscounted(product)
  const percent = discounted ? discountPercent(product) : 0

  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-1', className)} {...props}>
      <span className={cn('font-bold tracking-tight text-brand-600 tabular-nums', s.price)}>
        {formatBDT(paid)}
      </span>

      {discounted ? (
        <>
          <s
            className={cn('text-ink-subtle tabular-nums', s.original)}
            aria-label={`Original price ${formatBDT(product.price)}`}
          >
            {formatBDT(product.price)}
          </s>
          {showBadge ? <DiscountBadge percent={percent} size={s.badge} /> : null}
        </>
      ) : null}
    </div>
  )
}
