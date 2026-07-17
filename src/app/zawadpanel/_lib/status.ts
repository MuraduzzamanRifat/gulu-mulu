/**
 * The admin panel's status vocabulary.
 *
 * One place decides what every status is CALLED and what colour it wears, so a PENDING seller, a
 * PENDING product and a PENDING payment can never drift into three different-looking chips — and
 * so the filter dropdowns and the chips are generated from the same list and cannot fall out of
 * step with each other.
 */
import type { BadgeProps } from '@/components/ui'
// TYPE-ONLY. This module is imported by client components, and a runtime import of the generated
// Prisma client would pull `node:module` into the browser bundle and fail the build outright. The
// VALUES come from './enums', which is a plain object with no runtime dependency — see the long
// explanation there.
import type {
  BannerPlacement,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  SellerStatus,
} from '@/generated/prisma/client'

import {
  BANNER_PLACEMENT,
  ORDER_STATUS,
  PAYMENT_STATUS,
  PRODUCT_STATUS,
  SELLER_STATUS,
} from './enums'

export type Tone = NonNullable<BadgeProps['variant']>

/** Narrow an untrusted `?status=` param down to a real enum member, or null. */
function narrow<T extends string>(values: readonly T[]) {
  return (value: string | undefined): T | null => {
    if (!value) return null
    return (values as readonly string[]).includes(value) ? (value as T) : null
  }
}

/* -------------------------------------------------------------------------- */
/* Sellers                                                                    */
/* -------------------------------------------------------------------------- */

export const SELLER_STATUS_VALUES = [
  SELLER_STATUS.PENDING,
  SELLER_STATUS.APPROVED,
  SELLER_STATUS.SUSPENDED,
  SELLER_STATUS.REJECTED,
] as const

export const SELLER_STATUS_LABEL: Record<SellerStatus, string> = {
  PENDING: 'Awaiting review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
}

export const SELLER_STATUS_TONE: Record<SellerStatus, Tone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  SUSPENDED: 'danger',
}

export const toSellerStatus = narrow(SELLER_STATUS_VALUES)

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

export const PRODUCT_STATUS_VALUES = [
  PRODUCT_STATUS.PENDING,
  PRODUCT_STATUS.APPROVED,
  PRODUCT_STATUS.REJECTED,
  PRODUCT_STATUS.DRAFT,
] as const

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Awaiting review',
  APPROVED: 'Live',
  REJECTED: 'Rejected',
}

export const PRODUCT_STATUS_TONE: Record<ProductStatus, Tone> = {
  DRAFT: 'neutral',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
}

export const toProductStatus = narrow(PRODUCT_STATUS_VALUES)

/* -------------------------------------------------------------------------- */
/* Orders                                                                     */
/* -------------------------------------------------------------------------- */

export const ORDER_STATUS_VALUES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.RETURNED,
] as const

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
}

export const ORDER_STATUS_TONE: Record<OrderStatus, Tone> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  SHIPPED: 'brand',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  RETURNED: 'danger',
}

export const toOrderStatus = narrow(ORDER_STATUS_VALUES)

/**
 * Where an admin may move an order FROM each state.
 *
 * This is a graph, not a ladder, because an admin is the one person who can take an order
 * sideways — cancelling a stuck order, booking a return. It is still not a free-for-all:
 *
 *  - CANCELLED and RETURNED are terminal. Un-cancelling would have to re-take stock that has
 *    already gone back on the shelf and may since have been sold to someone else.
 *  - You cannot cancel something already handed to a rider (SHIPPED) — that is a RETURN, and the
 *    distinction is the whole difference between "no sale" and "a sale that came back".
 *  - No state can jump the queue; each step is one rung, so the customer's timeline stays honest.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  CONFIRMED: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  PROCESSING: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  SHIPPED: [ORDER_STATUS.DELIVERED, ORDER_STATUS.RETURNED],
  DELIVERED: [ORDER_STATUS.RETURNED],
  CANCELLED: [],
  RETURNED: [],
}

/** The verb on the button that moves an order to `to`. */
export const ORDER_ACTION_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Reopen as pending',
  CONFIRMED: 'Confirm order',
  PROCESSING: 'Start processing',
  SHIPPED: 'Mark shipped',
  DELIVERED: 'Mark delivered',
  CANCELLED: 'Cancel order',
  RETURNED: 'Mark returned',
}

/** The two moves that put stock back on the shelf, and so need a confirmation. */
export function isDestructiveTransition(to: OrderStatus): boolean {
  return to === ORDER_STATUS.CANCELLED || to === ORDER_STATUS.RETURNED
}

/* -------------------------------------------------------------------------- */
/* Payments                                                                   */
/* -------------------------------------------------------------------------- */

export const PAYMENT_STATUS_VALUES = [
  PAYMENT_STATUS.PENDING,
  PAYMENT_STATUS.PAID,
  PAYMENT_STATUS.FAILED,
  PAYMENT_STATUS.REFUNDED,
] as const

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Unpaid',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
}

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, Tone> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  REFUNDED: 'neutral',
}

export const toPaymentStatus = narrow(PAYMENT_STATUS_VALUES)

/**
 * Payment moves on its own axis from fulfilment — a COD parcel can be delivered and unpaid (the
 * rider came back empty-handed), and a card order can be paid and never shipped.
 *
 * REFUNDED is reachable ONLY from PAID. There is nothing to refund if no money ever arrived, and an
 * order marked "refunded" when nothing was taken is how a marketplace pays the same customer twice.
 * The Server Action enforces this map; the UI reads it so it never offers a button that is going to
 * be refused.
 */
export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED],
  PAID: [PAYMENT_STATUS.REFUNDED],
  FAILED: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PAID],
  REFUNDED: [],
}

/** The verb on the button that moves a payment to `to`. */
export const PAYMENT_ACTION_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Reset to unpaid',
  PAID: 'Mark paid',
  FAILED: 'Mark failed',
  REFUNDED: 'Mark refunded',
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  COD: 'Cash on delivery',
  SSLCOMMERZ: 'Card / SSLCommerz',
  BKASH: 'bKash',
  NAGAD: 'Nagad',
}

/* -------------------------------------------------------------------------- */
/* Banners                                                                    */
/* -------------------------------------------------------------------------- */

export const BANNER_PLACEMENT_VALUES = [
  BANNER_PLACEMENT.HERO,
  BANNER_PLACEMENT.SECONDARY,
  BANNER_PLACEMENT.APP,
] as const

export const BANNER_PLACEMENT_LABEL: Record<BannerPlacement, string> = {
  HERO: 'Hero carousel',
  SECONDARY: 'Secondary strip',
  APP: 'App download',
}

export const BANNER_PLACEMENT_HINT: Record<BannerPlacement, string> = {
  HERO: 'The full-width slider at the very top of the homepage. Wide, landscape artwork.',
  SECONDARY: 'The smaller promo tiles below the category rail.',
  APP: 'The “get the app” strip near the foot of the homepage.',
}

export const BANNER_PLACEMENT_TONE: Record<BannerPlacement, Tone> = {
  HERO: 'brand',
  SECONDARY: 'info',
  APP: 'accent',
}
