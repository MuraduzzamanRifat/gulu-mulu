/**
 * Customer read queries (§17). Same money discipline as the rest of the admin: "total spent" is
 * DELIVERED order value only — an order at PENDING may still be cancelled, and counting it as
 * money the customer has spent is how a CRM ends up lying about lifetime value.
 *
 * Sellers and admins are their own thing (`/zawadpanel/sellers`, staff): this surface lists role=CUSTOMER
 * only, and the detail page refuses a non-customer id rather than leaking a seller's order history
 * through the wrong door.
 */
import { cache } from 'react'

import { prisma } from '@/lib/db'
import { OrderStatus, Prisma, Role } from '@/generated/prisma/client'

import { PER_PAGE } from './data'

/* --------------------------------- List ---------------------------------- */

export interface AdminCustomerRow {
  id: string
  name: string | null
  phone: string
  email: string | null
  createdAt: Date
  orderCount: number
  reviewCount: number
  /** Delivered order value — what they have actually spent. */
  totalSpent: number
}

export interface AdminCustomers {
  customers: AdminCustomerRow[]
  total: number
  totalPages: number
  page: number
}

export async function getAdminCustomers(filters: { q: string; page: number }): Promise<AdminCustomers> {
  const { q, page } = filters

  const where: Prisma.UserWhereInput = {
    role: Role.CUSTOMER,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const safePage = Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1
  const total = await prisma.user.count({ where })
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const currentPage = Math.min(safePage, totalPages)

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      createdAt: true,
      _count: { select: { orders: true, reviews: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (currentPage - 1) * PER_PAGE,
    take: PER_PAGE,
  })

  // One grouped aggregate for the whole page's spend, folded in JS — no N+1.
  const ids = users.map((u) => u.id)
  const spendRows = ids.length
    ? await prisma.order.groupBy({
        by: ['userId'],
        _sum: { total: true },
        where: { userId: { in: ids }, status: OrderStatus.DELIVERED },
      })
    : []
  const spend = new Map(spendRows.map((r) => [r.userId, r._sum.total ?? 0]))

  return {
    customers: users.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      createdAt: u.createdAt,
      orderCount: u._count.orders,
      reviewCount: u._count.reviews,
      totalSpent: spend.get(u.id) ?? 0,
    })),
    total,
    totalPages,
    page: currentPage,
  }
}

/* -------------------------------- Detail --------------------------------- */

const customerDetailInclude = {
  _count: { select: { orders: true, reviews: true, wishlist: true, addresses: true } },
  addresses: { orderBy: { isDefault: 'desc' } },
  orders: {
    orderBy: { placedAt: 'desc' },
    take: 10,
    include: { items: { select: { sellerId: true } } },
  },
  reviews: {
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: { product: { select: { title: true, slug: true } } },
  },
  wishlist: {
    orderBy: { createdAt: 'desc' },
    take: 12,
    include: {
      product: {
        select: {
          title: true,
          slug: true,
          price: true,
          discountPrice: true,
          images: { orderBy: { displayOrder: 'asc' }, take: 1, select: { url: true } },
        },
      },
    },
  },
} satisfies Prisma.UserInclude

export type AdminCustomerDetail = Prisma.UserGetPayload<{ include: typeof customerDetailInclude }> & {
  stats: {
    totalOrders: number
    deliveredOrders: number
    totalSpent: number
    /** Average DELIVERED order value; 0 when nothing has been delivered. */
    avgOrder: number
  }
}

export const getAdminCustomer = cache(async (id: string): Promise<AdminCustomerDetail | null> => {
  if (!id) return null

  const user = await prisma.user.findUnique({ where: { id }, include: customerDetailInclude })
  // Guard the door: this page is for customers. A seller or admin id lands on a 404, not on a
  // half-rendered profile that exposes their orders through the customer surface.
  if (!user || user.role !== Role.CUSTOMER) return null

  const [deliveredCount, spendAgg] = await Promise.all([
    prisma.order.count({ where: { userId: id, status: OrderStatus.DELIVERED } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { userId: id, status: OrderStatus.DELIVERED },
    }),
  ])

  const totalSpent = spendAgg._sum.total ?? 0

  return {
    ...user,
    stats: {
      totalOrders: user._count.orders,
      deliveredOrders: deliveredCount,
      totalSpent,
      avgOrder: deliveredCount > 0 ? Math.round(totalSpent / deliveredCount) : 0,
    },
  }
})
