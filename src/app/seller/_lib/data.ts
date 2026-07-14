/**
 * Seller-scoped reads.
 *
 * `@/lib/queries` is the STOREFRONT read layer — every query there is gated to APPROVED products
 * from APPROVED sellers, which is exactly wrong for a seller looking at their own draft, pending
 * and rejected listings. So the portal has its own read layer, and it obeys one rule instead:
 *
 *      EVERY QUERY IN THIS FILE IS SCOPED BY `sellerId`.
 *
 * The `sellerId` always comes from `requireSeller()` (i.e. from the session cookie), never from a
 * URL or a form field. That is what makes an IDOR impossible: there is no reachable code path that
 * reads another shop's product, order line or payout.
 */
import { prisma } from '@/lib/db'
import { OrderStatus, Prisma, ProductStatus } from '@/generated/prisma/client'

/* -------------------------------------------------------------------------- */
/* Money                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * What the seller has actually earned: their cut of every line that reached the customer.
 * `sellerEarning` was frozen onto the line at purchase time by `splitCommission()`, so a later
 * change to the shop's commission rate cannot retroactively rewrite this number.
 */
export async function getDeliveredEarnings(sellerId: string): Promise<number> {
  const { _sum } = await prisma.orderItem.aggregate({
    where: { sellerId, status: OrderStatus.DELIVERED },
    _sum: { sellerEarning: true },
  })
  return _sum.sellerEarning ?? 0
}

export interface PayoutBalance {
  /** Lifetime net earnings on DELIVERED lines. */
  earned: number
  /** Already covered by a payout row — scheduled, in transit or paid. */
  allocated: number
  /** Actually in the seller's bank/bKash. */
  paid: number
  /** Earned but not yet covered by any payout row. This is what the next cycle will pay. */
  unpaid: number
}

/**
 * A payout row — at ANY status — is money already claimed against the balance. A PENDING payout is
 * the marketplace saying "this is yours, it goes out on Thursday"; counting it as still-unpaid
 * would show the seller the same Taka twice and make them think they were shorted.
 */
export async function getPayoutBalance(sellerId: string): Promise<PayoutBalance> {
  const [earned, allocatedAgg, paidAgg] = await Promise.all([
    getDeliveredEarnings(sellerId),
    prisma.payout.aggregate({ where: { sellerId }, _sum: { amount: true } }),
    prisma.payout.aggregate({
      where: { sellerId, status: 'PAID' },
      _sum: { amount: true },
    }),
  ])

  const allocated = allocatedAgg._sum.amount ?? 0
  const paid = paidAgg._sum.amount ?? 0

  // Clamped: an admin over-paying a shop is a support problem, not a negative balance on a chart.
  return { earned, allocated, paid, unpaid: Math.max(0, earned - allocated) }
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

export interface SellerStats {
  revenue: number
  orderCount: number
  liveProducts: number
  pendingProducts: number
  outOfStock: number
  unpaidBalance: number
}

export async function getSellerStats(sellerId: string): Promise<SellerStats> {
  const [revenue, orders, liveProducts, pendingProducts, outOfStock, balance] = await Promise.all([
    getDeliveredEarnings(sellerId),
    // An order counts ONCE even when the seller has three lines in it — `distinct` on orderId is
    // the whole reason this is a findMany and not a count.
    prisma.orderItem.findMany({
      where: { sellerId },
      distinct: ['orderId'],
      select: { orderId: true },
    }),
    prisma.product.count({ where: { sellerId, status: ProductStatus.APPROVED } }),
    prisma.product.count({ where: { sellerId, status: ProductStatus.PENDING } }),
    prisma.product.count({
      where: { sellerId, status: ProductStatus.APPROVED, stock: { lte: 0 } },
    }),
    getPayoutBalance(sellerId),
  ])

  return {
    revenue,
    orderCount: orders.length,
    liveProducts,
    pendingProducts,
    outOfStock,
    unpaidBalance: balance.unpaid,
  }
}

export interface EarningsDay {
  /** Midnight, local time, of the day this bar represents. */
  date: Date
  /** "Mon" */
  label: string
  amount: number
}

/** Lines that will never pay out. Excluded from the chart — a cancelled sale is not earnings. */
const DEAD_LINE_STATUSES = [OrderStatus.CANCELLED, OrderStatus.RETURNED]

/**
 * Net earnings booked per day for the last 7 days, oldest bar first.
 *
 * Bucketed by the order's `placedAt`, because an OrderItem has no timestamp of its own — the day a
 * line was *sold* is the only date the schema actually knows. Cancelled and returned lines are
 * dropped; everything still moving through fulfilment is counted, so a seller can see the week they
 * are having and not just the week that has already settled.
 */
export async function getEarningsLast7Days(sellerId: string): Promise<EarningsDay[]> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 6)

  const items = await prisma.orderItem.findMany({
    where: {
      sellerId,
      status: { notIn: DEAD_LINE_STATUSES },
      order: { placedAt: { gte: start } },
    },
    select: { sellerEarning: true, order: { select: { placedAt: true } } },
  })

  const days: EarningsDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    return {
      date,
      label: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      amount: 0,
    }
  })

  for (const item of items) {
    const placed = new Date(item.order.placedAt)
    placed.setHours(0, 0, 0, 0)
    const index = Math.round((placed.getTime() - start.getTime()) / 86_400_000)
    if (index >= 0 && index < 7) days[index].amount += item.sellerEarning
  }

  return days
}

const recentItemSelect = {
  id: true,
  titleSnapshot: true,
  imageSnapshot: true,
  variantLabel: true,
  quantity: true,
  lineTotal: true,
  commissionAmount: true,
  sellerEarning: true,
  status: true,
  order: { select: { id: true, orderNumber: true, placedAt: true, shipFullName: true } },
} satisfies Prisma.OrderItemSelect

export type RecentSellerItem = Prisma.OrderItemGetPayload<{ select: typeof recentItemSelect }>

export async function getRecentSellerItems(sellerId: string, limit = 6): Promise<RecentSellerItem[]> {
  return prisma.orderItem.findMany({
    where: { sellerId },
    select: recentItemSelect,
    orderBy: { order: { placedAt: 'desc' } },
    take: limit,
  })
}

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

const sellerProductSelect = {
  id: true,
  title: true,
  slug: true,
  sku: true,
  price: true,
  discountPrice: true,
  stock: true,
  status: true,
  soldCount: true,
  updatedAt: true,
  category: { select: { name: true } },
  brand: { select: { name: true } },
  images: { orderBy: { displayOrder: 'asc' }, take: 1, select: { url: true, alt: true } },
  _count: { select: { variants: true } },
} satisfies Prisma.ProductSelect

export type SellerProductRow = Prisma.ProductGetPayload<{ select: typeof sellerProductSelect }>

export interface SellerProductPage {
  products: SellerProductRow[]
  total: number
  page: number
  totalPages: number
  /** Counts for the filter chips — always for the WHOLE shop, so the chips don't vanish as you filter. */
  counts: { all: number } & Record<ProductStatus, number>
}

export const PRODUCTS_PER_PAGE = 12

export async function getSellerProducts(
  sellerId: string,
  args: { search?: string; status?: ProductStatus | null; page?: number } = {},
): Promise<SellerProductPage> {
  const term = args.search?.trim() ?? ''
  const page = Number.isFinite(args.page) && (args.page ?? 0) > 0 ? Math.trunc(args.page!) : 1

  // No `mode: 'insensitive'` — it does not exist on SQLite. `contains` compiles to LIKE, which is
  // already case-insensitive for ASCII.
  const where: Prisma.ProductWhereInput = { sellerId }
  if (args.status) where.status = args.status
  if (term) {
    where.OR = [{ title: { contains: term } }, { sku: { contains: term } }]
  }

  const [total, grouped] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.groupBy({
      by: ['status'],
      where: { sellerId },
      _count: { _all: true },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE))
  const currentPage = Math.min(page, totalPages) // a stale ?page=9 lands on the last real page

  const products = await prisma.product.findMany({
    where,
    select: sellerProductSelect,
    orderBy: { updatedAt: 'desc' },
    skip: (currentPage - 1) * PRODUCTS_PER_PAGE,
    take: PRODUCTS_PER_PAGE,
  })

  const counts = {
    all: 0,
    DRAFT: 0,
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
  } satisfies SellerProductPage['counts']

  for (const row of grouped) {
    counts[row.status] = row._count._all
    counts.all += row._count._all
  }

  return { products, total, page: currentPage, totalPages, counts }
}

const productEditSelect = {
  id: true,
  title: true,
  titleBn: true,
  description: true,
  price: true,
  discountPrice: true,
  sku: true,
  stock: true,
  status: true,
  categoryId: true,
  brandId: true,
  images: { orderBy: { displayOrder: 'asc' }, select: { url: true, alt: true } },
  variants: {
    orderBy: [{ size: 'asc' }, { color: 'asc' }],
    select: { size: true, color: true, price: true, stock: true, sku: true },
  },
} satisfies Prisma.ProductSelect

export type SellerProductEdit = Prisma.ProductGetPayload<{ select: typeof productEditSelect }>

/**
 * One product for the edit form — scoped by sellerId, so asking for someone else's product id
 * simply returns null and the page 404s. This is the read half of the IDOR guard; the write half
 * lives in `_actions.ts` and re-checks ownership before every mutation.
 */
export async function getSellerProduct(
  sellerId: string,
  productId: string,
): Promise<SellerProductEdit | null> {
  if (!productId) return null
  return prisma.product.findFirst({
    where: { id: productId, sellerId },
    select: productEditSelect,
  })
}

/** The category tree + brand list that back the two <select>s on the product form. */
export async function getProductFormOptions() {
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        children: {
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
          select: { id: true, name: true },
        },
      },
    }),
    prisma.brand.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  return { categories, brands }
}

export type CategoryOptionGroup = Awaited<ReturnType<typeof getProductFormOptions>>['categories'][number]
export type BrandOption = Awaited<ReturnType<typeof getProductFormOptions>>['brands'][number]

/* -------------------------------------------------------------------------- */
/* Orders                                                                     */
/* -------------------------------------------------------------------------- */

const sellerOrderItemSelect = {
  id: true,
  titleSnapshot: true,
  imageSnapshot: true,
  variantLabel: true,
  unitPrice: true,
  quantity: true,
  lineTotal: true,
  commissionRate: true,
  commissionAmount: true,
  sellerEarning: true,
  status: true,
  product: { select: { slug: true } },
} satisfies Prisma.OrderItemSelect

export type SellerOrderItem = Prisma.OrderItemGetPayload<{ select: typeof sellerOrderItemSelect }>

export interface SellerOrderGroup {
  orderId: string
  orderNumber: string
  placedAt: Date
  paymentMethod: string
  paymentStatus: string
  customerName: string
  customerPhone: string
  shipTo: string
  /** ONLY this seller's lines. The customer's other sellers' lines are never loaded. */
  items: SellerOrderItem[]
  gross: number
  commission: number
  earning: number
}

export interface SellerOrderPage {
  groups: SellerOrderGroup[]
  total: number
  page: number
  totalPages: number
}

export const ORDERS_PER_PAGE = 8

/**
 * This seller's order LINES, grouped into the orders they came from.
 *
 * The privacy rule of a marketplace: a seller sees the order, but only their own slice of it.
 * Nothing here selects another seller's items, and the totals (gross/commission/earning) are summed
 * from the seller's own lines — never from `order.total`, which includes other shops' goods, the
 * delivery fee and the customer's coupon.
 *
 * Grouping and pagination happen in JS because the unit of pagination is the ORDER while the unit
 * of the query is the LINE; SQL would need a window function Prisma cannot express. At marketplace
 * scale the fix is a paginated `order.findMany` with a nested item filter — same shape, same UI.
 */
export async function getSellerOrders(
  sellerId: string,
  args: { status?: OrderStatus | null; page?: number } = {},
): Promise<SellerOrderPage> {
  const page = Number.isFinite(args.page) && (args.page ?? 0) > 0 ? Math.trunc(args.page!) : 1

  const items = await prisma.orderItem.findMany({
    where: { sellerId, ...(args.status ? { status: args.status } : {}) },
    select: {
      ...sellerOrderItemSelect,
      order: {
        select: {
          id: true,
          orderNumber: true,
          placedAt: true,
          paymentMethod: true,
          paymentStatus: true,
          shipFullName: true,
          shipPhone: true,
          shipArea: true,
          shipDistrict: true,
          shipAddressLine: true,
        },
      },
    },
    orderBy: { order: { placedAt: 'desc' } },
  })

  const byOrder = new Map<string, SellerOrderGroup>()

  for (const { order, ...item } of items) {
    let group = byOrder.get(order.id)
    if (!group) {
      group = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        placedAt: order.placedAt,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        customerName: order.shipFullName,
        customerPhone: order.shipPhone,
        shipTo: `${order.shipAddressLine}, ${order.shipArea}, ${order.shipDistrict}`,
        items: [],
        gross: 0,
        commission: 0,
        earning: 0,
      }
      byOrder.set(order.id, group)
    }

    group.items.push(item)
    group.gross += item.lineTotal
    group.commission += item.commissionAmount
    group.earning += item.sellerEarning
  }

  const all = [...byOrder.values()].sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime())

  const total = all.length
  const totalPages = Math.max(1, Math.ceil(total / ORDERS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * ORDERS_PER_PAGE

  return {
    groups: all.slice(start, start + ORDERS_PER_PAGE),
    total,
    page: currentPage,
    totalPages,
  }
}

/* -------------------------------------------------------------------------- */
/* Payouts                                                                    */
/* -------------------------------------------------------------------------- */

export async function getSellerPayouts(sellerId: string) {
  return prisma.payout.findMany({
    where: { sellerId },
    orderBy: [{ periodEnd: 'desc' }, { createdAt: 'desc' }],
  })
}
