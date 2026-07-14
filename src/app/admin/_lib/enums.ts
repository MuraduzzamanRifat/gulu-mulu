/**
 * Prisma's enum VALUES, mirrored for the client bundle.
 *
 * WHY THIS FILE EXISTS — it is not duplication for its own sake.
 *
 * `import { OrderStatus } from '@/generated/prisma/client'` is a RUNTIME import. In a Server
 * Component that is free; in a `'use client'` component it drags the whole generated Prisma client
 * into the browser bundle, and that module imports `node:module`. The build does not merely bloat —
 * it fails outright:
 *
 *     the chunking context does not support external modules (request: node:module)
 *
 * A type-only import (`import type { OrderStatus }`) is erased at compile time and is always safe.
 * But a client component that needs to COMPARE against `OrderStatus.PENDING` needs the value, not
 * just the type. Hence this: the same strings, as a plain object, with no import that survives to
 * runtime.
 *
 * The `satisfies Record<T, T>` on each one is what stops this drifting from the schema. Add a member
 * to a Prisma enum and every mirror below fails to compile until it is added here too — the check is
 * exhaustive in both directions, so this can be stale by exactly zero enum members.
 */
import type {
  BannerPlacement,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  SellerStatus,
} from '@/generated/prisma/client'

export const SELLER_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
} as const satisfies Record<SellerStatus, SellerStatus>

export const PRODUCT_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const satisfies Record<ProductStatus, ProductStatus>

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
} as const satisfies Record<OrderStatus, OrderStatus>

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const satisfies Record<PaymentStatus, PaymentStatus>

export const PAYMENT_METHOD = {
  COD: 'COD',
  SSLCOMMERZ: 'SSLCOMMERZ',
  BKASH: 'BKASH',
  NAGAD: 'NAGAD',
} as const satisfies Record<PaymentMethod, PaymentMethod>

export const BANNER_PLACEMENT = {
  HERO: 'HERO',
  SECONDARY: 'SECONDARY',
  APP: 'APP',
} as const satisfies Record<BannerPlacement, BannerPlacement>
