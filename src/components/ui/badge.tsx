import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Soft-tint badges.
 *
 * Every pairing below is measured, not eyeballed. Badge is what renders order
 * status (PENDING/CONFIRMED/DELIVERED/CANCELLED) at 10–12px — normal text by
 * WCAG, so 4.5:1 is mandatory, not 3:1.
 *
 * The base status tokens (`--color-success`, `--color-info`, …) are mid-lightness
 * *fills*; as text on their own soft tint they measure 2.87–3.97:1 and fail. Each
 * therefore has a dedicated `-ink` token (see globals.css @theme) that clears the
 * floor. Measured, foreground on background:
 *
 *   neutral  ink-muted / surface-sunken  4.83:1
 *   brand    brand-700 / brand-50        7.12:1
 *   accent   warning-ink / accent-100    4.59:1
 *   success  success-ink / success-soft  4.53:1
 *   warning  warning-ink / warning-soft  4.57:1
 *   danger   danger-ink / danger-soft    4.58:1
 *   info     info-ink / info-soft        4.56:1
 */
export const badgeVariants = cva(
  [
    'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-3',
  ],
  {
    variants: {
      variant: {
        neutral: 'bg-surface-sunken text-ink-muted',
        brand: 'bg-brand-50 text-brand-700',
        accent: 'bg-accent-100 text-warning-ink',
        success: 'bg-success-soft text-success-ink',
        warning: 'bg-warning-soft text-warning-ink',
        danger: 'bg-danger-soft text-danger-ink',
        info: 'bg-info-soft text-info-ink',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-3xs',
        md: 'px-2 py-0.5 text-xs leading-5',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export interface DiscountBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Whole percent, e.g. 40 renders "40% OFF". Use discountPercent() from '@/lib/format'. */
  percent: number
  size?: 'sm' | 'md'
}

/**
 * The saving flash used across the deal grid — solid brand, white ink, so it
 * reads at a glance on a product image. Renders nothing for a non-saving.
 *
 * This is the smallest text in the product (10px at `sm`), so the white-on-brand-500
 * pairing has no headroom: it is 4.61:1, only just over the AA floor, and it holds
 * only because globals.css pins brand-500 at the lightest crimson that carries white
 * text. Lighten that token and this is the first thing that breaks.
 */
export function DiscountBadge({ percent, size = 'md', className, ...props }: DiscountBadgeProps) {
  const rounded = Math.round(percent)
  if (!Number.isFinite(rounded) || rounded <= 0) return null

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-brand-500 font-semibold tabular-nums text-white whitespace-nowrap',
        size === 'sm' ? 'px-1.5 py-0.5 text-3xs' : 'px-2 py-0.5 text-xs leading-5',
        className,
      )}
      {...props}
    >
      {rounded}% OFF
    </span>
  )
}
