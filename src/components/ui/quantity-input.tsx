'use client'

import * as React from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface QuantityInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  /** Usually the product's `stock`. */
  max?: number
  disabled?: boolean
  size?: 'sm' | 'md'
  /** Emits a hidden input so this works inside a plain <form> / Server Action. */
  name?: string
  className?: string
  'aria-label'?: string
}

/**
 * − / value / + stepper with clamping. The middle cell is a real number input,
 * so a customer can type "12" instead of tapping + eleven times.
 */
export function QuantityInput({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  size = 'md',
  name,
  className,
  'aria-label': ariaLabel = 'Quantity',
}: QuantityInputProps) {
  // What the user is mid-typing. Null means "show the committed value".
  const [draft, setDraft] = React.useState<string | null>(null)

  const upper = max ?? Number.MAX_SAFE_INTEGER
  const clamp = React.useCallback(
    (n: number) => Math.min(upper, Math.max(min, Math.trunc(n))),
    [min, upper],
  )

  const atMin = value <= min
  const atMax = value >= upper

  function commit(next: number) {
    if (disabled) return
    const clamped = clamp(next)
    if (clamped !== value) onChange(clamped)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setDraft(raw)

    // Only push a valid number upward; let the field sit empty while typing.
    const parsed = Number.parseInt(raw, 10)
    if (Number.isFinite(parsed)) commit(parsed)
  }

  function onBlur() {
    // Snap the display back to the clamped truth ("", "0", "999" all resolve).
    setDraft(null)
    commit(Number.parseInt(draft ?? '', 10) || value)
  }

  // 44px minimum, even at `sm` (the cart). This is the checkout funnel: a missed
  // `+` is a wrong-quantity order. `cursor-pointer` is explicit because Tailwind 4's
  // preflight no longer sets it on <button>.
  const btn = cn(
    'flex shrink-0 cursor-pointer items-center justify-center text-ink transition-colors',
    'hover:bg-surface-sunken active:bg-line',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset',
    'disabled:cursor-not-allowed disabled:text-ink-subtle disabled:hover:bg-transparent',
    size === 'sm' ? 'size-11' : 'size-12',
  )

  const icon = size === 'sm' ? 'size-4' : 'size-5'

  return (
    <div
      className={cn(
        'inline-flex items-center overflow-hidden rounded-lg border border-line bg-surface',
        'focus-within:border-brand-500',
        disabled && 'opacity-50',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => commit(value - 1)}
        disabled={disabled || atMin}
        aria-label="Decrease quantity"
        className={cn(btn, 'border-r border-line')}
      >
        <Minus className={icon} aria-hidden="true" />
      </button>

      <input
        type="number"
        inputMode="numeric"
        value={draft ?? String(value)}
        onChange={onInputChange}
        onBlur={onBlur}
        disabled={disabled}
        min={min}
        max={max}
        aria-label={ariaLabel}
        className={cn(
          'h-full border-0 bg-transparent text-center font-medium tabular-nums text-ink',
          'outline-hidden focus-visible:outline-hidden',
          // Kill the native spinners — we have our own, nicer ones.
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          // Height matches the buttons so the three cells stay aligned. Font size is
          // 16px on mobile — below that, iOS Safari zooms the viewport on focus and
          // does not zoom back out on blur, stranding the shopper mid-checkout. The
          // compact size returns from `sm` up, where zoom-on-focus doesn't exist.
          size === 'sm' ? 'h-11 w-11 text-base sm:text-sm' : 'h-12 w-14 text-base',
        )}
      />

      <button
        type="button"
        onClick={() => commit(value + 1)}
        disabled={disabled || atMax}
        aria-label="Increase quantity"
        className={cn(btn, 'border-l border-line')}
      >
        <Plus className={icon} aria-hidden="true" />
      </button>

      {name ? <input type="hidden" name={name} value={value} /> : null}
    </div>
  )
}
