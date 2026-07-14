'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

export interface OtpInputProps {
  /** The compact digit string, e.g. "1234". Never contains gaps. */
  value: string
  onChange: (value: string) => void
  /** Fired the moment the last box is filled — typed, pasted, or SMS-autofilled. */
  onComplete?: (value: string) => void
  length?: number
  disabled?: boolean
  invalid?: boolean
  /** Wired to the error message below the field for screen readers. */
  'aria-describedby'?: string
  className?: string
}

/**
 * The six-box OTP field.
 *
 * MODEL: the value is a single compact digit string; box `i` renders `value[i]`. Boxes are a
 * VIEW, not the state — which is what makes the awkward cases fall out for free:
 *
 *  - Paste "123 456" anywhere -> digits are extracted and distributed across all six boxes.
 *  - iOS/Android SMS autofill dumps the whole code into box 0 -> the change handler sees a
 *    6-char string and spreads it, instead of storing "1" and dropping five digits on the floor.
 *    (`autoComplete="one-time-code"` on box 0 is what triggers that OS suggestion.)
 *  - Focusing a box past the first empty one bounces focus back, so a gap can never be created
 *    and the string can never be sparse.
 *  - Backspace on an empty box clears the one to its left and moves there — the behaviour every
 *    shopper's muscle memory already expects.
 *
 * `inputMode="numeric"` puts a BD phone straight on the digit keypad; `type="text"` (not
 * "number") avoids the spinner and the silent loss of leading zeros.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  invalid = false,
  'aria-describedby': ariaDescribedBy,
  className,
}: OtpInputProps) {
  const inputs = React.useRef<Array<HTMLInputElement | null>>([])

  const digits = value.slice(0, length)

  function focusAt(index: number) {
    const clamped = Math.max(0, Math.min(length - 1, index))
    const el = inputs.current[clamped]
    el?.focus()
    el?.select()
  }

  function commit(next: string) {
    const clean = next.replace(/\D/g, '').slice(0, length)
    onChange(clean)
    if (clean.length === length) onComplete?.(clean)
  }

  /** Write one digit at `index`, clamped so it can never land past the first empty box. */
  function writeDigit(index: number, digit: string) {
    const at = Math.min(index, digits.length)
    commit(digits.slice(0, at) + digit + digits.slice(at + 1))
    focusAt(at + 1)
  }

  /** Delete the digit at `index`. The string stays compact, so later digits shift left. */
  function deleteDigit(index: number) {
    const at = Math.min(index, digits.length - 1)
    if (at < 0) return
    commit(digits.slice(0, at) + digits.slice(at + 1))
    focusAt(at)
  }

  function handleChange(index: number, raw: string) {
    const typed = raw.replace(/\D/g, '')

    // Android soft keyboards routinely delete without ever firing a keydown we can read.
    if (typed.length === 0) {
      deleteDigit(index)
      return
    }

    if (typed.length === 1) {
      writeDigit(index, typed)
      return
    }

    // Autofill / paste landed inside a single box: spread it from here.
    const at = Math.min(index, digits.length)
    const next = (digits.slice(0, at) + typed).slice(0, length)
    commit(next)
    focusAt(next.length)
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'Backspace':
        // Take the deletion into our own hands so the compact string stays authoritative —
        // and so the browser doesn't ALSO fire a change event for the same keystroke.
        event.preventDefault()
        if (digits[index]) deleteDigit(index)
        else if (index > 0) deleteDigit(index - 1)
        break
      case 'Delete':
        event.preventDefault()
        if (digits[index]) deleteDigit(index)
        break
      case 'ArrowLeft':
        event.preventDefault()
        focusAt(index - 1)
        break
      case 'ArrowRight':
        event.preventDefault()
        focusAt(Math.min(index + 1, digits.length))
        break
      case 'Home':
        event.preventDefault()
        focusAt(0)
        break
      case 'End':
        event.preventDefault()
        focusAt(digits.length)
        break
    }
  }

  function handlePaste(index: number, event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()

    const pasted = event.clipboardData.getData('text').replace(/\D/g, '')
    if (!pasted) return

    // Pasting a full-length code always replaces the lot, wherever the caret happened to be —
    // that is what someone tapping "paste" on a copied SMS actually means.
    const at = pasted.length >= length ? 0 : Math.min(index, digits.length)
    const next = (digits.slice(0, at) + pasted).slice(0, length)
    commit(next)
    focusAt(next.length)
  }

  /** No gaps, ever: clicking box 5 of an empty field puts you in box 0. */
  function handleFocus(index: number) {
    if (index > digits.length && digits.length < length) focusAt(digits.length)
  }

  return (
    <div
      role="group"
      aria-label={`${length}-digit verification code`}
      aria-describedby={ariaDescribedBy}
      className={cn('flex items-center justify-between gap-1.5 sm:gap-2.5', className)}
    >
      {Array.from({ length }, (_, index) => {
        const digit = digits[index] ?? ''
        const active = index === digits.length

        return (
          <input
            key={index}
            ref={(el) => {
              inputs.current[index] = el
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            // 6 keeps iOS autofill happy — it refuses to offer the SMS code to a maxLength=1 box.
            maxLength={length}
            value={digit}
            disabled={disabled}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={invalid || undefined}
            autoFocus={index === 0}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(index, event)}
            onFocus={() => handleFocus(index)}
            className={cn(
              'h-13 w-full min-w-0 rounded-xl border-2 bg-surface text-center',
              'text-xl font-bold text-ink tabular-nums sm:h-14 sm:text-2xl',
              'transition-[border-color,box-shadow,background-color] duration-150',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/40',
              'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-subtle',
              invalid
                ? 'border-danger bg-danger-soft/40 focus-visible:border-danger focus-visible:ring-danger/30'
                : digit
                  ? 'border-brand-500'
                  : active
                    ? 'border-line-strong'
                    : 'border-line',
            )}
          />
        )
      })}
    </div>
  )
}
