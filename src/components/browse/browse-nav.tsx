'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { KEY, keyVariants, type BrowseKey } from './browse-params'

/** `null` / `''` / `[]` all mean "remove this key from the URL". */
export type ParamPatch = Partial<Record<BrowseKey, string | number | string[] | null>>

export interface BrowseNav {
  /** Merge a patch into the current query string and navigate. Always resets to page 1. */
  apply: (patch: ParamPatch) => void
  /** Strip every query param — back to the bare surface. */
  clearAll: () => void
  /** A navigation triggered by this hook is in flight. */
  pending: boolean
}

/**
 * The one place a browse widget is allowed to change the URL.
 *
 * Three rules, and every filter control in this folder inherits them:
 *
 *  1. Start from the LIVE query string (`useSearchParams()`), not from a snapshot of the parsed
 *     params. Changing the sort must not silently drop a price filter — or a `utm_source` that
 *     marketing is measuring the campaign with.
 *  2. Any filter change RESETS `page`. Being on page 4 of "all shoes" and ticking "Nike" must not
 *     land you on page 4 of a 2-page result set.
 *  3. Writing a canonical key purges its aliases, so a URL that arrived as `?category=men` can't
 *     end up fighting a freshly written `?categories=men`.
 *
 * `scroll: false` because the filters live at the top of the page on desktop — yanking the
 * viewport to the top every time a checkbox is ticked is a well-known way to make a facet panel
 * unusable. Pagination is separate: those are real <Link>s and *should* scroll you up.
 */
export function useBrowseNav(): BrowseNav {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = React.useTransition()

  const push = React.useCallback(
    (search: URLSearchParams) => {
      const query = search.toString()
      const href = query ? `${pathname}?${query}` : pathname
      startTransition(() => {
        router.push(href, { scroll: false })
      })
    },
    [pathname, router],
  )

  const apply = React.useCallback(
    (patch: ParamPatch) => {
      const search = new URLSearchParams(searchParams.toString())

      for (const [name, value] of Object.entries(patch)) {
        const key = name as BrowseKey

        // Rule 3: the canonical key wins, so no alias may survive alongside it.
        for (const variant of keyVariants(key)) search.delete(variant)

        const empty =
          value == null ||
          value === '' ||
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === 'number' && !Number.isFinite(value))

        if (empty) continue

        search.set(key, Array.isArray(value) ? value.join(',') : String(value))
      }

      // Rule 2.
      for (const variant of keyVariants(KEY.page)) search.delete(variant)

      push(search)
    },
    [push, searchParams],
  )

  const clearAll = React.useCallback(() => {
    push(new URLSearchParams())
  }, [push])

  return { apply, clearAll, pending }
}
