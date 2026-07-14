/**
 * Gulu Mulu UI primitives.
 *
 *   import { Button, Price, Stars } from '@/components/ui'
 *
 * Server Components by default; only sheet/dialog/tabs/quantity-input and
 * RatingInput cross the client boundary.
 */

export { Button, buttonVariants, type ButtonProps } from './button'

export {
  Badge,
  badgeVariants,
  DiscountBadge,
  type BadgeProps,
  type DiscountBadgeProps,
} from './badge'

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type CardProps,
  type CardTitleProps,
} from './card'

export {
  Input,
  Label,
  Select,
  Textarea,
  type InputProps,
  type LabelProps,
  type SelectProps,
  type TextareaProps,
} from './input'

export { Stars, type StarsProps, type StarSize } from './rating'
export { RatingInput, type RatingInputProps } from './rating-input'

export {
  ProductCardSkeleton,
  ProductGridSkeleton,
  Skeleton,
  SkeletonText,
} from './skeleton'

export { EmptyState, type EmptyStateProps } from './empty-state'

export { Sheet, type SheetProps, type SheetSide } from './sheet'
export { Dialog, type DialogProps, type DialogSize } from './dialog'

export {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type TabsContentProps,
  type TabsListProps,
  type TabsProps,
  type TabsTriggerProps,
} from './tabs'

export { Pagination, type PaginationProps } from './pagination'

export { QuantityInput, type QuantityInputProps } from './quantity-input'

export { Price, type PriceProduct, type PriceProps, type PriceSize } from './price'
