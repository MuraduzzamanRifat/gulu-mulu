import * as React from 'react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** A lucide icon component, e.g. `ShoppingCart` — passed uninstantiated. */
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: React.ReactNode
  /** Usually a <Button> or a <Link>. */
  action?: React.ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-14 text-center sm:py-20',
        className,
      )}
      {...props}
    >
      {Icon ? (
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-surface-sunken">
          <Icon className="size-7 text-ink-subtle" aria-hidden="true" />
        </div>
      ) : null}

      <h3 className="text-base font-semibold text-ink sm:text-lg">{title}</h3>

      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-balance text-ink-muted">{description}</p>
      ) : null}

      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
