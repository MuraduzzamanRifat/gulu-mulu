import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Soft-tint badges. The bg/text pairings are chosen for contrast, not just vibes:
 * `--color-warning` is a light amber (L 0.75), so it is unreadable as text on
 * `--color-warning-soft`. We use `accent-700` (a dark gold, still a real token)
 * as the warning ink instead.
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
        accent: 'bg-accent-100 text-accent-700',
        success: 'bg-success-soft text-success',
        warning: 'bg-warning-soft text-accent-700',
        danger: 'bg-danger-soft text-danger',
        info: 'bg-info-soft text-info',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[0.625rem] leading-4',
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
 */
export function DiscountBadge({ percent, size = 'md', className, ...props }: DiscountBadgeProps) {
  const rounded = Math.round(percent)
  if (!Number.isFinite(rounded) || rounded <= 0) return null

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-brand-500 font-semibold tabular-nums text-white whitespace-nowrap',
        size === 'sm' ? 'px-1.5 py-0.5 text-[0.625rem] leading-4' : 'px-2 py-0.5 text-xs leading-5',
        className,
      )}
      {...props}
    >
      {rounded}% OFF
    </span>
  )
}
