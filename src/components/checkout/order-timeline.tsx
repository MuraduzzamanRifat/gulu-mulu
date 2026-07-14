import { Check, PackageCheck, RotateCcw, Truck, XCircle } from 'lucide-react'

import { OrderStatus } from '@/generated/prisma/client'
import { cn } from '@/lib/utils'

/**
 * The happy path, in order. CANCELLED and RETURNED are NOT on it — they are exits from it, and
 * drawing them as a fifth and sixth bead would imply a cancelled order is somehow further along
 * than a shipped one.
 */
const TRACK: readonly {
  status: OrderStatus
  label: string
  description: string
}[] = [
  {
    status: OrderStatus.PENDING,
    label: 'Order placed',
    description: 'We have your order and the sellers have been notified.',
  },
  {
    status: OrderStatus.CONFIRMED,
    label: 'Confirmed',
    description: 'Stock is reserved and your order is accepted.',
  },
  {
    status: OrderStatus.PROCESSING,
    label: 'Processing',
    description: 'Each seller is packing their part of your order.',
  },
  {
    status: OrderStatus.SHIPPED,
    label: 'Shipped',
    description: 'On the way. A rider will call you before delivery.',
  },
  {
    status: OrderStatus.DELIVERED,
    label: 'Delivered',
    description: 'Delivered. You have 7 days to raise a return.',
  },
]

const TERMINAL: Partial<
  Record<OrderStatus, { label: string; description: string; icon: typeof XCircle }>
> = {
  [OrderStatus.CANCELLED]: {
    label: 'Cancelled',
    description: 'This order was cancelled. Nothing will be delivered and nothing is owed.',
    icon: XCircle,
  },
  [OrderStatus.RETURNED]: {
    label: 'Returned',
    description: 'This order came back to the sellers. Your refund is being processed.',
    icon: RotateCcw,
  },
}

const ICONS: Record<string, typeof Check> = {
  [OrderStatus.SHIPPED]: Truck,
  [OrderStatus.DELIVERED]: PackageCheck,
}

export interface OrderTimelineProps {
  status: OrderStatus
  className?: string
}

/**
 * Where the parcel is.
 *
 * Every bead up to and including the current status is filled; the rest are hollow. A CANCELLED or
 * RETURNED order abandons the rail entirely and says what actually happened — showing a cancelled
 * order as "20% of the way to Delivered" is a lie the customer will phone us about.
 */
export function OrderTimeline({ status, className }: OrderTimelineProps) {
  const terminal = TERMINAL[status]

  if (terminal) {
    const Icon = terminal.icon

    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-card border border-danger/30 bg-danger-soft p-4',
          className,
        )}
      >
        <Icon className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-danger">{terminal.label}</p>
          <p className="mt-0.5 text-sm text-ink-muted">{terminal.description}</p>
        </div>
      </div>
    )
  }

  const currentIndex = TRACK.findIndex((step) => step.status === status)
  // An unmapped status must never render an empty rail — treat it as freshly placed.
  const reached = currentIndex < 0 ? 0 : currentIndex

  return (
    <ol className={cn('relative', className)} aria-label="Order status">
      {TRACK.map((step, index) => {
        const done = index < reached
        const active = index === reached
        const filled = done || active
        const last = index === TRACK.length - 1

        const Icon = ICONS[step.status] ?? Check

        return (
          <li key={step.status} className="relative flex gap-3.5 pb-6 last:pb-0">
            {/* The rail between beads. Coloured only as far as the parcel has actually come. */}
            {!last ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-8 left-4 h-[calc(100%-2rem)] w-0.5 -translate-x-1/2',
                  done ? 'bg-brand-500' : 'bg-line',
                )}
              />
            ) : null}

            <span
              className={cn(
                'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                done && 'border-brand-500 bg-brand-500 text-white',
                active && 'border-brand-500 bg-surface text-brand-600 ring-4 ring-brand-100',
                !filled && 'border-line bg-surface text-ink-subtle',
              )}
            >
              {done ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Icon className="size-4" aria-hidden="true" />
              )}
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={cn(
                  'text-sm font-semibold',
                  filled ? 'text-ink' : 'text-ink-subtle',
                )}
              >
                {step.label}
                {active ? (
                  <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[0.625rem] font-semibold text-brand-700">
                    CURRENT
                  </span>
                ) : null}
              </p>
              <p className={cn('mt-0.5 text-xs', filled ? 'text-ink-muted' : 'text-ink-subtle')}>
                {step.description}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Kept next to the timeline so the two can never disagree about what a status is called. */
export function orderStatusLabel(status: OrderStatus): string {
  return (
    TERMINAL[status]?.label ??
    TRACK.find((step) => step.status === status)?.label ??
    String(status)
  )
}

/** For the per-item status pill: sellers fulfil their own lines, so lines can differ. */
export const ORDER_STATUS_TONE: Record<
  OrderStatus,
  'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'
> = {
  [OrderStatus.PENDING]: 'warning',
  [OrderStatus.CONFIRMED]: 'info',
  [OrderStatus.PROCESSING]: 'info',
  [OrderStatus.SHIPPED]: 'brand',
  [OrderStatus.DELIVERED]: 'success',
  [OrderStatus.CANCELLED]: 'danger',
  [OrderStatus.RETURNED]: 'danger',
}
