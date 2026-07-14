'use client'

import * as React from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'

import { Button, Input, Sheet, Stars } from '@/components/ui'
import { formatBDT } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useBrowseNav } from './browse-nav'
import {
  KEY,
  PRICE_CHIPS,
  RATING_CHOICES,
  activeFilterCount,
  type BrowseFacetValue,
  type BrowseFacets,
  type BrowseParams,
  type BrowseScope,
} from './browse-params'

/** Options past this are hidden behind "Show all" — a 40-brand list buries the price filter. */
const COLLAPSE_AFTER = 8

export interface FilterSidebarProps {
  params: BrowseParams
  scope: BrowseScope
  facets: BrowseFacets
  /** Category options with live counts. On /category/[slug] these are its children. */
  categoryOptions: BrowseFacetValue[]
  /** Brand options with live counts. Empty on /brand/[slug] — the brand is the route. */
  brandOptions: BrowseFacetValue[]
  /** "Category" on search, "Sub-category" inside a category. */
  categoryTitle?: string
  className?: string
}

/* -------------------------------------------------------------------------- */
/* Section shell                                                              */
/* -------------------------------------------------------------------------- */

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  const bodyId = React.useId()

  return (
    <section className="border-b border-line py-4 first:pt-0 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={bodyId}
        className={cn(
          'flex w-full items-center justify-between gap-2 text-left',
          'text-sm font-semibold text-ink',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
          'rounded-sm',
        )}
      >
        {title}
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-ink-subtle transition-transform duration-200',
            'motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      <div id={bodyId} hidden={!open} className="mt-3">
        {children}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Facet checkbox list                                                        */
/* -------------------------------------------------------------------------- */

function FacetList({
  name,
  options,
  selected,
  disabled,
  onToggle,
}: {
  name: string
  options: BrowseFacetValue[]
  selected: string[]
  disabled: boolean
  onToggle: (slug: string) => void
}) {
  const [expanded, setExpanded] = React.useState(false)

  // A selected option must always be visible, even if it sits past the fold — otherwise the
  // shopper cannot untick what they ticked.
  const chosen = new Set(selected)
  const ordered = [
    ...options.filter((option) => chosen.has(option.slug)),
    ...options.filter((option) => !chosen.has(option.slug)),
  ]
  const visible = expanded ? ordered : ordered.slice(0, COLLAPSE_AFTER)
  const hidden = ordered.length - visible.length

  return (
    <div>
      <ul className="space-y-0.5">
        {visible.map((option) => {
          const id = `${name}-${option.slug}`
          const isChecked = chosen.has(option.slug)

          return (
            <li key={option.slug}>
              <label
                htmlFor={id}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5',
                  'transition-colors hover:bg-surface-sunken',
                  disabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={isChecked}
                  disabled={disabled}
                  onChange={() => onToggle(option.slug)}
                  className={cn(
                    'size-4 shrink-0 cursor-pointer rounded-xs border-line accent-brand-500',
                    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                  )}
                />
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-sm',
                    isChecked ? 'font-medium text-ink' : 'text-ink-muted',
                  )}
                >
                  {option.name}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-ink-subtle">
                  {option.count}
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      {hidden > 0 || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className={cn(
            'mt-1.5 rounded-sm px-1.5 text-xs font-semibold text-brand-600',
            'transition-colors hover:underline',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
          )}
        >
          {expanded ? 'Show less' : `Show all (${ordered.length})`}
        </button>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Price                                                                      */
/* -------------------------------------------------------------------------- */

function PriceFilter({
  params,
  range,
  disabled,
  onApply,
  onChip,
}: {
  params: BrowseParams
  range: { min: number; max: number }
  disabled: boolean
  onApply: (min: number | null, max: number | null) => void
  onChip: (max: number) => void
}) {
  const urlValue = `${params.priceMin ?? ''}|${params.priceMax ?? ''}`

  // The two boxes are a DRAFT — they only hit the URL on submit, because committing on every
  // keystroke would fire a navigation for "5", "50", "500". But when the URL changes underneath
  // us (a chip removed, "Clear all"), the draft must follow it.
  const [draft, setDraft] = React.useState({
    min: params.priceMin?.toString() ?? '',
    max: params.priceMax?.toString() ?? '',
  })
  const [syncedWith, setSyncedWith] = React.useState(urlValue)

  if (urlValue !== syncedWith) {
    setSyncedWith(urlValue)
    setDraft({
      min: params.priceMin?.toString() ?? '',
      max: params.priceMax?.toString() ?? '',
    })
  }

  const toValue = (raw: string): number | null => {
    const digits = raw.replace(/[^\d]/g, '')
    if (!digits) return null
    const parsed = Number.parseInt(digits, 10)
    return Number.isFinite(parsed) ? parsed : null
  }

  const dirty =
    (toValue(draft.min) ?? null) !== params.priceMin ||
    (toValue(draft.max) ?? null) !== params.priceMax

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRICE_CHIPS.map((chip) => {
          const active = params.priceMax === chip.max && params.priceMin == null

          return (
            <button
              key={chip.max}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onChip(chip.max)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                'disabled:opacity-50',
                active
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
              )}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          onApply(toValue(draft.min), toValue(draft.max))
        }}
        className="space-y-2"
      >
        <div className="flex items-center gap-2">
          <Input
            aria-label="Minimum price in Taka"
            inputMode="numeric"
            placeholder="Min"
            value={draft.min}
            disabled={disabled}
            onChange={(event) => setDraft((value) => ({ ...value, min: event.target.value }))}
            containerClassName="min-w-0 flex-1"
            className="h-10 text-sm"
          />
          <span className="shrink-0 text-sm text-ink-subtle" aria-hidden="true">
            –
          </span>
          <Input
            aria-label="Maximum price in Taka"
            inputMode="numeric"
            placeholder="Max"
            value={draft.max}
            disabled={disabled}
            onChange={(event) => setDraft((value) => ({ ...value, max: event.target.value }))}
            containerClassName="min-w-0 flex-1"
            className="h-10 text-sm"
          />
        </div>

        <Button
          type="submit"
          variant="outline"
          size="sm"
          fullWidth
          disabled={disabled || !dirty}
          className="h-9"
        >
          Apply price
        </Button>
      </form>

      {range.max > 0 ? (
        <p className="text-xs text-ink-subtle">
          Prices here run {formatBDT(range.min)} – {formatBDT(range.max)}
        </p>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Rating                                                                     */
/* -------------------------------------------------------------------------- */

function RatingFilter({
  value,
  disabled,
  onSelect,
}: {
  value: number | null
  disabled: boolean
  onSelect: (rating: number | null) => void
}) {
  return (
    <ul className="space-y-0.5">
      {RATING_CHOICES.map((rating) => {
        const active = value === rating

        return (
          <li key={rating}>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={active}
              // Clicking the live choice clears it — a radio group you can't get out of is a trap.
              onClick={() => onSelect(active ? null : rating)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                'disabled:cursor-not-allowed disabled:opacity-60',
                active ? 'bg-brand-50' : 'hover:bg-surface-sunken',
              )}
            >
              <Stars value={rating} size="sm" />
              <span
                className={cn(
                  'text-sm',
                  active ? 'font-medium text-brand-700' : 'text-ink-muted',
                )}
              >
                &amp; up
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/* -------------------------------------------------------------------------- */
/* The panel                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Every option in here comes from the `facets` that `searchProducts()` computed against the
 * result set — so the list can never offer a brand that would return zero products, and the
 * counts beside each box are the counts you will actually get.
 *
 * Each facet is counted with every filter applied EXCEPT its own (that logic lives in
 * `searchProducts`), which is what lets you swap "Aarong" for "Yellow" in one click instead of
 * having to clear the brand filter first just to see that Yellow exists.
 */
export function FilterSidebar({
  params,
  scope,
  facets,
  categoryOptions,
  brandOptions,
  categoryTitle = 'Category',
  className,
}: FilterSidebarProps) {
  const { apply, pending } = useBrowseNav()

  const toggle = (key: typeof KEY.brands | typeof KEY.categories, current: string[]) =>
    (slug: string) => {
      const next = current.includes(slug)
        ? current.filter((value) => value !== slug)
        : [...current, slug]
      apply({ [key]: next })
    }

  // Belt and braces: on /brand/[slug] the brand is the route, so the facet must never appear even
  // if a caller passed options for it.
  const brands = scope.lockedBrandSlug ? [] : brandOptions
  const nothingToNarrowBy =
    brands.length === 0 && categoryOptions.length === 0 && facets.priceRange.max === 0

  return (
    <div className={cn('text-ink', className)} aria-busy={pending || undefined}>
      <FilterSection title="Price">
        <PriceFilter
          params={params}
          range={facets.priceRange}
          disabled={pending}
          onApply={(min, max) => apply({ [KEY.priceMin]: min, [KEY.priceMax]: max })}
          onChip={(max) =>
            apply({
              [KEY.priceMin]: null,
              // Tapping the live chip turns it off.
              [KEY.priceMax]: params.priceMax === max && params.priceMin == null ? null : max,
            })
          }
        />
      </FilterSection>

      <FilterSection title="Customer rating">
        <RatingFilter
          value={params.minRating}
          disabled={pending}
          onSelect={(rating) => apply({ [KEY.rating]: rating })}
        />
      </FilterSection>

      {brands.length > 0 ? (
        <FilterSection title="Brand">
          <FacetList
            name="brand"
            options={brands}
            selected={params.brands}
            disabled={pending}
            onToggle={toggle(KEY.brands, params.brands)}
          />
        </FilterSection>
      ) : null}

      {categoryOptions.length > 0 ? (
        <FilterSection title={categoryTitle}>
          <FacetList
            name="category"
            options={categoryOptions}
            selected={params.categories}
            disabled={pending}
            onToggle={toggle(KEY.categories, params.categories)}
          />
        </FilterSection>
      ) : null}

      {/* Nothing to narrow by — an empty sidebar shell would just look broken. */}
      {nothingToNarrowBy ? (
        <p className="py-4 text-sm text-ink-subtle">No filters available for these results.</p>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* The mobile entry point                                                     */
/* -------------------------------------------------------------------------- */

export interface FilterSheetProps extends FilterSidebarProps {
  /** Drives the "Show 128 results" button — the shopper's payoff for filtering. */
  resultCount: number
}

/**
 * On a phone there is no room for a 17rem rail, so the same panel lives behind a button that
 * carries its own active-filter count. Filters apply the instant they're tapped (the grid behind
 * the sheet is already updating), so the footer button is a dismiss, not a commit — which is why
 * it can afford to tell you how many products are waiting.
 */
export function FilterSheet({ resultCount, className, ...panel }: FilterSheetProps) {
  const [open, setOpen] = React.useState(false)
  const { clearAll, pending } = useBrowseNav()

  const count = activeFilterCount(panel.params, panel.scope)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="md"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn('h-10 shrink-0', className)}
      >
        <SlidersHorizontal aria-hidden="true" />
        Filters
        {count > 0 ? (
          <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-brand-500 text-[0.625rem] font-bold tabular-nums text-white">
            {count}
          </span>
        ) : null}
      </Button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        side="left"
        title="Filters"
        description={
          count > 0 ? `${count} filter${count === 1 ? '' : 's'} applied` : 'Narrow these results'
        }
        footer={
          <div className="flex items-center gap-2">
            {count > 0 ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => clearAll()}
                className="shrink-0"
              >
                Clear all
              </Button>
            ) : null}

            <Button
              type="button"
              variant="primary"
              fullWidth
              loading={pending}
              onClick={() => setOpen(false)}
            >
              Show {resultCount.toLocaleString('en-US')}{' '}
              {resultCount === 1 ? 'result' : 'results'}
            </Button>
          </div>
        }
      >
        <FilterSidebar {...panel} />
      </Sheet>
    </>
  )
}
