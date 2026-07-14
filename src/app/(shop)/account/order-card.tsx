import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { formatBDT, formatDate, PLACEHOLDER_IMAGE } from '@/lib/format'
import { cn } from '@/lib/utils'

import type { AccountOrder } from './_queries'
import { OrderStatusBadge } from './order-status-badge'

/** Four thumbnails is what fits at 375px next to the "+N" chip without wrapping. */
const MAX_THUMBS = 4

function OrderThumb({
  src,
  alt,
  className,
}: {
  src: string | null
  alt: string
  className?: string
}) {
  const url = src ?? PLACEHOLDER_IMAGE

  return (
    <span
      className={cn(
        'relative block size-12 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-sunken sm:size-14',
        className,
      )}
    >
      <Image
        src={url}
        alt={alt}
        fill
        sizes="56px"
        quality={50}
        // The local SVG placeholder is not optimizable — the optimizer must not touch it.
        unoptimized={url === PLACEHOLDER_IMAGE}
        className="object-cover"
      />
    </span>
  )
}

export interface OrderCardProps {
  order: AccountOrder
  className?: string
}

/**
 * One order, as a card. Shared by the dashboard's "recent orders" strip and the full order list,
 * so the two can never drift apart.
 *
 * The whole card is a link to /order/<orderNumber> via a full-bleed overlay anchor — one big tap
 * target, and no interactive element nested inside another.
 *
 * `titleSnapshot` / `imageSnapshot` are used rather than the live product, on purpose: an order is
 * a historical record. If the seller renames the product or deletes the listing tomorrow, this
 * card must still show what was actually bought.
 */
export function OrderCard({ order, className }: OrderCardProps) {
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const thumbs = order.items.slice(0, MAX_THUMBS)
  const overflow = order.items.length - thumbs.length

  return (
    <article
      className={cn(
        'group relative rounded-card border border-line bg-surface p-4 transition-colors',
        'hover:border-line-strong focus-within:border-brand-500',
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold text-ink">{order.orderNumber}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {formatDate(order.placedAt)} &middot; {units} item{units === 1 ? '' : 's'}
          </p>
        </div>

        <OrderStatusBadge status={order.status} />
      </header>

      <div className="mt-3.5 flex items-center gap-2">
        {thumbs.map((item) => (
          <OrderThumb key={item.id} src={item.imageSnapshot} alt={item.titleSnapshot} />
        ))}

        {overflow > 0 ? (
          <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-line bg-surface-sunken text-xs font-semibold text-ink-muted tabular-nums sm:size-14">
            +{overflow}
          </span>
        ) : null}

        {/* On a phone the titles would squeeze the thumbnails to nothing; from sm up there is room
            for the first line item's name, which is what makes an order recognisable at a glance. */}
        <p className="ml-1 hidden min-w-0 flex-1 truncate text-sm text-ink-muted sm:block">
          {order.items[0]?.titleSnapshot ?? 'No items'}
          {order.items.length > 1 ? ` and ${order.items.length - 1} more` : ''}
        </p>
      </div>

      <footer className="mt-3.5 flex items-center justify-between border-t border-line pt-3">
        <p className="text-sm text-ink-muted">
          Total{' '}
          <span className="font-bold text-ink tabular-nums">{formatBDT(order.total)}</span>
        </p>

        <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-brand-600">
          View details
          <ChevronRight
            className="size-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            aria-hidden="true"
          />
        </span>
      </footer>

      <Link
        href={`/order/${order.orderNumber}`}
        className="absolute inset-0 rounded-card focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        <span className="sr-only">
          Order {order.orderNumber}, {formatBDT(order.total)}
        </span>
      </Link>
    </article>
  )
}
