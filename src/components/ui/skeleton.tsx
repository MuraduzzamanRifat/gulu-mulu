import * as React from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      // A browse route renders ~60 of these at once. Tailwind's `animate-pulse` does
      // not self-disable under prefers-reduced-motion, so it has to be opted out
      // explicitly — a full screen of pulsing rectangles is exactly the large-area
      // repetitive motion the preference exists to suppress. The static block still
      // reads as a placeholder without it.
      className={cn('animate-pulse motion-reduce:animate-none rounded-md bg-surface-sunken', className)}
      {...props}
    />
  )
}

/**
 * Mirrors the real product card's box model so the grid doesn't reflow when the
 * data lands: 4:5 image, two title lines, price row, rating row.
 *
 * The image box MUST stay in step with ProductCard's (`aspect-[4/5]`) — if the
 * skeleton is shorter, every card grows the moment data lands and the grid shoves
 * itself down mid-tap.
 */
export function ProductCardSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('overflow-hidden rounded-card border border-line bg-surface', className)}
      aria-hidden="true"
      {...props}
    >
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="mt-1 h-5 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

/** A whole shelf of placeholder cards — for `loading.tsx` on browse/search routes. */
export function ProductGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5', className)}
      role="status"
      aria-label="Loading products"
    >
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Repeated text lines, for description/review placeholders. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}
