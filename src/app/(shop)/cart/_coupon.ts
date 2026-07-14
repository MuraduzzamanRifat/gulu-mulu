/**
 * The applied coupon — and where it lives.
 *
 * There is no `Cart.couponCode` column in the schema, and adding one is not this agent's file to
 * touch. So the applied code rides in an httpOnly cookie, exactly like the guest cart key does.
 * That is not a workaround, it is the same trade the cart engine already makes:
 *
 *   - it survives a refresh, a tab close, and the cart -> checkout hop;
 *   - it works for a guest who hasn't signed in yet;
 *   - httpOnly means client JS can neither read it nor forge it.
 *
 * THE COOKIE HOLDS A CODE, NEVER AN AMOUNT. Nothing here is trusted: the code is looked up in the
 * DB and re-run through `applyCoupon()` on every single render and again inside the order
 * transaction. A customer who somehow rewrote this cookie to `EIDSALE` gets exactly what anyone
 * typing EIDSALE gets — the coupon's real terms, or its real error. There is no discount to steal.
 *
 * READ-ONLY MODULE. It never calls `cookies().set()`, so it is safe from a Server Component.
 * Writing the cookie is `_actions.ts`'s job, because Set-Cookie cannot be emitted mid-render.
 */
import { cache } from 'react'
import { cookies } from 'next/headers'

import { prisma } from '@/lib/db'
import type { Coupon } from '@/generated/prisma/client'

export const COUPON_COOKIE = 'gm_coupon'

/** A week. Long enough to survive an abandoned cart, short enough that a stale code lapses. */
export const COUPON_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

/** Codes are stored uppercase and matched exactly. "  eidsale " and "EIDSALE" are one coupon. */
export function normalizeCouponCode(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase()
}

/**
 * The coupon row for the code in the cookie, or null.
 *
 * Deliberately returns the row even when it is expired / inactive / used up: `applyCoupon()` in
 * '@/lib/pricing' owns those verdicts and phrases them for the customer ("This coupon has
 * expired."). Filtering them out here would turn a helpful message into a silently vanishing
 * discount, which is the worse bug — the customer thinks the code applied.
 *
 * React-`cache`d: the cart page, the checkout page and the order summary all ask, SQLite answers
 * once.
 */
export const getAppliedCoupon = cache(async (): Promise<Coupon | null> => {
  const jar = await cookies()
  const raw = jar.get(COUPON_COOKIE)?.value
  if (!raw) return null

  const code = normalizeCouponCode(raw)
  if (!code) return null

  return prisma.coupon.findUnique({ where: { code } })
})
