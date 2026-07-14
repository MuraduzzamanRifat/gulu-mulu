import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface Crumb {
  label: string
  /** Omit on the last crumb — you don't link to where you already are. */
  href?: string
}

export interface BreadcrumbsProps {
  items: Crumb[]
  className?: string
}

/**
 * Trail back up the catalogue. A Server Component — it is a list of links, nothing more.
 *
 * On a phone it scrolls sideways rather than wrapping onto three lines: a deep trail
 * ("Home / Women / Women Topwear / Kurti") would otherwise eat a third of the first screen,
 * which is exactly the screen the products need.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="scrollbar-none flex items-center gap-1 overflow-x-auto text-sm whitespace-nowrap">
        <li className="flex shrink-0 items-center">
          <Link
            href="/"
            className={cn(
              'inline-flex items-center gap-1 rounded-sm text-ink-muted transition-colors hover:text-brand-600',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
            )}
          >
            <Home className="size-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Home</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const last = index === items.length - 1

          return (
            <li key={`${item.label}-${index}`} className="flex shrink-0 items-center">
              <ChevronRight className="size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />

              {item.href && !last ? (
                <Link
                  href={item.href}
                  className={cn(
                    'ml-1 rounded-sm text-ink-muted transition-colors hover:text-brand-600',
                    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? 'page' : undefined}
                  className="ml-1 max-w-[60vw] truncate font-medium text-ink sm:max-w-none"
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
