import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { SectionHeading } from '@/components/product'
import { DiscountBadge } from '@/components/ui'
import { Tilt3D } from '@/components/motion/tilt-3d'
import { PLACEHOLDER_IMAGE } from '@/lib/format'
import type { DealCategory } from '@/lib/queries'
import { cn } from '@/lib/utils'

export interface DealCategoryGridProps {
  deals: DealCategory[]
}

/**
 * The deal grid. Every "% OFF" here is the biggest saving you can actually put in your basket
 * inside that category right now — `getDealCategories()` derives it from live, in-stock, approved
 * listings with the same `discountPercent()` the product card uses. The badge on this grid can
 * therefore never promise a discount the category cannot deliver, which is the failure mode that
 * kills trust on a marketplace.
 *
 * The first two cards run double-width: the query returns the deepest discounts first, so the
 * layout's emphasis and the data's emphasis are the same thing.
 */
export function DealCategoryGrid({ deals }: DealCategoryGridProps) {
  if (deals.length === 0) return null

  return (
    <section aria-label="Deals by category">
      <SectionHeading
        title="Deals of the week"
        subtitle="Live discounts, straight from what sellers are marking down"
        href="/products/search?sort=best_selling"
        linkLabel="See all deals"
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {deals.map((deal, index) => {
          const hero = index < 2

          return (
            // Full-bleed on a phone, half the row on desktop — the two deepest deals lead. The
            // col-span lives on the tilt wrapper (the grid child), not the inner link.
            <Tilt3D key={deal.category.id} intensity={hero ? 5 : 8} scale={1.02} className={cn(hero && 'col-span-2')}>
            <Link
              href={`/category/${deal.category.slug}`}
              className={cn(
                'group relative block overflow-hidden rounded-card border border-line bg-surface-sunken',
                'transition-[box-shadow,border-color] duration-200',
                'hover:border-brand-200 hover:shadow-lg',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
              )}
            >
              <div className={cn('relative w-full', hero ? 'aspect-[16/9]' : 'aspect-[4/3]')}>
                <Image
                  src={deal.imageUrl || PLACEHOLDER_IMAGE}
                  alt=""
                  fill
                  sizes={
                    hero
                      ? '(min-width: 768px) 50vw, 100vw'
                      : '(min-width: 768px) 25vw, 50vw'
                  }
                  quality={60}
                  unoptimized={!deal.imageUrl}
                  className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                />

                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-transparent"
                />

                <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
                  <span className="rounded-full bg-black/55 px-1.5 py-0.5 text-[0.625rem] leading-4 font-semibold tracking-wide text-white uppercase backdrop-blur-sm">
                    Up to
                  </span>
                  <DiscountBadge
                    percent={deal.maxDiscountPercent}
                    size={hero ? 'md' : 'sm'}
                    className="shadow-xs"
                  />
                </div>

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2.5 sm:p-3">
                  <div className="min-w-0">
                    <h3
                      className={cn(
                        'line-clamp-2 leading-snug font-bold text-white',
                        hero ? 'text-base sm:text-xl' : 'text-sm sm:text-base',
                      )}
                    >
                      {deal.category.name}
                    </h3>
                  </div>

                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm',
                      'transition-[background-color,transform] duration-200',
                      'group-hover:bg-brand-500 group-hover:translate-x-0.5',
                      'motion-reduce:group-hover:translate-x-0 sm:size-8',
                    )}
                  >
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </div>
            </Link>
            </Tilt3D>
          )
        })}
      </div>
    </section>
  )
}
