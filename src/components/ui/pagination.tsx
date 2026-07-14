import * as React from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const ELLIPSIS = 'ellipsis' as const
type PageItem = number | typeof ELLIPSIS

/**
 * First page, last page, and a window of `siblings` around the current one,
 * with ellipses standing in for the gaps. Never emits a duplicate page number.
 */
function pageItems(page: number, totalPages: number, siblings: number): PageItem[] {
  // first + last + current + 2 windows + 2 ellipsis slots
  const maxSlots = siblings * 2 + 5
  if (totalPages <= maxSlots) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  // The window is clamped strictly *between* the first and last page, so those
  // two are never emitted twice.
  const left = Math.max(2, page - siblings)
  const right = Math.min(totalPages - 1, page + siblings)

  const items: PageItem[] = [1]
  if (left > 2) items.push(ELLIPSIS)
  for (let i = left; i <= right; i++) items.push(i)
  if (right < totalPages - 1) items.push(ELLIPSIS)
  items.push(totalPages)

  return items
}

// 44px cells, 8px apart (see the nav's `gap-2`). Numerically adjacent pages sitting
// side by side is the worst case for a mis-tap: reach for 4, land on 5, and a whole
// page of products is silently skipped.
const cellBase = [
  'inline-flex h-11 min-w-11 items-center justify-center rounded-lg px-2 text-sm font-medium',
  'transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
  'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
]

export interface PaginationProps {
  page: number
  totalPages: number
  /** Build the href for a page — keep the rest of the query string intact. */
  buildHref: (page: number) => string
  /** Pages shown either side of the current one. */
  siblings?: number
  className?: string
}

/**
 * Real <Link>s, not buttons — pagination must work with JS off, and the URL is
 * the source of truth for browse state. Renders nothing for a single page.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
  siblings = 1,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const current = Math.min(Math.max(1, page), totalPages)
  const items = pageItems(current, totalPages, siblings)
  const hasPrev = current > 1
  const hasNext = current < totalPages

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-2', className)}
    >
      {hasPrev ? (
        <Link
          href={buildHref(current - 1)}
          rel="prev"
          aria-label="Previous page"
          className={cn(cellBase, 'border border-line text-ink hover:bg-surface-sunken')}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={cn(cellBase, 'border border-line text-ink-subtle opacity-50')}
        >
          <ChevronLeft className="size-4" />
        </span>
      )}

      {items.map((item, i) =>
        item === ELLIPSIS ? (
          <span
            key={`gap-${i}`}
            aria-hidden="true"
            // Height matches the cells for alignment, but stays narrow — it is
            // aria-hidden and not interactive, so it needs no 44px target.
            className="inline-flex h-11 min-w-8 items-center justify-center text-sm text-ink-subtle"
          >
            &hellip;
          </span>
        ) : item === current ? (
          <span
            key={item}
            aria-current="page"
            className={cn(cellBase, 'bg-brand-500 tabular-nums text-white')}
          >
            {item}
          </span>
        ) : (
          <Link
            key={item}
            href={buildHref(item)}
            aria-label={`Page ${item}`}
            className={cn(
              cellBase,
              'border border-line tabular-nums text-ink hover:bg-surface-sunken',
            )}
          >
            {item}
          </Link>
        ),
      )}

      {hasNext ? (
        <Link
          href={buildHref(current + 1)}
          rel="next"
          aria-label="Next page"
          className={cn(cellBase, 'border border-line text-ink hover:bg-surface-sunken')}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className={cn(cellBase, 'border border-line text-ink-subtle opacity-50')}
        >
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  )
}
