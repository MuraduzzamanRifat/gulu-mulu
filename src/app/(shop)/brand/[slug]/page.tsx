import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/browse/breadcrumbs'
import { BrowseResults } from '@/components/browse/browse-results'
import {
  parseBrowseParams,
  type BrowseScope,
  type RawSearchParams,
} from '@/components/browse/browse-params'
import { getBrandBySlug } from '@/lib/queries'
import { cn } from '@/lib/utils'

interface BrandPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<RawSearchParams>
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params
  const brand = await getBrandBySlug(slug)

  if (!brand) return { title: 'Brand not found' }

  const description =
    `Buy genuine ${brand.name} products online in Bangladesh on Gulu Mulu. Filter by price, ` +
    'category and rating, and pay cash on delivery.'

  return {
    title: `${brand.name} — Official Store`,
    description,
    alternates: { canonical: `/brand/${brand.slug}` },
    openGraph: {
      title: `${brand.name} | Gulu Mulu`,
      description,
      url: `/brand/${brand.slug}`,
      images: brand.logoUrl ? [{ url: brand.logoUrl }] : undefined,
    },
  }
}

/**
 * The brand storefront: the shared grid with `brands` pinned to the path, so the brand facet
 * disappears from the sidebar (you cannot un-tick the page you are on) and the category facet
 * narrows to just the categories this brand actually sells into.
 */
export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const [{ slug }, raw] = await Promise.all([params, searchParams])

  const brand = await getBrandBySlug(slug)
  if (!brand) notFound()

  const browseParams = parseBrowseParams(raw)

  const scope: BrowseScope = {
    basePath: `/brand/${brand.slug}`,
    lockedBrandSlug: brand.slug,
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:py-8">
      <Breadcrumbs items={[{ label: 'Brands' }, { label: brand.name }]} />

      <header
        className={cn(
          'mt-4 flex items-center gap-4 overflow-hidden rounded-card border border-line',
          'bg-linear-to-r from-surface-sunken via-surface-muted to-surface p-4 sm:gap-6 sm:p-6',
        )}
      >
        {brand.logoUrl ? (
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-line bg-surface sm:h-20 sm:w-32">
            {/* No `priority`: this is a 128px decorative logo, and the ProductGrid below already
                preloads four product images. A fifth preload slot spent here would push the real
                LCP candidates back in the queue on the slow mobile connections we design for. */}
            <Image
              src={brand.logoUrl}
              alt={`${brand.name} logo`}
              fill
              sizes="128px"
              quality={75}
              className="object-contain"
            />
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="grid size-16 shrink-0 place-items-center rounded-lg bg-brand-500 text-2xl font-bold text-white sm:size-20 sm:text-3xl"
          >
            {brand.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-ink sm:text-3xl">
            {brand.name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Every {brand.name} listing on Gulu Mulu, from every approved seller.
          </p>
        </div>
      </header>

      <BrowseResults scope={scope} raw={raw} params={browseParams} className="mt-6" />
    </div>
  )
}
