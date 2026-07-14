import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  description?: string
  /** Usually a primary <Link>/<Button> — "Add product", "Export", … */
  action?: React.ReactNode
  className?: string
}

/** Every portal page opens the same way: title, one line of context, one action. */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
