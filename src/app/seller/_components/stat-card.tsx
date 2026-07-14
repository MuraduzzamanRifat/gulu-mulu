import { Card } from '@/components/ui'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  label: string
  value: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  /** Tints the icon chip. `brand` marks the number that matters most on the page. */
  tone?: 'brand' | 'accent' | 'success' | 'info'
}

const TONES: Record<NonNullable<StatCardProps['tone']>, string> = {
  brand: 'bg-brand-50 text-brand-600',
  accent: 'bg-accent-100 text-accent-700',
  success: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
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
        {hint ? <p className="mt-0.5 truncate text-xs text-ink-subtle">{hint}</p> : null}
      </div>
    </Card>
  )
}
