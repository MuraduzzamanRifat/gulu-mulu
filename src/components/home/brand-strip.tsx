import Image from 'next/image'
import Link from 'next/link'

import { SectionHeading } from '@/components/product'
import type { Brand } from '@/generated/prisma/client'
import { cn } from '@/lib/utils'

export interface BrandStripProps {
  brands: Brand[]
}

/**
 * The brand carousel. Borrowed authority: seeing Aarong and Le Reve on the page is what tells a
 * shopper this marketplace is not a scam. Scrolls horizontally at every width — a wrapping grid
 * of logos reads as clutter, a single rail reads as a shelf.
 */
export function BrandStrip({ brands }: BrandStripProps) {
  if (brands.length === 0) return null

  return (
    <section aria-label="Featured brands">
      <SectionHeading title="Top brands" subtitle="Authorised sellers, authentic products" />

      <div className="snap-rail -mx-4 flex gap-3 px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/brand/${brand.slug}`}
            title={brand.name}
            className={cn(
              'group grid h-16 w-28 shrink-0 snap-start place-items-center overflow-hidden rounded-card p-3',
              'border border-line bg-surface transition-[border-color,box-shadow] duration-200',
              'hover:border-line-strong hover:shadow-md sm:h-20 sm:w-36',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
            )}
          >
            {brand.logoUrl ? (
              <Image
                src={brand.logoUrl}
                alt={brand.name}
                width={120}
                height={60}
                quality={60}
                className="h-full w-auto max-w-full object-contain transition-transform duration-200 group-hover:scale-105 motion-reduce:group-hover:scale-100"
              />
            ) : (
              // No logo uploaded yet — the wordmark still has to hold the tile.
              <span className="line-clamp-2 text-center text-sm font-bold tracking-tight text-ink-muted transition-colors group-hover:text-brand-600">
                {brand.name}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
