'use client'

import * as React from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button, Input } from '@/components/ui'
import { cn } from '@/lib/utils'

import { formatRate } from '../_lib/rate'
import { setCommissionRate } from './_actions'

export interface CommissionDialProps {
  sellerId: string
  businessName: string
  /** The stored FRACTION (0.12), not the percentage. */
  rate: number
  className?: string
}

/**
 * The marketplace's revenue dial, edited in place.
 *
 * Deliberately a two-step (click to open, then Save) rather than a live-committing input: this
 * single number decides what every future order from this shop pays Gulu Mulu, and a control that
 * writes on every keystroke would briefly set the rate to `1` on the way from 12 to 125.
 *
 * The stored value is a FRACTION; the admin types a PERCENTAGE. The conversion happens once, on the
 * server, in `setCommissionRate` — never here.
 */
export function CommissionDial({ sellerId, businessName, rate, className }: CommissionDialProps) {
  const [editing, setEditing] = React.useState(false)
  const [value, setValue] = React.useState(() => String(Math.round(rate * 10_000) / 100))
  const [pending, startTransition] = React.useTransition()
  const inputRef = React.useRef<HTMLInputElement>(null)

  function open() {
    setValue(String(Math.round(rate * 10_000) / 100))
    setEditing(true)
    // The field is rendered by this same commit, so focus on the next frame.
    requestAnimationFrame(() => inputRef.current?.select())
  }

  function save() {
    const percent = Number(value.trim())

    // Caught here as well as in Zod, purely so the admin gets the message without a round trip.
    if (value.trim() === '' || !Number.isFinite(percent)) {
      toast.error('Enter the commission as a percentage, e.g. 12.5.')
      return
    }

    startTransition(async () => {
      const result = await setCommissionRate(sellerId, percent)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(
        `${businessName} now pays ${formatRate(result.data.commissionRate)} commission on new orders.`,
      )
      setEditing(false)
    })
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={open}
        aria-label={`Change commission for ${businessName}, currently ${formatRate(rate)}`}
        className={cn(
          'group inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5',
          'text-sm font-semibold text-ink tabular-nums transition-colors',
          'hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
          className,
        )}
      >
        {formatRate(rate)}
        <Pencil
          className="size-3.5 text-ink-subtle transition-colors group-hover:text-brand-600"
          aria-hidden="true"
        />
      </button>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label htmlFor={`commission-${sellerId}`} className="sr-only">
        Commission percentage for {businessName}
      </label>
      <Input
        ref={inputRef}
        id={`commission-${sellerId}`}
        type="number"
        inputMode="decimal"
        min={0}
        max={50}
        step={0.5}
        value={value}
        disabled={pending}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            save()
          }
          if (event.key === 'Escape') setEditing(false)
        }}
        trailing={<span className="text-xs font-medium">%</span>}
        className="w-24 tabular-nums"
      />

      {/* size="icon" is already 44px — do not shrink it back below the touch-target minimum. */}
      <Button
        size="icon"
        variant="primary"
        onClick={save}
        loading={pending}
        aria-label="Save commission"
      >
        <Check aria-hidden="true" />
      </Button>

      <Button
        size="icon"
        variant="ghost"
        onClick={() => setEditing(false)}
        disabled={pending}
        aria-label="Cancel"
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}
