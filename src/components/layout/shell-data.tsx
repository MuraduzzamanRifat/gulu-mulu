/**
 * Data the storefront shell needs — the category tree behind the mega-menu and the
 * live cart-count badge in the header.
 *
 * Both reads are wrapped in React `cache()`, so the (shop) layout, the header and the
 * mobile menu can all ask for the same thing in one render and SQLite is hit once.
 */
import { cache } from 'react'
import { cookies } from 'next/headers'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/** Anonymous cart key for guests (pre-login). Mirrors the checkout flow's cookie. */
export const CART_COOKIE = 'gm_cart'

export interface CategoryChild {
  id: string
  name: string
  slug: string
}

export interface CategoryNode extends CategoryChild {
  children: CategoryChild[]
}

/** Top-level categories with their children, in admin display order. */
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  return prisma.category.findMany({
    where: { parentId: null },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      children: {
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, slug: true },
      },
    },
  })
})

/**
 * Total units in the current cart — a signed-in user's cart, or a guest's
 * cookie-keyed one. Sums quantities (2× a shirt is 2 items in the badge).
 */
export const getCartCount = cache(async (): Promise<number> => {
  const user = await getCurrentUser()

  let cartWhere: { userId: string } | { sessionKey: string }

  if (user) {
    cartWhere = { userId: user.id }
  } else {
    const jar = await cookies()
    const sessionKey = jar.get(CART_COOKIE)?.value
    if (!sessionKey) return 0
    cartWhere = { sessionKey }
  }

  const agg = await prisma.cartItem.aggregate({
    _sum: { quantity: true },
    where: { cart: cartWhere },
  })

  return agg._sum.quantity ?? 0
})
