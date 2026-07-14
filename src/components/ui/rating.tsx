import * as React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StarSize = 'sm' | 'md' | 'lg'

const STAR_SIZE: Record<StarSize, string> = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
}

const TEXT_SIZE: Record<StarSize, string> = {
  sm: 'text-[0.6875rem]',
  md: 'text-xs',
  lg: 'text-sm',
}

const STARS = [0, 1, 2, 3, 4]

export interface StarsProps {
  /** 0–5. Fractions are honoured: 4.3 renders as 4.3 stars' worth of fill. */
  value: number
  /** Review count, rendered as "(123)". */
  count?: number
  size?: StarSize
  /** Show the numeric value, e.g. "4.3", before the count. */
  showValue?: boolean
  className?: string
}

/**
 * Read-only star rating.
 *
 * Two stacked rows of solid stars — a grey one and a brand-gold one clipped to
 * `value/5` — so partial fills are exact rather than snapped to a half-star
 * glyph. `Product.rating` is a Float, so this matters.
 */
export function Stars({ value, count, size = 'md', showValue = false, className }: StarsProps) {
  const clamped = Math.min(5, Math.max(0, Number.isFinite(value) ? value : 0))
  const pct = (clamped / 5) * 100
  const starCls = STAR_SIZE[size]

  const row = (tone: string) => (
    <span className={cn('flex shrink-0 gap-0.5', tone)}>
      {STARS.map((i) => (
        <Star key={i} className={cn(starCls, 'shrink-0 fill-current')} strokeWidth={0} />
      ))}
    </span>
  )

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        role="img"
        aria-label={`Rated ${clamped.toFixed(1)} out of 5`}
        className="relative inline-flex"
      >
        <span aria-hidden="true">{row('text-line-strong')}</span>
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${pct}%` }}
        >
          {row('text-accent-500')}
        </span>
      </span>

      {showValue ? (
        <span className={cn('font-medium tabular-nums text-ink', TEXT_SIZE[size])}>
          {clamped.toFixed(1)}
        </span>
      ) : null}

      {count != null ? (
        <span className={cn('tabular-nums text-ink-muted', TEXT_SIZE[size])}>
          ({count.toLocaleString('en-US')})
        </span>
      ) : null}
    </span>
  )
}

export { RatingInput } from './rating-input'
