import Link from 'next/link'
import { PackageSearch, SearchX } from 'lucide-react'

import { ProductGrid } from '@/components/product'
import { EmptyState, Pagination, buttonVariants } from '@/components/ui'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { searchProducts, type SearchArgs, type SearchResult } from '@/lib/queries'
import { cn } from '@/lib/utils'

import { ActiveFilterChips } from './active-filter-chips'
import {
  BROWSE_PER_PAGE,
  clearedHref,
  hasActiveFilters,
  pageHrefBuilder,
  type BrowseFacetValue,
  type BrowseParams,
  type BrowseScope,
  type RawSearchParams,
} from './browse-params'
import { FilterSheet, FilterSidebar } from './filter-sidebar'
import { SortSelect } from './sort-select'

/* -------------------------------------------------------------------------- */
/* Searching                                                                  */
/* -------------------------------------------------------------------------- */

/** `searchProducts` caps `perPage` at 100, so a rating scan walks the result set in 100s. */
const SCAN_PER_PAGE = 100
/** Hard stop on the scan. 2,000 products is far past what any real facet combination returns. */
const MAX_SCAN_PAGES = 20

/**
 * `searchProducts()` owns price, brand, category, sort and paging. It has no rating filter — and
 * `queries.ts` is shared, so this is where that gap gets closed.
 *
 * A rating filter cannot be applied to an already-paginated page (filtering page 1 of 6 down to
 * "4 stars & up" would leave a 9-item page and 5 pages of results the shopper can never reach).
 * So when — and ONLY when — a rating is asked for, we pull the whole matching set through
 * `searchProducts` in 100s (it has already sorted it globally, so concatenating the pages
 * preserves the order), filter it, and paginate what's left.
 *
 * The facets come from the un-rated set on purpose: a brand list that emptied itself out because
 * you asked for 4 stars is a dead end, and you'd have to guess which filter to undo.
 */
async function runBrowseSearch(args: SearchArgs, minRating: number | null): Promise<SearchResult> {
  if (minRating == null) return searchProducts(args)

  const { page = 1, perPage = BROWSE_PER_PAGE, ...scanArgs } = args

  const first = await searchProducts({ ...scanArgs, page: 1, perPage: SCAN_PER_PAGE })
  const scanPages = Math.min(first.totalPages, MAX_SCAN_PAGES)

  const tail = await Promise.all(
    Array.from({ length: Math.max(0, scanPages - 1) }, (_, index) =>
      searchProducts({ ...scanArgs, page: index + 2, perPage: SCAN_PER_PAGE }),
    ),
  )

  const everything = [...first.products, ...tail.flatMap((result) => result.products)]
  const kept = everything.filter((product) => product.rating >= minRating)

  const total = kept.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const start = (currentPage - 1) * perPage

  return {
    products: kept.slice(start, start + perPage),
    total,
    totalPages,
    page: currentPage,
    perPage,
    facets: first.facets,
  }
}

/**
 * The hearts on a grid of 24 cards must come back filled for a returning shopper, and `queries.ts`
 * has no query for it. One `select`-only read; guests never touch the DB.
 */
async function getWishlistedIds(): Promise<string[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const rows = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    select: { productId: true },
  })

  return rows.map((row) => row.productId)
}

/* -------------------------------------------------------------------------- */
/* The surface                                                                */
/* -------------------------------------------------------------------------- */

export interface BrowseResultsProps {
  scope: BrowseScope
  /** The untouched `await searchParams` — pagination hrefs are rebuilt from it. */
  raw: RawSearchParams
  params: BrowseParams
  /**
   * Category page only: the sub-categories the shopper may refine down to. Anything outside this
   * list is dropped from `?categories=` — otherwise `/category/men?categories=makeup` would quietly
   * serve makeup under the Men header.
   */
  categoryChildren?: { slug: string; name: string }[]
  className?: string
}

export async function BrowseResults({
  scope,
  raw,
  params,
  categoryChildren,
  className,
}: BrowseResultsProps) {
  const scoped = categoryChildren != null

  // --- Resolve the filters the ROUTE allows --------------------------------------------------
  const allowedCategories = scoped
    ? new Set(categoryChildren.map((child) => child.slug))
    : null

  const selectedCategories = allowedCategories
    ? params.categories.filter((slug) => allowedCategories.has(slug))
    : params.categories

  // Selecting nothing inside /category/men means "all of Men" — searchProducts walks descendants
  // for a parent slug. Selecting children narrows to exactly those children.
  const categorySlugs =
    scope.lockedCategorySlug != null
      ? selectedCategories.length > 0
        ? selectedCategories
        : [scope.lockedCategorySlug]
      : selectedCategories

  const brandSlugs = scope.lockedBrandSlug ? [scope.lockedBrandSlug] : params.brands

  // --- Read ----------------------------------------------------------------------------------
  const [result, wishlistedIds] = await Promise.all([
    runBrowseSearch(
      {
        search: params.search || undefined,
        categorySlugs,
        brandSlugs,
        priceMin: params.priceMin ?? undefined,
        priceMax: params.priceMax ?? undefined,
        sort: params.sort,
        page: params.page,
        perPage: BROWSE_PER_PAGE,
      },
      params.minRating,
    ),
    getWishlistedIds(),
  ])

  const { products, total, totalPages, page, facets } = result

  // --- Facet options -------------------------------------------------------------------------
  const categoryCounts = new Map(facets.categories.map((facet) => [facet.slug, facet.count]))

  const categoryOptions: BrowseFacetValue[] = scoped
    ? categoryChildren
        .map((child) => ({
          slug: child.slug,
          name: child.name,
          count: categoryCounts.get(child.slug) ?? 0,
        }))
        // A zero-count box is a dead click — unless it's already ticked, in which case hiding it
        // would strand the shopper on an empty grid with no way to untick it.
        .filter((option) => option.count > 0 || selectedCategories.includes(option.slug))
    : facets.categories

  const brandOptions: BrowseFacetValue[] = scope.lockedBrandSlug ? [] : facets.brands

  const categoryLabels: Record<string, string> = {}
  for (const option of [...facets.categories, ...categoryOptions]) {
    categoryLabels[option.slug] = option.name
  }

  const brandLabels: Record<string, string> = {}
  for (const option of facets.brands) brandLabels[option.slug] = option.name

  // The chips must reflect what we actually filtered by, not what the URL asked for.
  const effectiveParams: BrowseParams = { ...params, categories: selectedCategories }

  const panel = {
    params: effectiveParams,
    scope,
    facets,
    categoryOptions,
    brandOptions,
    categoryTitle: scoped ? 'Sub-category' : 'Category',
  }

  const filtered = hasActiveFilters(effectiveParams, scope)
  const first = total === 0 ? 0 : (page - 1) * BROWSE_PER_PAGE + 1
  const last = Math.min(page * BROWSE_PER_PAGE, total)

  return (
    <div
      className={cn(
        'lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[17rem_minmax(0,1fr)]',
        className,
      )}
    >
      {/* Desktop rail. Sticky under the header so the filters stay reachable at page 4. */}
      <aside className="hidden lg:block">
        <div className="sticky top-28 max-h-[calc(100dvh-9rem)] overflow-y-auto overscroll-contain pr-2 pb-4">
          <FilterSidebar {...panel} />
        </div>
      </aside>

      <div className="min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-line pb-3 sm:gap-3">
          <p className="hidden shrink-0 text-sm text-ink-muted sm:block">
            {total > 0 ? (
              <>
                <span className="font-semibold tabular-nums text-ink">
                  {first.toLocaleString('en-US')}–{last.toLocaleString('en-US')}
                </span>{' '}
                of{' '}
                <span className="font-semibold tabular-nums text-ink">
                  {total.toLocaleString('en-US')}
                </span>{' '}
                {total === 1 ? 'product' : 'products'}
              </>
            ) : (
              'No products'
            )}
          </p>

          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            <FilterSheet {...panel} resultCount={total} className="lg:hidden" />
            <SortSelect value={params.sort} className="min-w-0 flex-1 sm:flex-none" />
          </div>
        </div>

        <ActiveFilterChips
          params={effectiveParams}
          scope={scope}
          categoryLabels={categoryLabels}
          brandLabels={brandLabels}
          className="mt-3"
        />

        <p className="mt-3 text-sm text-ink-muted sm:hidden">
          <span className="font-semibold tabular-nums text-ink">
            {total.toLocaleString('en-US')}
          </span>{' '}
          {total === 1 ? 'product' : 'products'}
        </p>

        {products.length > 0 ? (
          <>
            <ProductGrid products={products} wishlistedIds={wishlistedIds} className="mt-4" />

            <Pagination
              page={page}
              totalPages={totalPages}
              buildHref={pageHrefBuilder(scope.basePath, raw)}
              className="mt-10"
            />
          </>
        ) : filtered ? (
          <EmptyState
            icon={SearchX}
            title="No products match these filters"
            description="Try widening the price range, or drop a brand or two — there is plenty more in stock."
            action={
              <Link
                href={clearedHref(scope, effectiveParams, { keepSearch: true })}
                className={cn(buttonVariants({ variant: 'primary' }))}
              >
                Clear filters
              </Link>
            }
            className="rounded-card border border-dashed border-line bg-surface-muted"
          />
        ) : (
          <EmptyState
            icon={PackageSearch}
            title={
              params.search ? `Nothing found for “${params.search}”` : 'Nothing here just yet'
            }
            description={
              params.search
                ? 'Check the spelling, or try a shorter, more general word — “saree” instead of “red silk saree”.'
                : 'New listings land here as soon as our sellers publish them.'
            }
            action={
              <Link href="/" className={cn(buttonVariants({ variant: 'primary' }))}>
                Back to home
              </Link>
            }
            className="rounded-card border border-dashed border-line bg-surface-muted"
          />
        )}
      </div>
    </div>
  )
}
