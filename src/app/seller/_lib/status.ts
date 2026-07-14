/**
 * Status vocabulary for the seller portal.
 *
 * One place decides what every status is CALLED and what colour it wears, so a PENDING product,
 * a PENDING order line and a PENDING payout can never drift into three different-looking chips.
 *
 * ⚠ THIS FILE IS IMPORTED BY CLIENT COMPONENTS (the advance-status button), so every Prisma import
 * here MUST be `import type`. Importing the enum as a VALUE — `import { OrderStatus }` — pulls
 * `@/generated/prisma/client`, and with it the whole Prisma runtime, into the browser bundle;
 * Turbopack then fails the build outright ("the chunking context does not support external modules
 * (request: node:module)"). The enum members are therefore written as plain string literals, which
 * are structurally identical to the generated enum's values and typecheck against them exactly.
 */
import type { BadgeProps } from '@/components/ui'
import type {
  OrderStatus,
  PayoutStatus,
  ProductStatus,
  SellerStatus,
} from '@/generated/prisma/client'

export type Tone = NonNullable<BadgeProps['variant']>

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

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

export const PRODUCT_STATUS_VALUES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'DRAFT',
] as const satisfies readonly ProductStatus[]

/** Narrow an untrusted `?status=` param down to a real ProductStatus. */
export function toProductStatus(value: string | undefined): ProductStatus | null {
  if (!value) return null
  return (PRODUCT_STATUS_VALUES as readonly string[]).includes(value)
    ? (value as ProductStatus)
    : null
}

/* -------------------------------------------------------------------------- */
/* Orders                                                                     */
/* -------------------------------------------------------------------------- */

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

/**
 * The fulfilment ladder a seller may walk a line up, one rung at a time.
 * CANCELLED / RETURNED are terminal and are NOT reachable from here — a seller cannot cancel a
 * paid line on their own; that is a support/admin decision.
 */
export const ORDER_FLOW = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
] as const satisfies readonly OrderStatus[]

/** The single next rung, or null when the line is finished (or terminal). */
export function nextOrderStatus(current: OrderStatus): OrderStatus | null {
  const index = (ORDER_FLOW as readonly OrderStatus[]).indexOf(current)
  if (index === -1) return null // CANCELLED / RETURNED
  return ORDER_FLOW[index + 1] ?? null // DELIVERED is the top
}

/** The verb on the button that advances a line, e.g. "Mark shipped". */
export const ADVANCE_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Confirm order',
  CONFIRMED: 'Start processing',
  PROCESSING: 'Mark shipped',
  SHIPPED: 'Mark delivered',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
}

export const ORDER_STATUS_VALUES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const satisfies readonly OrderStatus[]

export function toOrderStatus(value: string | undefined): OrderStatus | null {
  if (!value) return null
  return (ORDER_STATUS_VALUES as readonly string[]).includes(value)
    ? (value as OrderStatus)
    : null
}

/* -------------------------------------------------------------------------- */
/* Payouts                                                                    */
/* -------------------------------------------------------------------------- */

export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  PENDING: 'Scheduled',
  PROCESSING: 'In transit',
  PAID: 'Paid',
}

export const PAYOUT_STATUS_TONE: Record<PayoutStatus, Tone> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  PAID: 'success',
}

/* -------------------------------------------------------------------------- */
/* Shops                                                                      */
/* -------------------------------------------------------------------------- */

export const SELLER_STATUS_LABEL: Record<SellerStatus, string> = {
  PENDING: 'Under review',
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
