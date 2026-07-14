'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * Description | Specifications | Reviews.
 *
 * <Tabs> is a client component (it owns focus and selection), but the PANELS are not: they arrive
 * as already-rendered Server Component trees passed down as props. So the reviews, the spec table
 * and the description ship as HTML, and the only JavaScript this section costs is the tab strip
 * itself.
 */

export interface ProductTabsProps {
  description: React.ReactNode
  specifications: React.ReactNode
  reviews: React.ReactNode
  /** Rendered as a pill on the Reviews tab. */
  reviewCount: number
  className?: string
}

export function ProductTabs({
  description,
  specifications,
  reviews,
  reviewCount,
  className,
}: ProductTabsProps) {
  return (
    <Tabs defaultValue="description" className={cn('w-full', className)}>
      <TabsList aria-label="Product information">
        <TabsTrigger value="description">Description</TabsTrigger>
        <TabsTrigger value="specifications">Specifications</TabsTrigger>
        <TabsTrigger value="reviews">
          Reviews
          {reviewCount > 0 ? (
            <span className="ml-1.5 rounded-full bg-surface-sunken px-1.5 py-0.5 text-[0.625rem] font-semibold text-ink-muted tabular-nums">
              {reviewCount.toLocaleString('en-US')}
            </span>
          ) : null}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="description" className="pt-5">
        {description}
      </TabsContent>

      <TabsContent value="specifications" className="pt-5">
        {specifications}
      </TabsContent>

      <TabsContent value="reviews" className="pt-5">
        {reviews}
      </TabsContent>
    </Tabs>
  )
}
