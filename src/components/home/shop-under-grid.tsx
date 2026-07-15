import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { SectionHeading } from '@/components/product'
import { Tilt3D } from '@/components/motion/tilt-3d'
import { formatBDT, PLACEHOLDER_IMAGE } from '@/lib/format'
import type { getCollections } from '@/lib/queries'
import { cn } from '@/lib/utils'

type BudgetCollection = Awaited<ReturnType<typeof getCollections>>[number]

export interface ShopUnderGridProps {
  collections: BudgetCollection[]
}

/**
 * "Shop Under ৳999" — the signature merchandising pattern of this marketplace, and the highest
 * intent surface on the homepage. A shopper who lands here is not browsing a category, they are
 * browsing a *budget*, which is how price-led BD e-commerce actually converts.
 *
 * Every card is a deep link into the real search with the filters already applied, so the result
 * page is a genuine, shareable, bookmarkable URL rather than a bespoke listing — one code path,
 * and the facets/sort keep working from there.
 */
export function ShopUnderGrid({ collections }: ShopUnderGridProps) {
  if (collections.length === 0) return null

  return (
    <section aria-label="Shop under your budget">
      <SectionHeading
        title="Shop under your budget"
        subtitle="Pick a price, we have already done the filtering"
        href="/products/search"
        linkLabel="Browse all"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {collections.map((collection) => (
          <BudgetCard key={collection.id} collection={collection} />
        ))}
      </div>
    </section>
  )
}

/**
 * `/products/search?priceMax=999&categories=skincare` — exactly the params the search page reads.
 * A collection is anchored on a category OR a brand (never both), so the budget always narrows
 * something real instead of dumping the whole catalogue under a ceiling.
 */
function collectionHref(collection: BudgetCollection): string {
  const params = new URLSearchParams({ priceMax: String(collection.priceMax) })

  if (collection.category) params.set('categories', collection.category.slug)
  else if (collection.brand) params.set('brands', collection.brand.slug)

  return `/products/search?${params.toString()}`
}

function BudgetCard({ collection }: { collection: BudgetCollection }) {
  const src = collection.imageUrl ?? PLACEHOLDER_IMAGE
  const scope = collection.category?.name ?? collection.brand?.name

  return (
    <Tilt3D intensity={7} scale={1.03}>
    <Link
      href={collectionHref(collection)}
      className={cn(
        'group relative block overflow-hidden rounded-card border border-line bg-surface-sunken',
        'transition-[box-shadow,border-color] duration-200',
        'hover:border-brand-200 hover:shadow-lg',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
      )}
    >
      <div className="relative aspect-square w-full">
        <Image
          src={src}
          alt=""
          fill
          sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
          quality={60}
          unoptimized={src === PLACEHOLDER_IMAGE}
          className="object-cover transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-black/90 via-black/45 to-black/5"
        />

        {/* The number is the hook — it gets the loudest thing on the card. */}
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-accent-500 px-2 py-0.5 text-[0.625rem] font-bold tracking-wide text-ink uppercase shadow-xs sm:text-xs">
          Under {formatBDT(collection.priceMax)}
        </span>

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-2.5 sm:p-3">
          {scope ? (
            <span className="truncate text-[0.625rem] font-medium tracking-wide text-white/70 uppercase">
              {scope}
            </span>
          ) : null}

          <h3 className="line-clamp-2 text-sm leading-snug font-bold text-white text-balance">
            {collection.label}
          </h3>

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-300">
            Shop now
            <ArrowRight
              className="size-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </Link>
    </Tilt3D>
  )
}
