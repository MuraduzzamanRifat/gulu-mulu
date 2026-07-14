import Image from 'next/image'
import Link from 'next/link'

import { SectionHeading } from '@/components/product'
import type { Category } from '@/generated/prisma/client'
import { PLACEHOLDER_IMAGE } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface CategoryRailProps {
  categories: Category[]
}

/**
 * The circular quick-nav — the shortest path from "I just landed" to a category page, and on a
 * phone the single most-tapped element on the homepage.
 *
 * Two layouts, one data set: a swipeable one-row rail on mobile (`snap-rail`, bleeding to the
 * screen edge through the negative margin so the last tile peeks and the rail reads as scrollable),
 * and a static two-row grid on desktop where there is room to show everything at once.
 */
export function CategoryRail({ categories }: CategoryRailProps) {
  if (categories.length === 0) return null

  return (
    <section aria-label="Shop by category">
      <SectionHeading
        title="Shop by category"
        subtitle="Everything Bangladesh is buying, one tap away"
      />

      {/* Mobile: one swipeable row. */}
      <div className="snap-rail -mx-4 flex gap-4 px-4 pb-1 md:hidden">
        {categories.map((category) => (
          <CategoryTile key={category.id} category={category} className="w-18 shrink-0 snap-start" />
        ))}
      </div>

      {/* Desktop: 12 featured categories fall into two clean rows of six. */}
      <div className="hidden gap-x-4 gap-y-5 md:grid md:grid-cols-6">
        {categories.map((category) => (
          <CategoryTile key={category.id} category={category} />
        ))}
      </div>
    </section>
  )
}

function CategoryTile({ category, className }: { category: Category; className?: string }) {
  const src = category.imageUrl ?? PLACEHOLDER_IMAGE

  return (
    <Link
      href={`/category/${category.slug}`}
      className={cn(
        'group flex flex-col items-center gap-2 rounded-lg py-1',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
        className,
      )}
    >
      <span
        className={cn(
          'relative block size-18 overflow-hidden rounded-full bg-surface-sunken sm:size-20',
          'ring-2 ring-line transition-[box-shadow,transform] duration-200',
          'group-hover:ring-brand-300 group-hover:ring-offset-2 group-hover:ring-offset-surface',
        )}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes="80px"
          quality={60}
          unoptimized={src === PLACEHOLDER_IMAGE}
          className="object-cover transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100"
        />
      </span>

      <span className="line-clamp-2 w-full text-center text-xs leading-snug font-medium text-ink transition-colors group-hover:text-brand-600 sm:text-[0.8125rem]">
        {category.name}
      </span>
    </Link>
  )
}
