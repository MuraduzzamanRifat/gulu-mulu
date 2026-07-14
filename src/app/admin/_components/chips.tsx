import { Badge } from '@/components/ui'
import type {
  BannerPlacement,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  SellerStatus,
} from '@/generated/prisma/client'

import {
  BANNER_PLACEMENT_LABEL,
  BANNER_PLACEMENT_TONE,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUS_TONE,
  SELLER_STATUS_LABEL,
  SELLER_STATUS_TONE,
} from '../_lib/status'

export function SellerStatusChip({ status }: { status: SellerStatus }) {
  return <Badge variant={SELLER_STATUS_TONE[status]}>{SELLER_STATUS_LABEL[status]}</Badge>
}

export function ProductStatusChip({ status }: { status: ProductStatus }) {
  return <Badge variant={PRODUCT_STATUS_TONE[status]}>{PRODUCT_STATUS_LABEL[status]}</Badge>
}

export function OrderStatusChip({ status }: { status: OrderStatus }) {
  return <Badge variant={ORDER_STATUS_TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>
}

export function PaymentStatusChip({ status }: { status: PaymentStatus }) {
  return <Badge variant={PAYMENT_STATUS_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>
}

export function PlacementChip({ placement }: { placement: BannerPlacement }) {
  return <Badge variant={BANNER_PLACEMENT_TONE[placement]}>{BANNER_PLACEMENT_LABEL[placement]}</Badge>
}

/** Live / hidden, for the merchandising rows an admin toggles all day. */
export function ActiveChip({ active }: { active: boolean }) {
  return <Badge variant={active ? 'success' : 'neutral'}>{active ? 'Live' : 'Hidden'}</Badge>
}

export function FeaturedChip({ featured }: { featured: boolean }) {
  if (!featured) return null
  return <Badge variant="accent">Featured</Badge>
}

export function StockChip({ stock }: { stock: number }) {
  if (stock <= 0) return <Badge variant="danger">Out of stock</Badge>
  if (stock <= 5) return <Badge variant="warning">{stock} left</Badge>
  return <Badge variant="neutral">{stock} in stock</Badge>
}
