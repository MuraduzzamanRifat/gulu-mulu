import { Skeleton } from '@/components/ui'

/**
 * Shown while the cart's reads (the cart itself + any applied coupon) resolve.
 *
 * It mirrors the real page's box model exactly — the same max-w-6xl container, the same 8/4
 * column split, the same seller-grouped line sections — so the route paints instantly and nothing
 * jumps when the data lands.
 */
export default function CartLoading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10"
      role="status"
      aria-label="Loading your cart"
    >
      <header className="mb-5 sm:mb-8">
        <Skeleton className="h-7 w-44 sm:h-8" />
        <Skeleton className="mt-2 h-4 w-64 max-w-full" />
      </header>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
        {/* Lines, grouped by seller */}
        <div className="space-y-4 lg:col-span-8">
          {[0, 1].map((group) => (
            <section
              key={group}
              className="overflow-hidden rounded-card border border-line bg-surface"
            >
              <header className="flex items-center gap-2 border-b border-line bg-surface-muted px-3 py-2.5 sm:px-4">
                <Skeleton className="size-4 shrink-0 rounded-xs" />
                <Skeleton className="h-4 w-40" />
              </header>

              <ul className="divide-y divide-line">
                {[0, 1].map((line) => (
                  <li key={line} className="flex gap-3 px-3 py-4 sm:gap-4 sm:px-4">
                    <Skeleton className="size-20 shrink-0 rounded-lg sm:size-24" />

                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Skeleton className="h-4 w-full max-w-72" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-5 w-28" />

                      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                        <Skeleton className="h-11 w-32 rounded-lg" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <Skeleton className="h-5 w-40" />
        </div>

        {/* Coupon + order summary */}
        <aside className="space-y-4 lg:col-span-4">
          <Skeleton className="h-24 w-full rounded-card" />

          <div className="rounded-card border border-line bg-surface">
            <div className="border-b border-line px-4 py-3.5 sm:px-5">
              <Skeleton className="h-5 w-36" />
            </div>

            <div className="space-y-3 px-4 py-4 sm:px-5">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center justify-between gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}

              <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>

              <Skeleton className="mt-2 h-12 w-full rounded-lg" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
