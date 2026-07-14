import { ProductGrid, SectionHeading } from '@/components/product'
import type { ProductCard } from '@/lib/queries'

export interface FeaturedProductsProps {
  products: ProductCard[]
  /** Ids the signed-in shopper has already hearted, so the cards render filled. */
  wishlistedIds?: string[]
}

/**
 * The homepage's product shelf. Deliberately the last section: by the time a shopper scrolls this
 * far the banners, budgets and deals have all failed to route them, so this is the catch-all —
 * hand-picked stock, best sellers first.
 *
 * `priorityCount={0}`: this grid sits ~4 screens down. Preloading its images would fight the hero
 * for bandwidth and wreck LCP, which is exactly the trade `priority` exists to make in the other
 * direction.
 */
export function FeaturedProducts({ products, wishlistedIds }: FeaturedProductsProps) {
  if (products.length === 0) return null

  return (
    <section aria-label="Featured products">
      <SectionHeading
        title="Featured products"
        subtitle="Hand-picked by our team, loved by shoppers"
        href="/products/search"
      />

      <ProductGrid products={products} wishlistedIds={wishlistedIds} priorityCount={0} />
    </section>
  )
}
