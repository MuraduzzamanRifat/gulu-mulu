import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Card } from '@/components/ui'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/* StatCard — a number that is simply true                                     */
/* -------------------------------------------------------------------------- */

export interface StatCardProps {
  label: string
  value: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  /** `brand` marks the number that matters most on the page. */
  tone?: 'brand' | 'accent' | 'success' | 'info' | 'neutral'
}

const TONES: Record<NonNullable<StatCardProps['tone']>, string> = {
  brand: 'bg-brand-50 text-brand-600',
  accent: 'bg-accent-100 text-accent-700',
  success: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
  neutral: 'bg-surface-sunken text-ink-muted',
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'brand' }: StatCardProps) {
  return (
    <Card className="flex items-start gap-3 p-4">
      <div className={cn('grid size-10 shrink-0 place-items-center rounded-lg', TONES[tone])}>
        <Icon className="size-5" aria-hidden="true" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        <p className="mt-0.5 truncate text-lg font-bold tracking-tight text-ink tabular-nums sm:text-xl">
          {value}
        </p>
        {hint ? <p className="mt-0.5 text-xs text-ink-subtle">{hint}</p> : null}
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* AttentionCard — a number that is someone waiting                            */
/* -------------------------------------------------------------------------- */

export interface AttentionCardProps {
  count: number
  /** Singular noun — "seller", "product". Pluralised here so the copy is never "1 sellers". */
  noun: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  /** Copy shown instead when the queue is empty. */
  clearLabel: string
}

/**
 * A queue with people on the other end of it.
 *
 * Loud and amber while anyone is waiting, quiet and green the moment the queue is empty — so the
 * dashboard answers "is there anything for me to do?" from across the room, without being read.
 * The whole card is the link: a queue you have to hunt for the button on is a queue that grows.
 */
export function AttentionCard({
  count,
  noun,
  description,
  href,
  icon: Icon,
  clearLabel,
}: AttentionCardProps) {
  const waiting = count > 0
  const plural = count === 1 ? noun : `${noun}s`

  return (
    <Link
      href={href}
      className={cn(
        'group block rounded-card border p-4 transition-[transform,box-shadow,border-color] duration-200',
        'hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2',
        waiting
          ? 'border-amber-300 bg-amber-50 focus-visible:ring-amber-500'
          : 'border-line bg-surface focus-visible:ring-brand-500',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-lg',
            waiting ? 'bg-amber-400 text-slate-950' : 'bg-success-soft text-success',
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-xs font-semibold tracking-wide uppercase',
              waiting ? 'text-amber-700' : 'text-ink-muted',
            )}
          >
            {waiting ? 'Needs attention' : 'All clear'}
          </p>

          <p className="mt-0.5 text-lg font-bold tracking-tight text-ink tabular-nums sm:text-xl">
            {waiting ? `${count} ${plural}` : clearLabel}
          </p>

          <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
        </div>

        <ArrowRight
          className={cn(
            'mt-2 size-4 shrink-0 transition-transform duration-200',
            'group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0',
            waiting ? 'text-amber-700' : 'text-ink-subtle',
          )}
          aria-hidden="true"
        />
      </div>
    </Link>
  )
}
