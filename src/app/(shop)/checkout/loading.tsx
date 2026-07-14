import { Skeleton } from '@/components/ui'

/**
 * Shown while `/checkout` resolves.
 *
 * The page cannot emit a byte until `requireUser()` plus a cart read, a coupon read and an address
 * `findMany` have all come back. The control that gets you here is a plain `<Link>` on the cart —
 * it has no pending state of its own, so without this file the tap looks like it did nothing for a
 * whole server round trip, and shoppers on slow BD mobile connections simply tap it again.
 *
 * Mirrors the real layout: step rail, left form column, sticky summary panel.
 */
export default function CheckoutLoading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10"
      role="status"
      aria-label="Loading checkout"
    >
      <Skeleton className="mb-5 h-7 w-36 sm:mb-6 sm:h-8" />

      {/* Step rail: address → delivery → payment */}
      <div className="mb-6 flex items-center gap-2 sm:gap-4">
        {[0, 1, 2].map((step) => (
          <div key={step} className="flex flex-1 items-center gap-2">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-16 sm:w-24" />
            {step < 2 ? <Skeleton className="ml-auto hidden h-px flex-1 sm:block" /> : null}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
        {/* The step body — an address list, on the step you land on by default. */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="rounded-card border border-line bg-surface p-4 sm:p-5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-2 h-4 w-full max-w-96" />

            <div className="mt-5 space-y-3">
              {[0, 1].map((address) => (
                <div key={address} className="flex items-start gap-3 rounded-card border border-line p-4">
                  <Skeleton className="mt-0.5 size-5 shrink-0 rounded-full" />

                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-full max-w-80" />
                  </div>
                </div>
              ))}

              <Skeleton className="h-11 w-full rounded-lg sm:w-48" />
            </div>

            <div className="mt-6 border-t border-line pt-5">
              <Skeleton className="h-12 w-full rounded-lg sm:ml-auto sm:w-44" />
            </div>
          </div>
        </div>

        {/* Order summary */}
        <aside className="lg:col-span-5 xl:col-span-4">
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

              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
