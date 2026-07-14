/**
 * The URL contract shared by every browse surface (/products/search, /category/[slug],
 * /brand/[slug]).
 *
 * The query string is the ONLY source of truth for filter/sort/page state — no context, no
 * client store. That is what makes a filtered grid shareable on Messenger (which is how BD
 * shoppers actually pass products around) and bookmarkable, and it is what lets pagination be
 * plain <Link>s that work with JavaScript switched off.
 *
 * This module is deliberately dependency-free: no Prisma, no `next/*`, no hooks. It is imported
 * by Server Components AND by the 'use client' filter widgets, so it must be safe on both sides
 * of the boundary.
 *
 * Canonical keys:
 *   search     free text                      (alias: q)
 *   categories comma-separated category slugs (alias: category)
 *   brands     comma-separated brand slugs    (alias: brand)
 *   priceMin   whole BDT, on the EFFECTIVE price
 *   priceMax   whole BDT, on the EFFECTIVE price
 *   rating     1..5 — "this many stars & up"
 *   sort       relevance | price_asc | price_desc | newest | best_selling
 *   page       1-based
 *
 * Aliases exist because merchandising links elsewhere in the app are written by hand
 * (`/products/search?priceMax=999&category=health-beauty`). We accept them on read and never
 * emit them on write.
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

/** Structurally identical to `SortKey` in '@/lib/queries' — redeclared so this file stays
 *  importable from client components without dragging Prisma into the browser bundle. */
export type BrowseSort = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'best_selling'

/** Structurally identical to `FacetValue` in '@/lib/queries', for the same reason. */
export interface BrowseFacetValue {
  slug: string
  name: string
  count: number
}

export interface BrowseFacets {
  brands: BrowseFacetValue[]
  categories: BrowseFacetValue[]
  priceRange: { min: number; max: number }
}

/** What Next hands a page as `await searchParams`. */
export type RawSearchParams = Record<string, string | string[] | undefined>

export interface BrowseParams {
  search: string
  categories: string[]
  brands: string[]
  priceMin: number | null
  priceMax: number | null
  /** 1..5 — show products rated at least this. */
  minRating: number | null
  sort: BrowseSort
  page: number
}

/**
 * What the ROUTE itself pins down. On /category/men the category is part of the path, so the
 * `categories` param refines *within* it; on /brand/aarong the brand facet disappears entirely.
 */
export interface BrowseScope {
  /** The route the surface lives at, e.g. '/category/men'. Every href is built from this. */
  basePath: string
  /** Fixed by the path — the brand facet is hidden and the `brands` param is ignored. */
  lockedBrandSlug?: string
  /** Fixed by the path — `categories` may only select slugs inside it. */
  lockedCategorySlug?: string
}

/* -------------------------------------------------------------------------- */
/* Sort                                                                       */
/* -------------------------------------------------------------------------- */

export const SORT_OPTIONS: ReadonlyArray<{ value: BrowseSort; label: string }> = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest arrivals' },
  { value: 'best_selling', label: 'Best selling' },
]

export const DEFAULT_SORT: BrowseSort = 'relevance'

const SORT_VALUES: ReadonlySet<string> = new Set(SORT_OPTIONS.map((option) => option.value))

export function sortLabel(sort: BrowseSort): string {
  return SORT_OPTIONS.find((option) => option.value === sort)?.label ?? 'Relevance'
}

/** The budget chips. BD shoppers browse by wallet before they browse by brand. */
export const PRICE_CHIPS: ReadonlyArray<{ max: number; label: string }> = [
  { max: 500, label: 'Under ৳500' },
  { max: 1000, label: 'Under ৳1,000' },
  { max: 2000, label: 'Under ৳2,000' },
]

export const RATING_CHOICES: readonly number[] = [4, 3, 2, 1]

/** How many products a browse page shows. */
export const BROWSE_PER_PAGE = 24

/* -------------------------------------------------------------------------- */
/* Keys + aliases                                                             */
/* -------------------------------------------------------------------------- */

export const KEY = {
  search: 'search',
  categories: 'categories',
  brands: 'brands',
  priceMin: 'priceMin',
  priceMax: 'priceMax',
  rating: 'rating',
  sort: 'sort',
  page: 'page',
} as const

export type BrowseKey = (typeof KEY)[keyof typeof KEY]

/** Accepted on read, never written. Cleared whenever we write the canonical key. */
const ALIASES: Record<BrowseKey, readonly string[]> = {
  search: ['q'],
  categories: ['category'],
  brands: ['brand'],
  priceMin: ['minPrice'],
  priceMax: ['maxPrice'],
  rating: ['minRating'],
  sort: [],
  page: [],
}

/** Every spelling of `key` — canonical first. Used to read, and to purge on write. */
export function keyVariants(key: BrowseKey): string[] {
  return [key, ...ALIASES[key]]
}

/* -------------------------------------------------------------------------- */
/* Reading                                                                    */
/* -------------------------------------------------------------------------- */

const MAX_SEARCH_LENGTH = 120
const MAX_SELECTIONS = 24
const MAX_PRICE = 10_000_000

/** First non-empty value for the key or any of its aliases. Commas are NOT special here — a
 *  shopper searching "shirt, red" means it literally. */
function readScalar(raw: RawSearchParams, key: BrowseKey): string | undefined {
  for (const name of keyVariants(key)) {
    const value = raw[name]
    if (value == null) continue

    const first = Array.isArray(value) ? value[0] : value
    if (typeof first === 'string' && first.trim()) return first.trim()
  }
  return undefined
}

/**
 * A slug list. Tolerates every shape a link in the wild might use:
 * `?brands=a,b`, `?brands=a&brands=b`, `?brand=a`. Deduped, order preserved.
 */
function readList(raw: RawSearchParams, key: BrowseKey): string[] {
  const out = new Set<string>()

  for (const name of keyVariants(key)) {
    const value = raw[name]
    if (value == null) continue

    for (const entry of Array.isArray(value) ? value : [value]) {
      for (const piece of entry.split(',')) {
        const slug = piece.trim().toLowerCase()
        if (slug && out.size < MAX_SELECTIONS) out.add(slug)
      }
    }
  }

  return [...out]
}

/** A non-negative whole number, or null. Garbage (`?page=abc`, `?priceMin=-5`) degrades to null
 *  rather than throwing — a browse URL is user-editable and must never 500. */
function readInt(raw: RawSearchParams, key: BrowseKey): number | null {
  const value = readScalar(raw, key)
  if (value == null) return null

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null

  return Math.min(Math.trunc(parsed), MAX_PRICE)
}

export function parseBrowseParams(raw: RawSearchParams): BrowseParams {
  const search = (readScalar(raw, KEY.search) ?? '').slice(0, MAX_SEARCH_LENGTH)

  let priceMin = readInt(raw, KEY.priceMin)
  let priceMax = readInt(raw, KEY.priceMax)
  if (priceMin != null && priceMax != null && priceMin > priceMax) {
    const swap = priceMin
    priceMin = priceMax
    priceMax = swap
  }

  const rating = readInt(raw, KEY.rating)
  const minRating = rating != null && rating >= 1 && rating <= 5 ? rating : null

  const rawSort = readScalar(raw, KEY.sort)
  const sort = rawSort != null && SORT_VALUES.has(rawSort) ? (rawSort as BrowseSort) : DEFAULT_SORT

  const rawPage = readInt(raw, KEY.page)
  const page = rawPage != null && rawPage >= 1 ? rawPage : 1

  return {
    search,
    categories: readList(raw, KEY.categories),
    brands: readList(raw, KEY.brands),
    priceMin,
    priceMax,
    minRating,
    sort,
    page,
  }
}

/**
 * How many filter chips are live — the number on the mobile "Filters" button.
 * The search term is the *query*, not a filter, so it is not counted here.
 * A brand pinned by the path isn't a choice the shopper made, so it isn't counted either.
 */
export function activeFilterCount(params: BrowseParams, scope: BrowseScope): number {
  let count = 0
  if (!scope.lockedBrandSlug) count += params.brands.length
  count += params.categories.length
  if (params.priceMin != null || params.priceMax != null) count += 1
  if (params.minRating != null) count += 1
  return count
}

export function hasActiveFilters(params: BrowseParams, scope: BrowseScope): boolean {
  return activeFilterCount(params, scope) > 0
}

/* -------------------------------------------------------------------------- */
/* Writing                                                                    */
/* -------------------------------------------------------------------------- */

function withQuery(basePath: string, search: URLSearchParams): string {
  const query = search.toString()
  return query ? `${basePath}?${query}` : basePath
}

/**
 * Pagination hrefs. Built from the RAW params, not the parsed ones, so anything we don't know
 * about (a campaign `utm_source`, a future facet) survives paging. Page 1 is the canonical URL,
 * so it never carries `?page=1`.
 */
export function pageHrefBuilder(basePath: string, raw: RawSearchParams) {
  return (page: number): string => {
    const search = new URLSearchParams()

    for (const [name, value] of Object.entries(raw)) {
      if (keyVariants(KEY.page).includes(name)) continue
      if (value == null) continue

      for (const entry of Array.isArray(value) ? value : [value]) {
        if (entry) search.append(name, entry)
      }
    }

    if (page > 1) search.set(KEY.page, String(page))

    return withQuery(basePath, search)
  }
}

/**
 * The "Clear filters" / "Clear all" target: the bare surface. On a search page the shopper's
 * words are worth keeping — they cleared the *filters*, they didn't change their mind about
 * what they were looking for.
 */
export function clearedHref(
  scope: BrowseScope,
  params: BrowseParams,
  options: { keepSearch?: boolean } = {},
): string {
  const search = new URLSearchParams()
  if (options.keepSearch && params.search) search.set(KEY.search, params.search)
  return withQuery(scope.basePath, search)
}
