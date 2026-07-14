/**
 * Storefront read queries.
 *
 * Server Components import from here instead of writing Prisma inline. That is not just tidiness —
 * it is how we guarantee the ONE rule that must never be forgotten on a marketplace:
 *
 *      THE STOREFRONT ONLY EVER SHOWS `APPROVED` PRODUCTS FROM `APPROVED` SELLERS.
 *
 * Every product query below spreads `STOREFRONT_PRODUCT`. A rejected listing or a suspended shop
 * vanishes from search, deals, related items and direct slug URLs alike. If you add a query here,
 * spread it too.
 *
 * SQLite notes (Prisma 7 + better-sqlite3):
 *  - There is no `QueryMode`, so `mode: 'insensitive'` does not exist and would not compile.
 *    SQLite's LIKE is already case-insensitive for ASCII, which is what `contains` compiles to.
 *  - Ordering/filtering by the DISCOUNTED price cannot be expressed through the query builder
 *    (see `searchProducts`), so that part is done in JS. It is explained where it happens.
 */
import { cache } from 'react'

import { prisma } from '@/lib/db'
import { discountPercent, effectivePrice, primaryImage } from '@/lib/format'
import {
  BannerPlacement,
  ProductStatus,
  SellerStatus,
  Prisma,
} from '@/generated/prisma/client'
import type { Category, Product } from '@/generated/prisma/client'

/* -------------------------------------------------------------------------- */
/* The visibility gate                                                        */
/* -------------------------------------------------------------------------- */

/** Spread into EVERY storefront product `where`. This is the whole security model of the catalogue. */
export const STOREFRONT_PRODUCT = {
  status: ProductStatus.APPROVED,
  seller: { status: SellerStatus.APPROVED },
} satisfies Prisma.ProductWhereInput

/** Everything a product card needs, and nothing it doesn't. */
const productCardInclude = {
  images: { orderBy: { displayOrder: 'asc' } },
  brand: true,
  category: true,
  seller: { select: { id: true, businessName: true, slug: true } },
} satisfies Prisma.ProductInclude

export type ProductCard = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>

/* -------------------------------------------------------------------------- */
/* Merchandising: categories, brands, banners, collections                    */
/* -------------------------------------------------------------------------- */

/** The circular quick-nav strip on the homepage. */
export const getFeaturedCategories = cache(async () => {
  return prisma.category.findMany({
    where: { isFeatured: true },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  })
})

export type CategoryNode = Category & { children: Category[] }

/** Top-level categories each with their children — the mega-menu. */
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  return prisma.category.findMany({
    where: { parentId: null },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    include: {
      children: { orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] },
    },
  })
})

/** The scrolling brand strip. */
export const getFeaturedBrands = cache(async () => {
  return prisma.brand.findMany({
    where: { isFeatured: true },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  })
})

export const getHeroBanners = cache(async () => {
  return prisma.banner.findMany({
    where: { placement: BannerPlacement.HERO, isActive: true },
    orderBy: { displayOrder: 'asc' },
  })
})

export const getSecondaryBanners = cache(async () => {
  return prisma.banner.findMany({
    where: { placement: BannerPlacement.SECONDARY, isActive: true },
    orderBy: { displayOrder: 'asc' },
  })
})

/**
 * The "Shop Under ৳999" budget cards. Category/brand come along so the card can build its link
 * straight into the pre-filtered search (`/search?priceMax=999&category=beauty`).
 */
export const getCollections = cache(async () => {
  return prisma.collection.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
    include: {
      category: { select: { slug: true, name: true } },
      brand: { select: { slug: true, name: true } },
    },
  })
})

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

/** Hand-picked products for the homepage rail. Best sellers break the tie. */
export const getFeaturedProducts = cache(async (limit = 12): Promise<ProductCard[]> => {
  return prisma.product.findMany({
    where: { ...STOREFRONT_PRODUCT, isFeatured: true },
    include: productCardInclude,
    orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })
})

export interface DealCategory {
  category: Category
  /** The single best discount available anywhere under this category (including its children). */
  maxDiscountPercent: number
  imageUrl: string
}

/**
 * The "% OFF" deal grid: for each TOP-LEVEL category, the biggest discount you can actually buy
 * inside it right now — walking child categories, ignoring out-of-stock and unapproved listings.
 *
 * Done in two queries, not N+1: load the category tree once, load the discountable products once,
 * then fold each product up to its root category in JS. `discountPercent()` is the same helper the
 * product card uses, so the badge on the grid can never disagree with the badge on the product.
 */
export const getDealCategories = cache(async (): Promise<DealCategory[]> => {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.product.findMany({
      where: {
        ...STOREFRONT_PRODUCT,
        stock: { gt: 0 },
        discountPrice: { not: null }, // cheap pre-filter; discountPercent() still has the final say
      },
      select: {
        price: true,
        discountPrice: true,
        categoryId: true,
        images: { orderBy: { displayOrder: 'asc' }, select: { url: true, displayOrder: true } },
      },
    }),
  ])

  const byId = new Map(categories.map((c) => [c.id, c]))

  /** Climb to the top-level ancestor. Depth-capped so a cyclic parentId can't hang the request. */
  const rootOf = (categoryId: string): Category | null => {
    let node = byId.get(categoryId)
    for (let hops = 0; node?.parentId && hops < 10; hops++) {
      const parent = byId.get(node.parentId)
      if (!parent) break
      node = parent
    }
    return node?.parentId ? null : (node ?? null)
  }

  const best = new Map<string, { category: Category; percent: number; imageUrl: string }>()

  for (const product of products) {
    const percent = discountPercent(product)
    if (percent <= 0) continue // guards a bogus discountPrice >= price

    const root = rootOf(product.categoryId)
    if (!root) continue

    const current = best.get(root.id)
    if (!current || percent > current.percent) {
      best.set(root.id, {
        category: root,
        percent,
        // Prefer the category's own art; fall back to the product actually driving the deal.
        imageUrl: root.imageUrl ?? primaryImage(product.images),
      })
    }
  }

  return [...best.values()]
    .map(({ category, percent, imageUrl }) => ({
      category,
      maxDiscountPercent: percent,
      imageUrl,
    }))
    .sort((a, b) => b.maxDiscountPercent - a.maxDiscountPercent)
})

const productDetailInclude = {
  images: { orderBy: { displayOrder: 'asc' } },
  variants: { orderBy: [{ size: 'asc' }, { color: 'asc' }] },
  brand: true,
  category: true,
  seller: true,
  reviews: {
    take: 12,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  },
} satisfies Prisma.ProductInclude

export type ProductDetail = Prisma.ProductGetPayload<{ include: typeof productDetailInclude }>

/**
 * One product page. `findFirst`, not `findUnique`, because the slug alone is not the whole
 * condition — the gate is. An un-approved product 404s even if you know its URL.
 */
export const getProductBySlug = cache(async (slug: string): Promise<ProductDetail | null> => {
  if (!slug) return null

  return prisma.product.findFirst({
    where: { slug, ...STOREFRONT_PRODUCT },
    include: productDetailInclude,
  })
})

/** "You may also like" — same category, never the product you're already looking at. */
export const getRelatedProducts = cache(
  async (product: Pick<Product, 'id' | 'categoryId'>, limit = 8): Promise<ProductCard[]> => {
    return prisma.product.findMany({
      where: {
        ...STOREFRONT_PRODUCT,
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      include: productCardInclude,
      orderBy: [{ soldCount: 'desc' }, { rating: 'desc' }],
      take: limit,
    })
  },
)

export const getCategoryBySlug = cache(async (slug: string) => {
  if (!slug) return null
  return prisma.category.findUnique({
    where: { slug },
    include: {
      parent: true,
      children: { orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] },
    },
  })
})

export const getBrandBySlug = cache(async (slug: string) => {
  if (!slug) return null
  return prisma.brand.findUnique({ where: { slug } })
})

/* -------------------------------------------------------------------------- */
/* Search                                                                     */
/* -------------------------------------------------------------------------- */

export type SortKey = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'best_selling'

export interface SearchArgs {
  search?: string
  categorySlugs?: string[]
  brandSlugs?: string[]
  /** Bounds are compared against the price the customer ACTUALLY pays, not the strike-through. */
  priceMin?: number
  priceMax?: number
  sort?: SortKey
  page?: number
  perPage?: number
}

export interface FacetValue {
  slug: string
  name: string
  count: number
}

export interface SearchFacets {
  brands: FacetValue[]
  categories: FacetValue[]
  /** Effective-price range across the matching set — the bounds for the price slider. */
  priceRange: { min: number; max: number }
}

export interface SearchResult {
  products: ProductCard[]
  total: number
  totalPages: number
  page: number
  perPage: number
  facets: SearchFacets
}

const DEFAULT_PER_PAGE = 24

/**
 * The browse/search endpoint behind /search, category pages and every "Shop Under ৳X" card.
 *
 * WHY THE FILTERING AND SORTING HAPPEN IN JS
 * ------------------------------------------
 * The price a customer pays is `discountPrice` when it undercuts `price`, else `price` — i.e.
 * a conditional, not a column. Sorting or range-filtering on that in SQL needs
 * `ORDER BY CASE WHEN discountPrice < price THEN discountPrice ELSE price END`, which Prisma's
 * query builder cannot express (no computed/virtual fields, and `orderBy` only takes real columns).
 * Doing it on the raw `price` column instead is the classic marketplace bug: "price: low to high"
 * that puts a ৳2000 item marked down to ৳500 *after* a ৳900 item. So we pull the matching set and
 * do price, sort and pagination in JS, where `effectivePrice()` — the same helper the card renders
 * with — is the arbiter. The list and the badge can never disagree.
 *
 * The DB still does the selective work (the approval gate + the text search); JS only handles what
 * SQL cannot express. At marketplace-demo scale that set is small. The scaling fix, when it's
 * needed, is a stored `effectivePrice` column maintained on write and indexed — at which point
 * this whole function collapses back into a plain paginated query.
 *
 * FACETS
 * ------
 * Each facet is counted against the set filtered by every dimension EXCEPT its own. That's what
 * makes the sidebar usable: tick "Samsung" and the brand list still shows Xiaomi (with its real
 * count) so you can switch to it — instead of collapsing to the one brand you already chose.
 */
export async function searchProducts(args: SearchArgs = {}): Promise<SearchResult> {
  const {
    search,
    categorySlugs = [],
    brandSlugs = [],
    priceMin,
    priceMax,
    sort = 'relevance',
    page = 1,
    perPage = DEFAULT_PER_PAGE,
  } = args

  const term = search?.trim() ?? ''
  const safePage = Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1
  const safePerPage =
    Number.isFinite(perPage) && perPage > 0 ? Math.min(Math.trunc(perPage), 100) : DEFAULT_PER_PAGE

  // SQL does the approval gate and the text match. No `mode: 'insensitive'` — it doesn't exist on
  // SQLite; `contains` compiles to LIKE, which is already case-insensitive for ASCII.
  const where: Prisma.ProductWhereInput = { ...STOREFRONT_PRODUCT }
  if (term) {
    where.OR = [
      { title: { contains: term } },
      { titleBn: { contains: term } },
      { description: { contains: term } },
      { brand: { name: { contains: term } } },
    ]
  }

  const rows = await prisma.product.findMany({ where, include: productCardInclude })

  // --- JS filtering, on the price the customer actually pays -------------------------------
  const min = Number.isFinite(priceMin) ? (priceMin as number) : null
  const max = Number.isFinite(priceMax) ? (priceMax as number) : null

  const wantedCategories = new Set(categorySlugs.filter(Boolean))
  const wantedBrands = new Set(brandSlugs.filter(Boolean))

  // Resolve parent slugs once, up front (only when a category filter is actually in play), so the
  // matchers below are pure lookups.
  const parentSlugOf = new Map<string, string>()
  if (wantedCategories.size > 0) {
    const parentIds = [
      ...new Set(rows.map((r) => r.category.parentId).filter((id): id is string => id != null)),
    ]
    if (parentIds.length > 0) {
      const parents = await prisma.category.findMany({
        where: { id: { in: parentIds } },
        select: { id: true, slug: true },
      })
      for (const parent of parents) parentSlugOf.set(parent.id, parent.slug)
    }
  }

  const matchesPrice = (p: ProductCard) => {
    const price = effectivePrice(p)
    if (min != null && price < min) return false
    if (max != null && price > max) return false
    return true
  }

  // Selecting a PARENT category must include everything beneath it, or "Electronics" would match
  // only the products filed directly on the parent — usually none of them.
  const matchesCategory = (p: ProductCard) => {
    if (wantedCategories.size === 0) return true
    if (wantedCategories.has(p.category.slug)) return true

    const parentId = p.category.parentId
    if (parentId == null) return false

    const parentSlug = parentSlugOf.get(parentId)
    return parentSlug != null && wantedCategories.has(parentSlug)
  }

  const matchesBrand = (p: ProductCard) =>
    wantedBrands.size === 0 || (p.brand != null && wantedBrands.has(p.brand.slug))

  const priced = rows.filter(matchesPrice)

  // Facets: each dimension counted WITHOUT its own filter applied (see the note above).
  const forBrandFacet = priced.filter(matchesCategory)
  const forCategoryFacet = priced.filter(matchesBrand)
  const matched = forBrandFacet.filter(matchesBrand)

  // --- Sorting ------------------------------------------------------------------------------
  const lowerTerm = term.toLowerCase()

  /** Higher is better. Only meaningful for `relevance`. */
  const relevance = (p: ProductCard): number => {
    if (!lowerTerm) return (p.isFeatured ? 1000 : 0) + p.soldCount
    const title = p.title.toLowerCase()
    let score = 0
    if (title === lowerTerm) score += 10_000
    else if (title.startsWith(lowerTerm)) score += 5_000
    else if (title.includes(lowerTerm)) score += 2_000
    if (p.brand?.name.toLowerCase().includes(lowerTerm)) score += 500
    if (p.isFeatured) score += 100
    return score + Math.min(p.soldCount, 99)
  }

  const sorted = [...matched]
  switch (sort) {
    case 'price_asc':
      sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b) || b.soldCount - a.soldCount)
      break
    case 'price_desc':
      sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a) || b.soldCount - a.soldCount)
      break
    case 'newest':
      sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      break
    case 'best_selling':
      sorted.sort((a, b) => b.soldCount - a.soldCount || b.rating - a.rating)
      break
    case 'relevance':
    default:
      sorted.sort((a, b) => relevance(b) - relevance(a) || b.soldCount - a.soldCount)
      break
  }

  // --- Pagination ---------------------------------------------------------------------------
  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / safePerPage))
  const currentPage = Math.min(safePage, totalPages) // a stale ?page=9 lands on the last real page
  const start = (currentPage - 1) * safePerPage
  const products = sorted.slice(start, start + safePerPage)

  return {
    products,
    total,
    totalPages,
    page: currentPage,
    perPage: safePerPage,
    facets: {
      brands: countBy(
        forBrandFacet,
        (p) => (p.brand ? { slug: p.brand.slug, name: p.brand.name } : null),
      ),
      categories: countBy(forCategoryFacet, (p) => ({
        slug: p.category.slug,
        name: p.category.name,
      })),
      priceRange: priceRangeOf(priced),
    },
  }
}

/** Count products per facet value, biggest bucket first. Values with no bucket are skipped. */
function countBy(
  products: ProductCard[],
  key: (p: ProductCard) => { slug: string; name: string } | null,
): FacetValue[] {
  const counts = new Map<string, FacetValue>()

  for (const product of products) {
    const value = key(product)
    if (!value) continue

    const existing = counts.get(value.slug)
    if (existing) existing.count++
    else counts.set(value.slug, { slug: value.slug, name: value.name, count: 1 })
  }

  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** Effective-price bounds, so the slider spans what's really there. */
function priceRangeOf(products: ProductCard[]): { min: number; max: number } {
  if (products.length === 0) return { min: 0, max: 0 }

  let min = Infinity
  let max = 0
  for (const product of products) {
    const price = effectivePrice(product)
    if (price < min) min = price
    if (price > max) max = price
  }

  return { min: min === Infinity ? 0 : min, max }
}
