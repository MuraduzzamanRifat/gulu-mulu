import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium',
    'select-none transition-[background-color,border-color,color,opacity] duration-150',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98] motion-reduce:active:scale-100',
    // Icons never squash, and never eat the click that belongs to the button.
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-brand-500 text-white shadow-xs hover:bg-brand-600 active:bg-brand-700',
        secondary: 'bg-surface-sunken text-ink hover:bg-line active:bg-line-strong',
        outline:
          'border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-muted active:bg-surface-sunken',
        ghost: 'text-ink hover:bg-surface-sunken active:bg-line',
        danger: 'bg-danger text-white shadow-xs hover:bg-danger/90 active:bg-danger/80',
        accent: 'bg-accent-500 text-ink shadow-xs hover:bg-accent-600 active:bg-accent-700',
      },
      size: {
        // 44px on md/lg: BD traffic is mobile, so the default must be thumb-sized.
        sm: 'h-8 px-3 text-xs [&_svg]:size-4',
        md: 'h-11 px-4 text-sm [&_svg]:size-4',
        lg: 'h-12 px-6 text-base [&_svg]:size-5',
        icon: 'size-11 [&_svg]:size-5',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Shows a spinner and disables the button. */
  loading?: boolean
  ref?: React.Ref<HTMLButtonElement>
}

export function Button({
  className,
  variant,
  size,
  fullWidth,
  loading = false,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {/* An icon button has no room for a label beside the spinner. */}
      {loading && size === 'icon' ? null : children}
    </button>
  )
}
