'use client'

import * as React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StarSize } from './rating'

const INPUT_STAR_SIZE: Record<StarSize, string> = {
  sm: 'size-5',
  md: 'size-6',
  lg: 'size-8',
}

const VALUES = [1, 2, 3, 4, 5] as const

export interface RatingInputProps {
  /** Current rating, 0 = unset. */
  value: number
  onChange: (value: number) => void
  size?: StarSize
  disabled?: boolean
  /** Emits a hidden input so this works inside a plain <form> / Server Action. */
  name?: string
  className?: string
  'aria-label'?: string
}

/**
 * Clickable 1–5 star picker following the ARIA radiogroup pattern:
 * one tab stop, arrow keys move between stars, Home/End jump to the ends.
 */
export function RatingInput({
  value,
  onChange,
  size = 'lg',
  disabled = false,
  name,
  className,
  'aria-label': ariaLabel = 'Rating',
}: RatingInputProps) {
  const [hovered, setHovered] = React.useState(0)
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])

  // Hover/focus preview wins over the committed value.
  const shown = hovered || value

  function commit(next: number) {
    if (disabled) return
    onChange(next)
    refs.current[next - 1]?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    let next: number | null = null

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = Math.min(5, (value || 0) + 1)
        break
      case 'ArrowLeft':
      case 'ArrowDown':
        next = Math.max(1, (value || 1) - 1)
        break
      case 'Home':
        next = 1
        break
      case 'End':
        next = 5
        break
      default:
        return
    }

    e.preventDefault()
    commit(next)
  }

  // The roving tab stop: the selected star, or the first one when unset.
  const tabStop = value >= 1 && value <= 5 ? value : 1

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={cn('inline-flex items-center gap-2', disabled && 'opacity-50', className)}
      onMouseLeave={() => setHovered(0)}
    >
      {VALUES.map((i) => {
        const filled = i <= shown
        return (
          <button
            key={i}
            ref={(el) => {
              refs.current[i - 1] = el
            }}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i === 1 ? '' : 's'}`}
            tabIndex={i === tabStop ? 0 : -1}
            disabled={disabled}
            onClick={() => commit(i)}
            onKeyDown={onKeyDown}
            onMouseEnter={() => !disabled && setHovered(i)}
            onFocus={() => !disabled && setHovered(i)}
            onBlur={() => setHovered(0)}
            className={cn(
              // A 44px target at every star size (p-1.5 alone only gets there for the
              // size-8 `lg` star; min-h/min-w carries `sm` and `md`), with gap-2 between
              // them. A mis-tapped rating is data you cannot get back — it silently
              // corrupts the product's aggregate.
              'inline-flex min-h-11 min-w-11 items-center justify-center',
              'rounded-sm p-1.5 transition-transform duration-100',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
              'focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
              !disabled && 'cursor-pointer hover:scale-110 motion-reduce:hover:scale-100',
              disabled && 'cursor-not-allowed',
            )}
          >
            <Star
              className={cn(
                INPUT_STAR_SIZE[size],
                'fill-current transition-colors',
                filled ? 'text-accent-500' : 'text-line-strong',
              )}
              strokeWidth={0}
            />
          </button>
        )
      })}

      {name ? <input type="hidden" name={name} value={value} /> : null}
    </div>
  )
}
