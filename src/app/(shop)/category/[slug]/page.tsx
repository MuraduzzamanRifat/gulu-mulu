import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Breadcrumbs, type Crumb } from '@/components/browse/breadcrumbs'
import { BrowseResults } from '@/components/browse/browse-results'
import {
  parseBrowseParams,
  type BrowseScope,
  type RawSearchParams,
} from '@/components/browse/browse-params'
import { getCategoryBySlug } from '@/lib/queries'
import { cn } from '@/lib/utils'

interface CategoryPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<RawSearchParams>
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)

  if (!category) return { title: 'Category not found' }

  const description =
    `Shop ${category.name} online in Bangladesh on Gulu Mulu. Compare prices across sellers, ` +
    'filter by brand and rating, and pay cash on delivery.'

  return {
    title: category.name,
    description,
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: {
      title: `${category.name} | Gulu Mulu`,
      description,
      url: `/category/${category.slug}`,
      images: category.imageUrl ? [{ url: category.imageUrl }] : undefined,
    },
  }
}

/**
 * The same grid and the same sidebar as /products/search, with the category pinned by the path.
 *
 * Selecting a PARENT (`/category/women`) shows everything beneath it — `searchProducts()` walks
 * the child categories — and the sidebar's category facet turns into a sub-category refinement.
 * A leaf category (`/category/sarees`) simply has none to offer, and the section disappears.
 */
export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const [{ slug }, raw] = await Promise.all([params, searchParams])

  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const browseParams = parseBrowseParams(raw)

  const scope: BrowseScope = {
    basePath: `/category/${category.slug}`,
    lockedCategorySlug: category.slug,
  }

  const crumbs: Crumb[] = category.parent
    ? [
        { label: category.parent.name, href: `/category/${category.parent.slug}` },
        { label: category.name },
      ]
    : [{ label: category.name }]

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:py-8">
      <Breadcrumbs items={crumbs} />

      <header
        className={cn(
          'relative mt-4 overflow-hidden rounded-card border border-line',
          'bg-linear-to-r from-brand-50 via-surface-muted to-surface',
        )}
      >
        {category.imageUrl ? (
          <Image
            src={category.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 1280px, 100vw"
            quality={60}
            className="object-cover opacity-25"
            aria-hidden="true"
          />
        ) : null}

        <div className="relative p-5 sm:p-7">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-3xl">
            {category.name}
          </h1>

          {category.nameBn ? (
            <p className="mt-1 text-sm text-ink-muted sm:text-base">{category.nameBn}</p>
          ) : null}

          {category.children.length > 0 ? (
            <ul className="snap-rail -mx-5 mt-4 flex gap-2 px-5 sm:mx-0 sm:flex-wrap sm:px-0">
              {category.children.map((child) => (
                <li key={child.id} className="shrink-0 snap-start">
                  <Link
                    href={`/category/${child.slug}`}
                    className={cn(
                      'inline-flex items-center rounded-full border border-line bg-surface px-3 py-1.5',
                      'text-xs font-medium text-ink-muted transition-colors',
                      'hover:border-brand-500 hover:text-brand-600',
                      'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                    )}
                  >
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </header>

      <BrowseResults
        scope={scope}
        raw={raw}
        params={browseParams}
        categoryChildren={category.children.map((child) => ({
          slug: child.slug,
          name: child.name,
        }))}
        className="mt-6"
      />
    </div>
  )
}
