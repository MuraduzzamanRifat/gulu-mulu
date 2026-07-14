'use client'

import { Star, X } from 'lucide-react'

import { formatBDT } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useBrowseNav } from './browse-nav'
import { KEY, type BrowseParams, type BrowseScope } from './browse-params'

export interface ActiveFilterChipsProps {
  params: BrowseParams
  scope: BrowseScope
  /** slug -> display name, so a chip never has to show `women-topwear`. */
  categoryLabels?: Record<string, string>
  brandLabels?: Record<string, string>
  className?: string
}

/** Last-resort label for a slug the facets didn't return: `women-topwear` -> `Women Topwear`. */
function prettify(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function priceChipLabel(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${formatBDT(min)} – ${formatBDT(max)}`
  if (max != null) return `Under ${formatBDT(max)}`
  if (min != null) return `Over ${formatBDT(min)}`
  return null
}

interface ChipProps {
  children: React.ReactNode
  onRemove: () => void
  removeLabel: string
  disabled?: boolean
}

function Chip({ children, onRemove, removeLabel, disabled }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-11 max-w-full items-center gap-1 rounded-full border border-line bg-surface-muted',
        'py-0 pr-0.5 pl-3 text-xs font-medium text-ink',
      )}
    >
      <span className="truncate">{children}</span>
      {/* The X is the shopper's escape hatch from a filter — it gets a full 44px. */}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={removeLabel}
        title={removeLabel}
        className={cn(
          'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-muted',
          'transition-colors hover:bg-line hover:text-ink disabled:cursor-not-allowed disabled:opacity-50',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
        )}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </span>
  )
}

/**
 * The receipt for what the shopper has narrowed down to — and the fastest way back out of it.
 *
 * A facet panel is easy to get lost in: three screens down a sidebar, "why are there only two
 * products?" is answered by a chip row at the top of the grid, not by scrolling back up and
 * hunting for the ticked box.
 *
 * A brand pinned by the route (/brand/aarong) gets no chip — you can't remove it without leaving
 * the page, so offering an X would be a lie.
 */
export function ActiveFilterChips({
  params,
  scope,
  categoryLabels = {},
  brandLabels = {},
  className,
}: ActiveFilterChipsProps) {
  const { apply, clearAll, pending } = useBrowseNav()

  const brands = scope.lockedBrandSlug ? [] : params.brands
  const price = priceChipLabel(params.priceMin, params.priceMax)

  const chipCount =
    (params.search ? 1 : 0) +
    params.categories.length +
    brands.length +
    (price ? 1 : 0) +
    (params.minRating != null ? 1 : 0)

  if (chipCount === 0) return null

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      aria-label="Active filters"
      aria-busy={pending || undefined}
    >
      {params.search ? (
        <Chip
          onRemove={() => apply({ [KEY.search]: null })}
          removeLabel={`Clear the search for ${params.search}`}
          disabled={pending}
        >
          <span className="text-ink-muted">Search:</span> {params.search}
        </Chip>
      ) : null}

      {params.categories.map((slug) => (
        <Chip
          key={`category-${slug}`}
          onRemove={() =>
            apply({ [KEY.categories]: params.categories.filter((value) => value !== slug) })
          }
          removeLabel={`Remove the ${categoryLabels[slug] ?? prettify(slug)} category filter`}
          disabled={pending}
        >
          {categoryLabels[slug] ?? prettify(slug)}
        </Chip>
      ))}

      {brands.map((slug) => (
        <Chip
          key={`brand-${slug}`}
          onRemove={() => apply({ [KEY.brands]: brands.filter((value) => value !== slug) })}
          removeLabel={`Remove the ${brandLabels[slug] ?? prettify(slug)} brand filter`}
          disabled={pending}
        >
          {brandLabels[slug] ?? prettify(slug)}
        </Chip>
      ))}

      {price ? (
        <Chip
          onRemove={() => apply({ [KEY.priceMin]: null, [KEY.priceMax]: null })}
          removeLabel="Remove the price filter"
          disabled={pending}
        >
          {price}
        </Chip>
      ) : null}

      {params.minRating != null ? (
        <Chip
          onRemove={() => apply({ [KEY.rating]: null })}
          removeLabel="Remove the rating filter"
          disabled={pending}
        >
          <span className="inline-flex items-center gap-0.5">
            {params.minRating}
            <Star className="size-3 fill-accent-500 text-accent-500" aria-hidden="true" />
            <span>&amp; up</span>
          </span>
        </Chip>
      ) : null}

      <button
        type="button"
        onClick={clearAll}
        disabled={pending}
        className={cn(
          'inline-flex min-h-11 cursor-pointer items-center rounded-full px-3 text-xs font-semibold',
          'text-brand-600 underline-offset-2',
          'transition-colors hover:bg-brand-50 hover:underline',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
        )}
      >
        Clear all
      </button>
    </div>
  )
}
