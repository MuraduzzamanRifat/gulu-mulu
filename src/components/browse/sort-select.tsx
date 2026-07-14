'use client'

import { ArrowUpDown } from 'lucide-react'

import { Select } from '@/components/ui'
import { cn } from '@/lib/utils'

import { useBrowseNav } from './browse-nav'
import { DEFAULT_SORT, KEY, SORT_OPTIONS, type BrowseSort } from './browse-params'

export interface SortSelectProps {
  value: BrowseSort
  className?: string
}

/**
 * Native <select> on purpose: on a phone it opens the OS wheel picker, which is faster and more
 * familiar than any custom listbox we could ship — and it costs no JS to render.
 *
 * Changing the sort resets to page 1 (via `useBrowseNav`), and the default sort is written out of
 * the URL entirely so `/products/search?search=saree` stays the canonical, shareable address.
 */
export function SortSelect({ value, className }: SortSelectProps) {
  const { apply, pending } = useBrowseNav()

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label
        htmlFor="browse-sort"
        className="hidden shrink-0 text-sm text-ink-muted sm:inline"
      >
        Sort by
      </label>

      <Select
        id="browse-sort"
        icon={ArrowUpDown}
        value={value}
        aria-label="Sort products"
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value as BrowseSort
          apply({ [KEY.sort]: next === DEFAULT_SORT ? null : next })
        }}
        // No `text-sm` and no `h-10`. cn() is twMerge, so a base-level `text-sm` would beat the
        // Select primitive's `text-base sm:text-sm` and flatten it to 14px — and iOS Safari
        // zooms the viewport when a <select> under 16px takes focus, leaving the shopper zoomed
        // in on the very screen they need to scan a grid. The primitive is also already h-11.
        className="w-full min-w-0 sm:w-52"
        containerClassName="min-w-0 flex-1 sm:flex-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  )
}
