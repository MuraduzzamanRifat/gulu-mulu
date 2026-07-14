import { ProductCardSkeleton, Skeleton } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * The homepage's loading state. It mirrors the real layout's box model section for section — same
 * heights, same grids, same gaps — so when the data lands nothing jumps. A generic spinner here
 * would trade a measurable CLS penalty for no information at all.
 */
export default function HomeLoading() {
  return (
    <div className="pb-10" role="status" aria-label="Loading the homepage">
      <span className="sr-only">Loading…</span>

      {/* Hero */}
      <Skeleton className="h-[260px] w-full rounded-none sm:h-[340px] lg:h-[420px]" />

      {/* App strip */}
      <Skeleton className="h-16 w-full rounded-none" />

      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col gap-10 py-8 sm:gap-12 sm:py-10">
          {/* Category rail */}
          <section>
            <SectionHeadingSkeleton />
            <div className="flex gap-4 overflow-hidden md:grid md:grid-cols-6 md:gap-x-4 md:gap-y-5">
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex w-18 shrink-0 flex-col items-center gap-2 md:w-auto',
                    // Only ~6 tiles fit a phone's viewport; the rest would just be off-screen noise.
                    i > 5 && 'max-md:hidden',
                  )}
                >
                  <Skeleton className="size-18 rounded-full sm:size-20" />
                  <Skeleton className="h-3 w-14" />
                </div>
              ))}
            </div>
          </section>

          {/* Secondary banners */}
          <section className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <Skeleton className="aspect-[2/1] w-full rounded-card" />
            <Skeleton className="aspect-[2/1] w-full rounded-card" />
          </section>

          {/* USP bar */}
          <Skeleton className="h-40 w-full rounded-card sm:h-24" />

          {/* Brand strip */}
          <section>
            <SectionHeadingSkeleton />
            <div className="flex gap-3 overflow-hidden sm:gap-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-16 w-28 shrink-0 rounded-card sm:h-20 sm:w-36" />
              ))}
            </div>
          </section>

          {/* Shop under budget */}
          <section>
            <SectionHeadingSkeleton />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-card" />
              ))}
            </div>
          </section>

          {/* Deal categories */}
          <section>
            <SectionHeadingSkeleton />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              <Skeleton className="col-span-2 aspect-[16/9] w-full rounded-card" />
              <Skeleton className="col-span-2 aspect-[16/9] w-full rounded-card" />
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="aspect-[4/3] w-full rounded-card" />
              ))}
            </div>
          </section>

          {/* Featured products */}
          <section>
            <SectionHeadingSkeleton />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

/** Matches <SectionHeading />: the brand rule, the title, the subtitle, the "See all" link. */
function SectionHeadingSkeleton() {
  return (
    <div className="mb-3 flex items-end justify-between gap-4 sm:mb-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-1 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56 max-sm:hidden" />
        </div>
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  )
}
