/**
 * Pricing engine — the single source of truth for every Taka the marketplace moves.
 *
 * Pure functions only: no DB, no cookies, no `next/*`. That keeps it importable from Server
 * Components, Server Actions and (if ever needed) the client, and makes the arithmetic trivially
 * testable by reading it.
 *
 * MONEY RULES
 *  - Every amount is an Int of whole Taka. There is no paisa. A float must never reach the DB.
 *  - Rounding is decided HERE, once, and nowhere else. Callers add and subtract; they never round.
 *
 * INVARIANTS (hold for all inputs; the worked examples are the regression tests)
 *  1. splitCommission: commissionAmount + sellerEarning === lineTotal, EXACTLY, always.
 *       splitCommission(999, 0.1)  -> { commissionAmount: 100, sellerEarning: 899 }   100+899 = 999
 *       splitCommission(1, 0.5)    -> { commissionAmount: 1,   sellerEarning: 0   }     1+  0 =   1
 *       splitCommission(0, 0.12)   -> { commissionAmount: 0,   sellerEarning: 0   }
 *       splitCommission(500, 0)    -> { commissionAmount: 0,   sellerEarning: 500 }  rate 0 = free
 *     The earning is derived by SUBTRACTION, never by a second Math.round — two independent
 *     roundings are exactly how a marketplace leaks a Taka per line and fails its own audit.
 *  2. applyCoupon: 0 <= discount <= subtotal. A 100% or oversized coupon zeroes the goods, it
 *     never turns delivery into a refund.
 *       applyCoupon(1000, { PERCENT, value: 100 })                  -> 1000  (not 1001)
 *       applyCoupon(1000, { FIXED,   value: 5000 })                 -> 1000  (clamped, no cash back)
 *       applyCoupon(1000, { PERCENT, value: 20, maxDiscount: 150 }) ->  150  (cap wins over 200)
 *  3. summarizeCart: total === max(0, subtotal + deliveryFee - discount) and total >= 0.
 *     An empty cart is all zeroes — no phantom ৳60 delivery on an empty page.
 */
import type { Coupon } from '@/generated/prisma/client'
import { CouponType } from '@/generated/prisma/client'
import { formatBDT } from '@/lib/format'

/* -------------------------------------------------------------------------- */
/* Delivery                                                                   */
/* -------------------------------------------------------------------------- */

export const DELIVERY_FEE_INSIDE_DHAKA = 60
export const DELIVERY_FEE_OUTSIDE_DHAKA = 120

/** Districts that count as "inside Dhaka" for the ৳60 rate. Lower-cased for comparison. */
const DHAKA_ALIASES = new Set(['dhaka'])

/**
 * ৳60 inside Dhaka, ৳120 everywhere else.
 *
 * Anything we don't positively recognise as Dhaka is charged the OUTSIDE rate. That direction is
 * deliberate: mis-charging ৳120 to a Dhaka customer is a visible, fixable annoyance, while
 * mis-charging ৳60 to a Sylhet customer silently eats ৳60 of margin on every such order.
 */
export function calcDeliveryFee(district: string | null | undefined): number {
  const normalized = (district ?? '').trim().toLowerCase()
  return DHAKA_ALIASES.has(normalized) ? DELIVERY_FEE_INSIDE_DHAKA : DELIVERY_FEE_OUTSIDE_DHAKA
}

/* -------------------------------------------------------------------------- */
/* Coupons                                                                    */
/* -------------------------------------------------------------------------- */

/** Only the fields the maths needs — so an admin preview can pass a draft coupon that has no id. */
export type CouponLike = Pick<
  Coupon,
  'type' | 'value' | 'minOrder' | 'maxDiscount' | 'usageLimit' | 'usedCount' | 'expiresAt' | 'isActive'
>

export interface CouponResult {
  /** Whole Taka off the subtotal. Always 0 when `error` is set. */
  discount: number
  /** Customer-facing reason the coupon did not apply. Absent when it applied (or when none given). */
  error?: string
}

/**
 * Validate a coupon against a subtotal and return the discount in whole Taka.
 *
 * A null coupon is NOT an error — it is simply "no coupon", worth ৳0. Only a coupon that was
 * offered and rejected produces an `error`, so the checkout can show a reason without shouting at
 * customers who never typed a code.
 *
 * The discount applies to the GOODS subtotal only — never to the delivery fee. Discounting
 * delivery would let a big enough coupon drive the total negative.
 */
export function applyCoupon(subtotal: number, coupon: CouponLike | null | undefined): CouponResult {
  if (!coupon) return { discount: 0 }

  if (!coupon.isActive) {
    return { discount: 0, error: 'This coupon is no longer active.' }
  }

  if (coupon.expiresAt && coupon.expiresAt.getTime() <= Date.now()) {
    return { discount: 0, error: 'This coupon has expired.' }
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { discount: 0, error: 'This coupon has reached its usage limit.' }
  }

  if (subtotal < coupon.minOrder) {
    return {
      discount: 0,
      error: `Spend at least ${formatBDT(coupon.minOrder)} to use this coupon.`,
    }
  }

  // A zero/negative-value coupon is a data error, not a customer error. Silently worth nothing.
  if (coupon.value <= 0 || subtotal <= 0) return { discount: 0 }

  let raw: number
  if (coupon.type === CouponType.PERCENT) {
    // floor, not round: never hand out more than the advertised percentage.
    raw = Math.floor((subtotal * coupon.value) / 100)
    // maxDiscount caps PERCENT coupons only — a FIXED coupon already states its own ceiling.
    if (coupon.maxDiscount != null) {
      raw = Math.min(raw, Math.max(0, coupon.maxDiscount))
    }
  } else {
    raw = coupon.value
  }

  // Invariant 2: never below 0, never above the goods subtotal.
  const discount = Math.max(0, Math.min(Math.round(raw), subtotal))
  return { discount }
}

/* -------------------------------------------------------------------------- */
/* Commission (the multi-vendor split)                                        */
/* -------------------------------------------------------------------------- */

export interface CommissionSplit {
  /** What Gulu Mulu keeps. */
  commissionAmount: number
  /** What the seller is owed. */
  sellerEarning: number
}

/**
 * Split one order line between the marketplace and the seller.
 *
 * Frozen onto OrderItem at purchase time, so a later commissionRate change can never rewrite
 * history or a pending payout.
 *
 * Invariant 1: the two halves sum back to lineTotal EXACTLY. Guaranteed structurally —
 * sellerEarning is `lineTotal - commissionAmount`, never a second rounding of its own.
 */
export function splitCommission(lineTotal: number, commissionRate: number): CommissionSplit {
  // Defend against dirty data: a NaN rate or a rate of 3.0 would otherwise mint or burn money.
  const safeTotal = Math.max(0, Math.round(lineTotal || 0))
  const safeRate = Number.isFinite(commissionRate) ? Math.min(1, Math.max(0, commissionRate)) : 0

  const commissionAmount = Math.min(safeTotal, Math.max(0, Math.round(safeTotal * safeRate)))
  const sellerEarning = safeTotal - commissionAmount

  return { commissionAmount, sellerEarning }
}

/* -------------------------------------------------------------------------- */
/* Cart summary                                                               */
/* -------------------------------------------------------------------------- */

/**
 * One priced cart/checkout line, reduced to the only two things the maths cares about.
 * `unitPrice` is the EFFECTIVE price already (discount and variant override resolved upstream by
 * `unitPriceFor()` in @/lib/cart) — this function never re-derives a price.
 */
export interface PricedLine {
  unitPrice: number
  quantity: number
}

export interface CartSummary {
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  /** Set when a coupon was supplied but rejected, so checkout can explain why. */
  couponError?: string
}

/** Whole Taka for one line. */
export function lineTotal(line: PricedLine): number {
  return Math.max(0, Math.round(line.unitPrice)) * Math.max(0, Math.trunc(line.quantity))
}

/**
 * The one function that decides what a customer owes.
 *
 * `district` may be null on the cart page (no address chosen yet); that falls through to the
 * OUTSIDE-Dhaka estimate, so the fee can only ever drop at checkout, never jump.
 *
 * Invariant 3: total = max(0, subtotal + deliveryFee - discount).
 */
export function summarizeCart(
  items: readonly PricedLine[],
  coupon: CouponLike | null | undefined,
  district: string | null | undefined,
): CartSummary {
  // An empty cart owes nothing — not even delivery.
  if (items.length === 0) {
    return { subtotal: 0, deliveryFee: 0, discount: 0, total: 0 }
  }

  const subtotal = items.reduce((sum, line) => sum + lineTotal(line), 0)

  // A cart whose every line is free (or zero-qty) still shouldn't be charged for delivery.
  if (subtotal <= 0) {
    return { subtotal: 0, deliveryFee: 0, discount: 0, total: 0 }
  }

  const deliveryFee = calcDeliveryFee(district)
  const { discount, error } = applyCoupon(subtotal, coupon)

  const total = Math.max(0, subtotal + deliveryFee - discount)

  return {
    subtotal,
    deliveryFee,
    discount,
    total,
    ...(error ? { couponError: error } : {}),
  }
}
