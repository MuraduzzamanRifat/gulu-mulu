import { BadgeCheck, MessageSquare } from 'lucide-react'

import { Badge, EmptyState, Stars } from '@/components/ui'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Reviews: the histogram, then the rows.
 *
 * The average and the bars are computed from every review row in the database (see
 * `getRatingBreakdown`), while the rows below are the most recent handful. They are therefore
 * allowed to disagree in COUNT — and the component says so out loud ("Showing the 12 most recent")
 * — but never in ARITHMETIC.
 */

export type StarValue = 1 | 2 | 3 | 4 | 5

const STAR_ROWS: StarValue[] = [5, 4, 3, 2, 1]

/** Structurally identical to `RatingBreakdown` in the route's `_data.ts`. */
export interface RatingSummary {
  total: number
  average: number
  counts: Record<StarValue, number>
  percents: Record<StarValue, number>
}

export interface ReviewListItem {
  id: string
  rating: number
  comment: string | null
  createdAt: Date
  /** Non-null = written against a delivered order line, i.e. a verified purchase. */
  orderItemId: string | null
  user: { id: string; name: string | null }
}

export interface ReviewListProps {
  reviews: ReviewListItem[]
  summary: RatingSummary
  /** The <ReviewForm>, or the "only verified buyers can review" note. */
  formSlot?: React.ReactNode
  className?: string
}

/** Deterministic avatar tint — same shopper, same colour, every render. */
const TINTS = [
  'bg-brand-100 text-brand-700',
  'bg-accent-100 text-accent-700',
  'bg-info-soft text-info',
  'bg-success-soft text-success',
  'bg-surface-sunken text-ink-muted',
]

function tintFor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return TINTS[hash % TINTS.length]
}

function initialOf(name: string | null): string {
  return name?.trim()?.[0]?.toUpperCase() ?? '?'
}

function RatingBars({ summary }: { summary: RatingSummary }) {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface-muted p-4 sm:flex-row sm:items-center sm:gap-8 sm:p-5">
      <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-center sm:gap-1">
        <p className="text-4xl font-bold tracking-tight text-ink tabular-nums sm:text-5xl">
          {summary.average.toFixed(1)}
        </p>
        <div className="flex flex-col gap-1 sm:items-center">
          <Stars value={summary.average} size="md" />
          <p className="text-xs text-ink-muted">
            {summary.total.toLocaleString('en-US')} {summary.total === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {STAR_ROWS.map((star) => {
          const percent = summary.percents[star]
          return (
            <div key={star} className="flex items-center gap-2 sm:gap-3">
              <span className="w-8 shrink-0 text-xs font-medium text-ink-muted tabular-nums">
                {star} ★
              </span>

              <span
                role="img"
                aria-label={`${star} star: ${percent}% of reviews`}
                className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-sunken"
              >
                <span
                  className="block h-full rounded-full bg-accent-500"
                  style={{ width: `${percent}%` }}
                />
              </span>

              <span className="w-9 shrink-0 text-right text-xs text-ink-muted tabular-nums">
                {percent}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ReviewList({ reviews, summary, formSlot, className }: ReviewListProps) {
  if (summary.total === 0) {
    return (
      <div className={cn('flex flex-col gap-6', className)}>
        <EmptyState
          icon={MessageSquare}
          title="No reviews yet"
          description="Be the first to review this product once you have received it."
          className="rounded-card border border-dashed border-line py-10"
        />
        {formSlot}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <RatingBars summary={summary} />

      {formSlot}

      <ul className="flex flex-col divide-y divide-line">
        {reviews.map((review) => (
          <li key={review.id} className="flex gap-3 py-4 first:pt-0 sm:gap-4">
            <span
              aria-hidden="true"
              className={cn(
                'grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold sm:size-10',
                tintFor(review.user.id),
              )}
            >
              {initialOf(review.user.name)}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-semibold text-ink">
                  {review.user.name ?? 'Gulu Mulu Customer'}
                </p>

                {review.orderItemId ? (
                  <Badge variant="success" size="sm">
                    <BadgeCheck aria-hidden="true" />
                    Verified purchase
                  </Badge>
                ) : null}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <Stars value={review.rating} size="sm" />
                <time
                  dateTime={review.createdAt.toISOString()}
                  className="text-xs text-ink-subtle"
                >
                  {formatDate(review.createdAt)}
                </time>
              </div>

              {review.comment ? (
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{review.comment}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {reviews.length < summary.total ? (
        <p className="text-center text-xs text-ink-subtle">
          Showing the {reviews.length} most recent of {summary.total.toLocaleString('en-US')}{' '}
          reviews.
        </p>
      ) : null}
    </div>
  )
}
