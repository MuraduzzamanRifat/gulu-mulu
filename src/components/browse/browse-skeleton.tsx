import { ProductGridSkeleton, Skeleton } from '@/components/ui'
import { cn } from '@/lib/utils'

export interface BrowseSkeletonProps {
  /** Height of the page header placeholder above the grid, if the route has one. */
  header?: 'none' | 'banner'
  className?: string
}

/**
 * The shape of a browse page while its data is in flight. It mirrors the real layout — the same
 * 15rem rail, the same toolbar row, the same 2-up mobile grid — so nothing jumps when the
 * products land. Shared by all three `loading.tsx` files.
 */
export function BrowseSkeleton({ header = 'none', className }: BrowseSkeletonProps) {
  return (
    <div
      className={cn('mx-auto max-w-7xl px-4 py-5 sm:py-8', className)}
      role="status"
      aria-label="Loading products"
    >
      <Skeleton className="h-4 w-40" />

      {header === 'banner' ? (
        <Skeleton className="mt-3 h-28 w-full rounded-card sm:h-36" />
      ) : (
        <Skeleton className="mt-4 h-7 w-56 sm:h-8 sm:w-72" />
      )}

      <div className="mt-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="hidden lg:block">
          {[0, 1, 2, 3].map((section) => (
            <div key={section} className="border-b border-line py-4 first:pt-0">
              <Skeleton className="h-4 w-24" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            </div>
          ))}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <Skeleton className="hidden h-4 w-36 sm:block" />
            {/* h-11 to match the real toolbar: the Filters button and the sort Select are both
                44px, so reserving 40px here would jump the grid down when the data lands. */}
            <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
              <Skeleton className="h-11 w-28 lg:hidden" />
              <Skeleton className="h-11 flex-1 sm:w-52 sm:flex-none" />
            </div>
          </div>

          <ProductGridSkeleton count={12} className="mt-4 gap-3 sm:gap-4" />
        </div>
      </div>
    </div>
  )
}
