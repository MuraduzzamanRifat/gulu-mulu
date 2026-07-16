/**
 * Dashboard time-series and rankings — the §12 "command center" numbers.
 *
 * Everything here is computed from live rows, never hardcoded, and follows the same money
 * discipline as `data.ts`:
 *
 *  - "Sales" on the time axis = order value PLACED that day, excluding CANCELLED. An operator
 *    watching the chart is asking "how did we trade today?", and delivered-only would show last
 *    week (delivery lags placement by days). It is deliberately a different basis from GMV, and
 *    both are labelled on the dashboard so the two numbers can never be mistaken for each other.
 *  - GMV / commission stay DELIVERED-only (see data.ts for why) — those figures are "banked".
 *  - Commission figures are summed from the per-line amounts FROZEN at purchase time.
 *
 * One fetch covers the current AND previous window, so every "vs previous period" delta describes
 * exactly the same query the chart was drawn from.
 */
import { cache } from 'react'

import { prisma } from '@/lib/db'
import { OrderStatus, ProductStatus } from '@/generated/prisma/client'

export type RangeDays = 7 | 30 | 90

export const RANGE_OPTIONS: readonly RangeDays[] = [7, 30, 90]

export function parseRange(raw: string | undefined): RangeDays {
  const n = Number(raw)
  return (RANGE_OPTIONS as readonly number[]).includes(n) ? (n as RangeDays) : 30
}

/** YYYY-MM-DD in UTC. Buckets are UTC days — fine at this granularity; Dhaka is UTC+6 all year. */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export interface DayPoint {
  /** YYYY-MM-DD */
  day: string
  /** Short label for the axis, e.g. "12 Jul". */
  label: string
  sales: number
  orders: number
}

export interface CategorySlice {
  name: string
  value: number
}

export interface RankedProduct {
  id: string
  title: string
  slug: string
  imageUrl: string | null
  revenue: number
  units: number
}

export interface RankedVendor {
  sellerId: string
  businessName: string
  revenue: number
  commission: number
}

export interface LowStockRow {
  id: string
  title: string
  stock: number
  imageUrl: string | null
  sellerName: string
}

export interface RecentReview {
  id: string
  rating: number
  comment: string | null
  createdAt: Date
  userName: string | null
  productTitle: string
  productSlug: string
}

export interface DashboardAnalytics {
  range: RangeDays
  series: DayPoint[]
  /** Order value placed in the window (excl. cancelled) and the same for the previous window. */
  salesInRange: number
  salesPrevRange: number
  ordersInRange: number
  ordersPrevRange: number
  salesToday: number
  ordersToday: number
  pendingOrders: number
  newCustomers: number
  outOfStock: number
  lowStock: number
  activeCoupons: number
  byCategory: CategorySlice[]
  topProducts: RankedProduct[]
  topVendors: RankedVendor[]
  lowStockRows: LowStockRow[]
  recentReviews: RecentReview[]
}

/** Percent change vs the previous window, or null when the previous window had nothing. */
export function deltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

const LOW_STOCK_THRESHOLD = 5

export const getDashboardAnalytics = cache(async (range: RangeDays): Promise<DashboardAnalytics> => {
  const DAY = 24 * 60 * 60 * 1000
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setUTCHours(0, 0, 0, 0)
  // CALENDAR-day windows, aligned to the buckets: "last 30d" = the last 30 UTC days including
  // today. Anchoring at `now` instead would leave a partial day that lands in the range totals
  // but in no bucket — the chart and its own headline number would silently disagree.
  const windowStart = new Date(startOfToday.getTime() - (range - 1) * DAY)
  const prevWindowStart = new Date(windowStart.getTime() - range * DAY)

  const [orders, itemsInRange, lowStockRows, outOfStock, lowStock, activeCoupons, newCustomers, pendingOrders, recentReviewRows] =
    await Promise.all([
      // One fetch spans BOTH windows — the delta and the chart cannot disagree.
      prisma.order.findMany({
        where: { placedAt: { gte: prevWindowStart }, status: { not: OrderStatus.CANCELLED } },
        select: { placedAt: true, total: true },
        orderBy: { placedAt: 'asc' },
      }),
      // Category/product/vendor rankings need the line items of the CURRENT window only.
      prisma.orderItem.findMany({
        where: {
          order: { placedAt: { gte: windowStart }, status: { not: OrderStatus.CANCELLED } },
        },
        select: {
          lineTotal: true,
          commissionAmount: true,
          quantity: true,
          sellerId: true,
          seller: { select: { businessName: true } },
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              images: { orderBy: { displayOrder: 'asc' }, take: 1, select: { url: true } },
              category: {
                select: { name: true, parent: { select: { name: true } } },
              },
            },
          },
        },
      }),
      prisma.product.findMany({
        where: {
          status: ProductStatus.APPROVED,
          stock: { gt: 0, lte: LOW_STOCK_THRESHOLD },
        },
        select: {
          id: true,
          title: true,
          stock: true,
          images: { orderBy: { displayOrder: 'asc' }, take: 1, select: { url: true } },
          seller: { select: { businessName: true } },
        },
        orderBy: { stock: 'asc' },
        take: 6,
      }),
      prisma.product.count({ where: { status: ProductStatus.APPROVED, stock: { lte: 0 } } }),
      prisma.product.count({
        where: { status: ProductStatus.APPROVED, stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } },
      }),
      prisma.coupon.count({
        where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      }),
      prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: windowStart } } }),
      prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: { select: { name: true } },
          product: { select: { title: true, slug: true } },
        },
      }),
    ])

  // ---- fold orders into zero-filled daily buckets for the current window ----
  const buckets = new Map<string, DayPoint>()
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(startOfToday.getTime() - i * 24 * 60 * 60 * 1000)
    const key = dayKey(d)
    buckets.set(key, {
      day: key,
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
      sales: 0,
      orders: 0,
    })
  }

  let salesInRange = 0
  let ordersInRange = 0
  let salesPrevRange = 0
  let ordersPrevRange = 0
  let salesToday = 0
  let ordersToday = 0

  for (const order of orders) {
    const inCurrent = order.placedAt >= windowStart
    if (inCurrent) {
      salesInRange += order.total
      ordersInRange++
      const bucket = buckets.get(dayKey(order.placedAt))
      if (bucket) {
        bucket.sales += order.total
        bucket.orders++
      }
      if (order.placedAt >= startOfToday) {
        salesToday += order.total
        ordersToday++
      }
    } else {
      salesPrevRange += order.total
      ordersPrevRange++
    }
  }

  // ---- rankings, folded in JS (Prisma groupBy cannot traverse to category/seller names) ----
  const byCategoryMap = new Map<string, number>()
  const byProduct = new Map<string, RankedProduct>()
  const byVendor = new Map<string, RankedVendor>()

  for (const item of itemsInRange) {
    // Roll child categories up to their top-level parent — six slices read, twenty-four don't.
    const cat = item.product.category
    const topName = cat.parent?.name ?? cat.name
    byCategoryMap.set(topName, (byCategoryMap.get(topName) ?? 0) + item.lineTotal)

    const existing = byProduct.get(item.product.id)
    if (existing) {
      existing.revenue += item.lineTotal
      existing.units += item.quantity
    } else {
      byProduct.set(item.product.id, {
        id: item.product.id,
        title: item.product.title,
        slug: item.product.slug,
        imageUrl: item.product.images[0]?.url ?? null,
        revenue: item.lineTotal,
        units: item.quantity,
      })
    }

    const vendor = byVendor.get(item.sellerId)
    if (vendor) {
      vendor.revenue += item.lineTotal
      vendor.commission += item.commissionAmount
    } else {
      byVendor.set(item.sellerId, {
        sellerId: item.sellerId,
        businessName: item.seller.businessName,
        revenue: item.lineTotal,
        commission: item.commissionAmount,
      })
    }
  }

  return {
    range,
    series: [...buckets.values()],
    salesInRange,
    salesPrevRange,
    ordersInRange,
    ordersPrevRange,
    salesToday,
    ordersToday,
    pendingOrders,
    newCustomers,
    outOfStock,
    lowStock,
    activeCoupons,
    byCategory: [...byCategoryMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    topProducts: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    topVendors: [...byVendor.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    lowStockRows: lowStockRows.map((p) => ({
      id: p.id,
      title: p.title,
      stock: p.stock,
      imageUrl: p.images[0]?.url ?? null,
      sellerName: p.seller.businessName,
    })),
    recentReviews: recentReviewRows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      userName: r.user.name,
      productTitle: r.product.title,
      productSlug: r.product.slug,
    })),
  }
})
