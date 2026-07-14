import { Badge } from '@/components/ui'
import type {
  OrderStatus,
  PayoutStatus,
  ProductStatus,
  SellerStatus,
} from '@/generated/prisma/client'

import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  PAYOUT_STATUS_LABEL,
  PAYOUT_STATUS_TONE,
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUS_TONE,
  SELLER_STATUS_LABEL,
  SELLER_STATUS_TONE,
} from '../_lib/status'

export function ProductStatusChip({ status }: { status: ProductStatus }) {
  return <Badge variant={PRODUCT_STATUS_TONE[status]}>{PRODUCT_STATUS_LABEL[status]}</Badge>
}

export function OrderStatusChip({ status }: { status: OrderStatus }) {
  return <Badge variant={ORDER_STATUS_TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>
}

export function PayoutStatusChip({ status }: { status: PayoutStatus }) {
  return <Badge variant={PAYOUT_STATUS_TONE[status]}>{PAYOUT_STATUS_LABEL[status]}</Badge>
}

export function SellerStatusChip({ status }: { status: SellerStatus }) {
  return <Badge variant={SELLER_STATUS_TONE[status]}>{SELLER_STATUS_LABEL[status]}</Badge>
}

/** Stock is the number a seller checks first — it earns its own colour. */
export function StockChip({ stock }: { stock: number }) {
  if (stock <= 0) return <Badge variant="danger">Out of stock</Badge>
  if (stock <= 5) {
    return <Badge variant="warning">{stock} left</Badge>
  }
  return <Badge variant="neutral">{stock} in stock</Badge>
}
