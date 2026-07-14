import { formatBDT } from '@/lib/format'
import { cn } from '@/lib/utils'

import type { EarningsDay } from '../_lib/data'

export interface EarningsChartProps {
  days: EarningsDay[]
  className?: string
}

/**
 * Seven days of net earnings as flex bars — no charting library, no client JS, no hydration.
 *
 * Bars are sized as a percentage of the best day, so the shape of the week is readable whether the
 * peak is ৳400 or ৳40,000. A zero day still renders a 2px stub: an empty column reads as "no data",
 * a stub reads as "no sales", and those are very different messages to give a seller.
 */
export function EarningsChart({ days, className }: EarningsChartProps) {
  const peak = Math.max(...days.map((d) => d.amount), 0)
  const total = days.reduce((sum, d) => sum + d.amount, 0)
  const best = days.reduce((top, d) => (d.amount > top.amount ? d : top), days[0])

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Last 7 days</h2>
          <p className="mt-0.5 text-xs text-ink-subtle">
            Net earnings booked, by the day the order was placed. Cancelled and returned lines
            excluded.
          </p>
        </div>
        <p className="shrink-0 text-lg font-bold text-ink tabular-nums">{formatBDT(total)}</p>
      </div>

      {/* The bars. Each column is a full-height flex track so every bar shares one baseline. */}
      <div className="mt-6 flex h-44 items-end gap-1.5 sm:gap-3">
        {days.map((day) => {
          const height = peak > 0 ? Math.round((day.amount / peak) * 100) : 0
          const isBest = peak > 0 && day.amount === peak

          return (
            <div key={day.date.toISOString()} className="flex h-full flex-1 flex-col justify-end">
              <p
                className={cn(
                  'mb-1.5 truncate text-center text-[0.625rem] font-semibold tabular-nums sm:text-xs',
                  day.amount > 0 ? 'text-ink' : 'text-ink-subtle',
                )}
              >
                {day.amount > 0 ? formatBDT(day.amount) : '—'}
              </p>

              <div
                className={cn(
                  'w-full rounded-t-md',
                  isBest ? 'bg-brand-500' : day.amount > 0 ? 'bg-brand-200' : 'bg-surface-sunken',
                )}
                // A percentage height needs a sized parent, which the h-full column above provides.
                // min-height keeps a zero day visible as a baseline stub rather than nothing at all.
                style={{ height: `${height}%`, minHeight: '2px' }}
                role="img"
                aria-label={`${day.label}: ${formatBDT(day.amount)}`}
              />
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex gap-1.5 border-t border-line pt-2 sm:gap-3">
        {days.map((day) => (
          <p
            key={day.date.toISOString()}
            className="flex-1 truncate text-center text-xs font-medium text-ink-muted"
          >
            {day.label}
          </p>
        ))}
      </div>

      {peak > 0 ? (
        <p className="mt-3 text-xs text-ink-subtle">
          Best day: <span className="font-semibold text-ink">{best.label}</span> at{' '}
          <span className="font-semibold text-ink tabular-nums">{formatBDT(best.amount)}</span>.
        </p>
      ) : (
        <p className="mt-3 text-xs text-ink-subtle">
          No orders in the last 7 days. New listings and a full stock count are the fastest way to
          change that.
        </p>
      )}
    </div>
  )
}
