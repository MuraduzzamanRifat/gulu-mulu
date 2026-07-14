/**
 * Admin read queries.
 *
 * The mirror image of `@/lib/queries`: that file exists to guarantee the storefront NEVER sees an
 * unapproved product, and this one exists because the admin must see EVERYTHING — the rejected
 * listing, the suspended shop, the cancelled order. There is no visibility gate here at all. The
 * gate is `requireAdmin()` on the layout, and it is the only thing standing between these queries
 * and the public, which is why not one of them may ever be imported from a storefront route.
 *
 * Everything is wrapped in React `cache()`, so the layout's badge counts and the page's own read
 * collapse into a single query per request.
 */
import { cache } from 'react'

import { prisma } from '@/lib/db'
import {
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  SellerStatus,
  Prisma,
} from '@/generated/prisma/client'

export const PER_PAGE = 20

/** Orders whose money is real but not yet realised — neither delivered nor written off. */
const IN_FLIGHT: readonly OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
]

/* -------------------------------------------------------------------------- */
/* The attention counters (sidebar badges + the dashboard's "needs attention") */
/* -------------------------------------------------------------------------- */

export interface AttentionCounts {
  sellers: number
  products: number
  total: number
}

/**
 * The two queues that make an admin open this panel at all. Read by the layout (for the sidebar
 * badges) AND by the dashboard (for the big cards) — `cache()` means that's still two queries per
 * request, not four.
 */
export const getAttentionCounts = cache(async (): Promise<AttentionCounts> => {
  const [sellers, products] = await Promise.all([
    prisma.seller.count({ where: { status: SellerStatus.PENDING } }),
    prisma.product.count({ where: { status: ProductStatus.PENDING } }),
  ])

  return { sellers, products, total: sellers + products }
})

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

const recentOrderInclude = {
  user: { select: { name: true, phone: true } },
  items: { select: { sellerId: true } },
} satisfies Prisma.OrderInclude

export type RecentOrder = Prisma.OrderGetPayload<{ include: typeof recentOrderInclude }>

export interface AdminDashboard {
  /** Gross merchandise value: the total of every order that actually reached the customer. */
  gmv: number
  /** What Gulu Mulu kept out of that GMV. Realised, i.e. delivered — the same basis as GMV. */
  commission: number
  /** Commission riding on orders that are placed but not yet delivered. Not money yet. */
  pipelineCommission: number
  /** What is owed to sellers out of delivered orders. */
  sellerPayable: number
  orderCount: number
  deliveredCount: number
  cancelledCount: number
  activeSellers: number
  liveProducts: number
  customers: number
  recentOrders: RecentOrder[]
}

/**
 * GMV counts DELIVERED orders only.
 *
 * That is a deliberate, and the only defensible, choice: an order sitting at PENDING may still be
 * cancelled, and counting it as revenue is how a marketplace ends up reporting a number it cannot
 * bank. Commission is computed on exactly the same basis, so the two figures always describe the
 * same set of orders — a dashboard whose GMV and take-rate disagree about which orders are real is
 * worse than no dashboard. What is still in flight gets its own, clearly-labelled line.
 *
 * Commission is summed from OrderItem.commissionAmount — the split FROZEN at purchase time — never
 * recomputed from the seller's current rate. Re-deriving it here would silently rewrite history
 * every time an admin touches the commission dial on /admin/sellers.
 */
export const getDashboard = cache(async (): Promise<AdminDashboard> => {
  const delivered: Prisma.OrderItemWhereInput = { order: { status: OrderStatus.DELIVERED } }

  const [
    gmvAgg,
    realised,
    pipeline,
    orderCount,
    deliveredCount,
    cancelledCount,
    activeSellers,
    liveProducts,
    customers,
    recentOrders,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: OrderStatus.DELIVERED },
    }),
    prisma.orderItem.aggregate({
      _sum: { commissionAmount: true, sellerEarning: true },
      where: delivered,
    }),
    prisma.orderItem.aggregate({
      _sum: { commissionAmount: true },
      where: { order: { status: { in: [...IN_FLIGHT] } } },
    }),
    prisma.order.count(),
    prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
    prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
    prisma.seller.count({ where: { status: SellerStatus.APPROVED } }),
    prisma.product.count({ where: { status: ProductStatus.APPROVED } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.order.findMany({
      include: recentOrderInclude,
      orderBy: { placedAt: 'desc' },
      take: 8,
    }),
  ])

  return {
    // `_sum` is null, not 0, when nothing matched — a brand-new marketplace must read ৳0, not ৳NaN.
    gmv: gmvAgg._sum.total ?? 0,
    commission: realised._sum.commissionAmount ?? 0,
    sellerPayable: realised._sum.sellerEarning ?? 0,
    pipelineCommission: pipeline._sum.commissionAmount ?? 0,
    orderCount,
    deliveredCount,
    cancelledCount,
    activeSellers,
    liveProducts,
    customers,
    recentOrders,
  }
})

/* -------------------------------------------------------------------------- */
/* Sellers                                                                    */
/* -------------------------------------------------------------------------- */

const sellerInclude = {
  user: { select: { id: true, name: true, phone: true, email: true, role: true } },
  _count: { select: { products: true } },
} satisfies Prisma.SellerInclude

export type AdminSellerRow = Prisma.SellerGetPayload<{ include: typeof sellerInclude }> & {
  /** Commission this shop has actually earned the marketplace, from DELIVERED orders. */
  commissionEarned: number
  /** What this shop has sold, at delivered-order value. */
  grossSales: number
}

export interface AdminSellers {
  sellers: AdminSellerRow[]
  counts: Record<SellerStatus, number> & { all: number }
}

/**
 * Every shop, with the one number an admin actually needs beside the commission dial: what this
 * seller has earned the marketplace so far. Without it, setting a rate is guesswork.
 *
 * Two queries, not N+1 — the per-seller totals come from a single grouped aggregate over
 * OrderItem and are folded into the rows in JS.
 */
export const getAdminSellers = cache(async (): Promise<AdminSellers> => {
  const [sellers, earnings] = await Promise.all([
    prisma.seller.findMany({
      include: sellerInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.orderItem.groupBy({
      by: ['sellerId'],
      _sum: { commissionAmount: true, lineTotal: true },
      where: { order: { status: OrderStatus.DELIVERED } },
    }),
  ])

  const bySeller = new Map(earnings.map((row) => [row.sellerId, row._sum]))

  const counts: Record<SellerStatus, number> & { all: number } = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    SUSPENDED: 0,
    all: sellers.length,
  }
  for (const seller of sellers) counts[seller.status]++

  return {
    sellers: sellers.map((seller) => {
      const sums = bySeller.get(seller.id)
      return {
        ...seller,
        commissionEarned: sums?.commissionAmount ?? 0,
        grossSales: sums?.lineTotal ?? 0,
      }
    }),
    counts,
  }
})

/** For labelling a `?sellerId=` filter that matched nothing — the shop still has a name. */
export const getSellerName = cache(async (id: string): Promise<string | null> => {
  if (!id) return null
  const seller = await prisma.seller.findUnique({
    where: { id },
    select: { businessName: true },
  })
  return seller?.businessName ?? null
})

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

const adminProductInclude = {
  images: { orderBy: { displayOrder: 'asc' }, take: 1 },
  category: { select: { name: true } },
  brand: { select: { name: true } },
  seller: { select: { id: true, businessName: true, slug: true, status: true } },
} satisfies Prisma.ProductInclude

export type AdminProductRow = Prisma.ProductGetPayload<{ include: typeof adminProductInclude }>

export interface AdminProductFilters {
  status: ProductStatus | null
  q: string
  sellerId: string | null
  page: number
}

export interface AdminProducts {
  products: AdminProductRow[]
  total: number
  totalPages: number
  page: number
  counts: Record<ProductStatus, number> & { all: number }
}

/**
 * The moderation queue. The status counts are computed against the OTHER active filters but not
 * against the status filter itself — so "Awaiting review (7)" in the dropdown tells you what you
 * would get if you switched to it, which is the only number that makes a filter dropdown useful.
 */
export async function getAdminProducts(filters: AdminProductFilters): Promise<AdminProducts> {
  const { status, q, sellerId, page } = filters

  // `mode: 'insensitive'` is NOT decoration. On Postgres `contains` compiles to LIKE, which is
  // case-SENSITIVE — so without this, searching "aarong" would not find "Aarong" and the admin
  // would conclude the shop has no products. (SQLite's LIKE folds ASCII case for free, which is
  // exactly why this is easy to forget on the way to Postgres.)
  const base: Prisma.ProductWhereInput = {
    ...(sellerId ? { sellerId } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { seller: { businessName: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  const where: Prisma.ProductWhereInput = { ...base, ...(status ? { status } : {}) }

  const safePage = Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1

  const [total, pending, approved, rejected, draft] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.count({ where: { ...base, status: ProductStatus.PENDING } }),
    prisma.product.count({ where: { ...base, status: ProductStatus.APPROVED } }),
    prisma.product.count({ where: { ...base, status: ProductStatus.REJECTED } }),
    prisma.product.count({ where: { ...base, status: ProductStatus.DRAFT } }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const currentPage = Math.min(safePage, totalPages) // a stale ?page=9 lands on the last real page

  const products = await prisma.product.findMany({
    where,
    include: adminProductInclude,
    // Oldest submission first inside the review queue: a seller who has been waiting three days
    // must not be buried under this morning's uploads.
    orderBy: status === ProductStatus.PENDING ? { createdAt: 'asc' } : { updatedAt: 'desc' },
    skip: (currentPage - 1) * PER_PAGE,
    take: PER_PAGE,
  })

  return {
    products,
    total,
    totalPages,
    page: currentPage,
    counts: {
      PENDING: pending,
      APPROVED: approved,
      REJECTED: rejected,
      DRAFT: draft,
      all: pending + approved + rejected + draft,
    },
  }
}

/* -------------------------------------------------------------------------- */
/* Orders                                                                     */
/* -------------------------------------------------------------------------- */

const adminOrderInclude = {
  user: { select: { name: true, phone: true } },
  items: { select: { sellerId: true, quantity: true } },
} satisfies Prisma.OrderInclude

export type AdminOrderRow = Prisma.OrderGetPayload<{ include: typeof adminOrderInclude }>

export interface AdminOrderFilters {
  status: OrderStatus | null
  paymentStatus: PaymentStatus | null
  q: string
  page: number
}

export interface AdminOrders {
  orders: AdminOrderRow[]
  total: number
  totalPages: number
  page: number
  /** Revenue of the CURRENT filtered set, so a filtered view still tells you what it is worth. */
  filteredValue: number
}

export async function getAdminOrders(filters: AdminOrderFilters): Promise<AdminOrders> {
  const { status, paymentStatus, q, page } = filters

  // Case-insensitive for the same reason as above — an order number is quoted over the phone, and
  // "gm-4f2a9c" must find GM-4F2A9C.
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: 'insensitive' } },
            { shipPhone: { contains: q } },
            { shipFullName: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const safePage = Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1

  const [total, value] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.aggregate({ _sum: { total: true }, where }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const currentPage = Math.min(safePage, totalPages)

  const orders = await prisma.order.findMany({
    where,
    include: adminOrderInclude,
    orderBy: { placedAt: 'desc' },
    skip: (currentPage - 1) * PER_PAGE,
    take: PER_PAGE,
  })

  return {
    orders,
    total,
    totalPages,
    page: currentPage,
    filteredValue: value._sum.total ?? 0,
  }
}

const orderDetailInclude = {
  user: { select: { id: true, name: true, phone: true, email: true } },
  coupon: { select: { code: true, type: true, value: true } },
  items: {
    orderBy: { id: 'asc' },
    include: {
      seller: { select: { id: true, businessName: true, slug: true, status: true } },
      product: { select: { slug: true, status: true } },
    },
  },
} satisfies Prisma.OrderInclude

export type AdminOrderDetail = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>
export type AdminOrderLine = AdminOrderDetail['items'][number]

export const getAdminOrder = cache(async (id: string): Promise<AdminOrderDetail | null> => {
  if (!id) return null
  return prisma.order.findUnique({ where: { id }, include: orderDetailInclude })
})

export interface SellerBreakdown {
  sellerId: string
  businessName: string
  slug: string
  lines: AdminOrderLine[]
  gross: number
  commission: number
  earning: number
}

/**
 * Split one customer order into the shops that have to fulfil it. THIS is multi-vendor: a single
 * ৳3,400 basket can be three separate obligations to three separate businesses, and every one of
 * them is owed a different amount at a different take rate.
 *
 * Insertion order is preserved so the breakdown matches the order the lines were bought in.
 */
export function groupBySeller(order: AdminOrderDetail): SellerBreakdown[] {
  const groups = new Map<string, SellerBreakdown>()

  for (const line of order.items) {
    let group = groups.get(line.sellerId)
    if (!group) {
      group = {
        sellerId: line.sellerId,
        businessName: line.seller.businessName,
        slug: line.seller.slug,
        lines: [],
        gross: 0,
        commission: 0,
        earning: 0,
      }
      groups.set(line.sellerId, group)
    }

    group.lines.push(line)
    // Summed from the FROZEN per-line figures, never recomputed from the seller's current rate —
    // an admin nudging the commission dial must not retroactively rewrite what a shop was owed.
    group.gross += line.lineTotal
    group.commission += line.commissionAmount
    group.earning += line.sellerEarning
  }

  return [...groups.values()]
}

/* -------------------------------------------------------------------------- */
/* Merchandising                                                              */
/* -------------------------------------------------------------------------- */

const categoryInclude = {
  parent: { select: { id: true, name: true } },
  _count: { select: { products: true, children: true, collections: true } },
} satisfies Prisma.CategoryInclude

export type AdminCategory = Prisma.CategoryGetPayload<{ include: typeof categoryInclude }>

export const getAdminCategories = cache(async (): Promise<AdminCategory[]> => {
  return prisma.category.findMany({
    include: categoryInclude,
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  })
})

const brandInclude = {
  _count: { select: { products: true, collections: true } },
} satisfies Prisma.BrandInclude

export type AdminBrand = Prisma.BrandGetPayload<{ include: typeof brandInclude }>

export const getAdminBrands = cache(async (): Promise<AdminBrand[]> => {
  return prisma.brand.findMany({
    include: brandInclude,
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  })
})

export const getAdminBanners = cache(async () => {
  return prisma.banner.findMany({
    orderBy: [{ placement: 'asc' }, { displayOrder: 'asc' }],
  })
})

export type AdminBanner = Awaited<ReturnType<typeof getAdminBanners>>[number]

export const getAdminCollections = cache(async () => {
  return prisma.collection.findMany({
    orderBy: [{ displayOrder: 'asc' }, { priceMax: 'asc' }],
    include: {
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
    },
  })
})

export type AdminCollection = Awaited<ReturnType<typeof getAdminCollections>>[number]

/** Category/brand pickers for the collection editor — id + name only, no product payload. */
export const getPickerOptions = cache(async () => {
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, name: true, slug: true, parentId: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.brand.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return { categories, brands }
})

export const getAdminPages = cache(async () => {
  return prisma.page.findMany({ orderBy: { slug: 'asc' } })
})

export type AdminPage = Awaited<ReturnType<typeof getAdminPages>>[number]

export const getAdminPage = cache(async (id: string): Promise<AdminPage | null> => {
  if (!id) return null
  return prisma.page.findUnique({ where: { id } })
})
