import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface SectionHeadingProps {
  title: string
  /** Optional supporting line under the title. */
  subtitle?: string
  /** When set, a "See all" link is rendered on the right. */
  href?: string
  /** Override the link text. Defaults to "See all". */
  linkLabel?: string
  /** The homepage stacks several of these, so they should be h2s under the page h1. */
  as?: 'h1' | 'h2' | 'h3'
  className?: string
}

/**
 * "Flash Deals · See all" — the heading every homepage/PDP section shares, so the
 * type scale and the accent rule never drift between sections.
 */
export function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel = 'See all',
  as: Heading = 'h2',
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-4 sm:mb-4', className)}>
      <div className="min-w-0">
        <Heading className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink sm:text-xl">
          {/* A short brand rule — cheap, and it stops the section titles reading as plain text. */}
          <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-brand-500" />
          <span className="truncate">{title}</span>
        </Heading>

        {subtitle ? (
          <p className="mt-1 truncate pl-3 text-sm text-ink-muted">{subtitle}</p>
        ) : null}
      </div>

      {href ? (
        <Link
          href={href}
          className={cn(
            'inline-flex shrink-0 items-center gap-0.5 rounded-lg text-sm font-semibold text-brand-600',
            'transition-colors hover:text-brand-700',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
          )}
        >
          {linkLabel}
          <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  )
}
