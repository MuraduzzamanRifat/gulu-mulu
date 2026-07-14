import type { Metadata } from 'next'

import { Breadcrumbs } from '@/components/browse/breadcrumbs'
import { BrowseResults } from '@/components/browse/browse-results'
import {
  parseBrowseParams,
  type BrowseScope,
  type RawSearchParams,
} from '@/components/browse/browse-params'

const BASE_PATH = '/products/search'

interface SearchPageProps {
  searchParams: Promise<RawSearchParams>
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = parseBrowseParams(await searchParams)

  if (!params.search) {
    return {
      title: 'All Products',
      description:
        'Browse every product on Gulu Mulu — fashion, beauty, kids and home essentials from ' +
        'trusted Bangladeshi sellers. Filter by price, brand, category and rating.',
      alternates: { canonical: BASE_PATH },
    }
  }

  return {
    title: `${params.search} — Search Results`,
    description: `Products matching “${params.search}” on Gulu Mulu. Cash on delivery across Bangladesh.`,
    // A results page per query string is exactly the thin, near-duplicate content search engines
    // penalise — crawl the products it links to, don't index the query itself.
    robots: { index: false, follow: true },
  }
}

/**
 * The canonical filterable listing. Every other browse surface is this page with one dimension
 * pinned by the path, which is why they all share `<BrowseResults />`.
 *
 * `searchParams` is a Promise in Next 16 — and it is the ONLY state this page has.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const raw = await searchParams
  const params = parseBrowseParams(raw)

  const scope: BrowseScope = { basePath: BASE_PATH }

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:py-8">
      <Breadcrumbs
        items={
          params.search
            ? [{ label: 'Search', href: BASE_PATH }, { label: params.search }]
            : [{ label: 'All products' }]
        }
      />

      <header className="mt-4">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          {params.search ? (
            <>
              Results for{' '}
              <span className="text-brand-600">
                &ldquo;
                {params.search}
                &rdquo;
              </span>
            </>
          ) : (
            'All products'
          )}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {params.search
            ? 'Narrow it down by price, brand, category or customer rating.'
            : 'Everything on the marketplace, from every approved seller.'}
        </p>
      </header>

      <BrowseResults scope={scope} raw={raw} params={params} className="mt-6" />
    </div>
  )
}
