import { ProductCardSkeleton, Skeleton, SkeletonText } from '@/components/ui'

/**
 * The PDP skeleton.
 *
 * It mirrors the real page's box model — 4:5 gallery, thumbnail rail, the same stack down the buy
 * column — so nothing jumps when the data lands. A skeleton that reflows on arrival is worse than
 * no skeleton: it moves the Add to Cart button out from under a thumb already reaching for it.
 */
export default function ProductLoading() {
  return (
    <div
      className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 lg:px-8"
      role="status"
      aria-label="Loading product"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 py-3 sm:py-4">
        <Skeleton className="h-3.5 w-12" />
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3.5 w-32" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10 xl:gap-14">
        <div className="flex flex-col gap-3">
          <Skeleton className="aspect-[4/5] w-full rounded-card" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="size-16 shrink-0 rounded-lg sm:size-20" />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-4/5" />
            <Skeleton className="h-4 w-40" />
          </div>

          <div className="flex flex-col gap-4 border-t border-line pt-6">
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-4 w-32" />

            {/* Variant pills */}
            <div className="flex flex-col gap-3 border-t border-line pt-5">
              <Skeleton className="h-4 w-16" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-14 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-4 w-20" />
              <div className="flex gap-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-24 rounded-lg" />
                ))}
              </div>
            </div>

            <Skeleton className="h-10 w-36 rounded-lg" />

            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <Skeleton className="h-12 flex-1 rounded-lg" />
                <Skeleton className="size-12 shrink-0 rounded-lg" />
              </div>
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>

          {/* Seller card */}
          <div className="rounded-card border border-line p-4 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <Skeleton className="size-14 shrink-0 rounded-full sm:size-16" />
              <div className="flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-5 w-44" />
                <Skeleton className="mt-2 h-3.5 w-28" />
              </div>
            </div>
            <SkeletonText lines={2} className="mt-4" />
          </div>

          {/* Delivery block */}
          <div className="flex flex-col gap-4 rounded-card border border-line p-4 sm:p-5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="mt-1.5 h-3 w-full max-w-64" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-10 sm:mt-14">
        <div className="flex gap-6 border-b border-line pb-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20" />
        </div>
        <SkeletonText lines={4} className="mt-5 max-w-3xl" />
      </div>

      {/* Related rail */}
      <div className="mt-12 sm:mt-16">
        <Skeleton className="h-6 w-48" />
        <div className="mt-4 flex gap-3 overflow-hidden sm:gap-4">
          {Array.from({ length: 5 }, (_, i) => (
            <ProductCardSkeleton key={i} className="w-40 shrink-0 sm:w-48 lg:w-56" />
          ))}
        </div>
      </div>

      <span className="sr-only">Loading product…</span>
    </div>
  )
}
