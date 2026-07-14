/**
 * Shared product components.
 *
 *   import { ProductCard, ProductGrid, ProductRail, SectionHeading } from '@/components/product'
 *
 * Server Components, except WishlistButton (the heart) which is the one client island.
 */

export { ProductCard, type ProductCardProduct, type ProductCardProps } from './product-card'

export {
  ProductGrid,
  ProductRail,
  type ProductGridProps,
  type ProductRailProps,
} from './product-grid'

export { SectionHeading, type SectionHeadingProps } from './section-heading'

export { WishlistButton, type WishlistButtonProps } from './wishlist-button'
