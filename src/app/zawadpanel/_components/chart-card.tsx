import { Card } from '@/components/ui'

/**
 * The §34 chart wrapper: every chart on the admin sits in one of these, so titles, subtitles and
 * empty states are consistent everywhere. Server component — the chart child is the client part.
 */
export function ChartCard({
  title,
  subtitle,
  action,
  empty,
  children,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  /** When true, renders the standard quiet empty state instead of the chart. */
  empty?: boolean
  children: React.ReactNode
}) {
  return (
    <Card className="flex h-full flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {empty ? (
        <div className="grid flex-1 place-items-center py-10 text-sm text-ink-muted">
          Nothing in this period yet.
        </div>
      ) : (
        <div className="min-w-0 flex-1">{children}</div>
      )}
    </Card>
  )
}
