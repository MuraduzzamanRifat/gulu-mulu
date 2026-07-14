import { Skeleton } from '@/components/ui'

/**
 * Shown while an account page's data resolves. Deliberately mirrors the dashboard's real shape —
 * heading, four stat tiles, a stack of order cards — so the layout doesn't jump when the content
 * lands. It covers every account route that doesn't ship a loading file of its own.
 */
export default function AccountLoading() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-card border border-line bg-surface p-3.5 sm:p-4"
          >
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="mt-1.5 h-3 w-16" />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />

        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-card border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-1.5 h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>

            <div className="mt-3.5 flex gap-2">
              {Array.from({ length: 3 }, (_, thumb) => (
                <Skeleton key={thumb} className="size-12 rounded-lg sm:size-14" />
              ))}
            </div>

            <div className="mt-3.5 flex items-center justify-between border-t border-line pt-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
