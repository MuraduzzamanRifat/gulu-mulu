import {
  CheckCircle2,
  Clock,
  PackageCheck,
  Truck,
  Undo2,
  XCircle,
  type LucideIcon,
} from 'lucide-react'

import { Badge, type BadgeProps } from '@/components/ui'
import { OrderStatus } from '@/generated/prisma/client'

interface StatusStyle {
  label: string
  variant: NonNullable<BadgeProps['variant']>
  icon: LucideIcon
}

/**
 * One place decides what an order status LOOKS like, so the dashboard, the order list and the
 * order detail page can never disagree about whether "SHIPPED" is blue or amber.
 *
 * The palette is chosen for meaning, not variety: amber = waiting on us, blue = we're working,
 * green = it landed, red = it didn't, grey = it came back.
 */
const STATUS_STYLES: Record<OrderStatus, StatusStyle> = {
  [OrderStatus.PENDING]: { label: 'Pending', variant: 'warning', icon: Clock },
  [OrderStatus.CONFIRMED]: { label: 'Confirmed', variant: 'info', icon: CheckCircle2 },
  [OrderStatus.PROCESSING]: { label: 'Processing', variant: 'info', icon: PackageCheck },
  [OrderStatus.SHIPPED]: { label: 'Shipped', variant: 'brand', icon: Truck },
  [OrderStatus.DELIVERED]: { label: 'Delivered', variant: 'success', icon: CheckCircle2 },
  [OrderStatus.CANCELLED]: { label: 'Cancelled', variant: 'danger', icon: XCircle },
  [OrderStatus.RETURNED]: { label: 'Returned', variant: 'neutral', icon: Undo2 },
}

export interface OrderStatusBadgeProps {
  status: OrderStatus
  size?: BadgeProps['size']
  className?: string
}

export function OrderStatusBadge({ status, size = 'md', className }: OrderStatusBadgeProps) {
  const { label, variant, icon: Icon } = STATUS_STYLES[status]

  return (
    <Badge variant={variant} size={size} className={className}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  )
}

/** The plain label, for aria-labels and page titles. */
export function orderStatusLabel(status: OrderStatus): string {
  return STATUS_STYLES[status].label
}
