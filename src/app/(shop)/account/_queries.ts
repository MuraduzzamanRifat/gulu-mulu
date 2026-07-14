/**
 * Reads for the customer account area.
 *
 * These live here rather than in '@/lib/queries' because that module is the STOREFRONT's read
 * layer (catalogue, search, merchandising) and is shared by every agent. Nothing below is a
 * storefront read — every function is scoped to one signed-in user's own rows.
 *
 * Every query takes `userId` and filters on it. That filter IS the authorisation check: there is
 * no code path here that can return another customer's order, address or wishlist, even with a
 * guessed id.
 */
import { cache } from 'react'

import { prisma } from '@/lib/db'
import { STOREFRONT_PRODUCT } from '@/lib/queries'
import { OrderStatus, Prisma } from '@/generated/prisma/client'

/* -------------------------------------------------------------------------- */
/* Orders                                                                     */
/* -------------------------------------------------------------------------- */

/** "In flight" — the order is neither finished nor dead, so it still has a tracking story. */
export const ACTIVE_ORDER_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
] as const

/** Cancelled/returned money was never really spent — it must not inflate "total spent". */
const NON_SPEND_STATUSES = [OrderStatus.CANCELLED, OrderStatus.RETURNED] as const

const orderListInclude = {
  items: {
    orderBy: { id: 'asc' },
    select: {
      id: true,
      titleSnapshot: true,
      imageSnapshot: true,
      variantLabel: true,
      quantity: true,
      lineTotal: true,
      product: { select: { slug: true } },
    },
  },
} satisfies Prisma.OrderInclude

export type AccountOrder = Prisma.OrderGetPayload<{ include: typeof orderListInclude }>

/**
 * The customer's orders, newest first.
 *
 * Ordered by `placedAt`, not `createdAt` — Order has no `createdAt`, and `placedAt` is the date
 * the shopper actually recognises. `id` breaks the tie so two orders placed in the same second
 * (a double-tapped "Place order") never flip position between renders.
 */
export const getUserOrders = cache(async (userId: string, take?: number): Promise<AccountOrder[]> => {
  return prisma.order.findMany({
    where: { userId },
    orderBy: [{ placedAt: 'desc' }, { id: 'desc' }],
    include: orderListInclude,
    ...(take ? { take } : {}),
  })
})

/* -------------------------------------------------------------------------- */
/* Dashboard stats                                                            */
/* -------------------------------------------------------------------------- */

export interface AccountSummary {
  totalOrders: number
  activeOrders: number
  deliveredOrders: number
  /** Whole BDT across everything not cancelled or returned. */
  totalSpent: number
  wishlistCount: number
  addressCount: number
}

/**
 * Six counters for the dashboard tiles. Aggregates, not a `findMany().length` — the account page
 * must not drag every order the customer has ever placed across the wire to print the number 7.
 */
export const getAccountSummary = cache(async (userId: string): Promise<AccountSummary> => {
  const [totalOrders, activeOrders, deliveredOrders, spend, wishlistCount, addressCount] =
    await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.order.count({ where: { userId, status: { in: [...ACTIVE_ORDER_STATUSES] } } }),
      prisma.order.count({ where: { userId, status: OrderStatus.DELIVERED } }),
      prisma.order.aggregate({
        where: { userId, status: { notIn: [...NON_SPEND_STATUSES] } },
        _sum: { total: true },
      }),
      prisma.wishlistItem.count({ where: { userId } }),
      prisma.address.count({ where: { userId } }),
    ])

  return {
    totalOrders,
    activeOrders,
    deliveredOrders,
    totalSpent: spend._sum.total ?? 0,
    wishlistCount,
    addressCount,
  }
})

/* -------------------------------------------------------------------------- */
/* Wishlist                                                                   */
/* -------------------------------------------------------------------------- */

const wishlistInclude = {
  product: {
    include: {
      images: { orderBy: { displayOrder: 'asc' } },
      brand: true,
      // Only the count matters: a product with options can't be one-tap added to the cart,
      // so the card sends the shopper to the PDP to choose instead.
      variants: { select: { id: true } },
    },
  },
} satisfies Prisma.WishlistItemInclude

export type WishlistEntry = Prisma.WishlistItemGetPayload<{ include: typeof wishlistInclude }>

/**
 * Wishlisted products, newest save first.
 *
 * Gated by `STOREFRONT_PRODUCT` (the same predicate every storefront query spreads), so a listing
 * that was rejected — or whose shop got suspended — drops out of the wishlist exactly as it drops
 * out of search. A wishlist is not a loophole back into the unapproved catalogue.
 */
export const getWishlistEntries = cache(async (userId: string): Promise<WishlistEntry[]> => {
  return prisma.wishlistItem.findMany({
    where: { userId, product: STOREFRONT_PRODUCT },
    orderBy: { createdAt: 'desc' },
    include: wishlistInclude,
  })
})

/* -------------------------------------------------------------------------- */
/* Addresses                                                                  */
/* -------------------------------------------------------------------------- */

/** Saved addresses, default first, then alphabetically by the label the customer gave it. */
export const getUserAddresses = cache(async (userId: string) => {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { label: 'asc' }, { id: 'asc' }],
  })
})

/** One address — scoped to its owner, so a guessed id from another account simply doesn't exist. */
export const getUserAddress = cache(async (userId: string, addressId: string) => {
  if (!addressId) return null
  return prisma.address.findFirst({ where: { id: addressId, userId } })
})
