'use client'

import * as React from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Size + colour pills.
 *
 * The picker is CONTROLLED: it derives every option and every availability rule from the variant
 * rows, but the selection itself lives in <BuyBox>, which needs it to resolve the price, the stock
 * and the id it sends to the cart. One source of truth, no syncing effects.
 *
 * AVAILABILITY — two distinct states, and the difference is the whole UX
 * ---------------------------------------------------------------------
 *  * SOLD OUT (disabled, struck through): no variant with this value has stock, in any combination.
 *    There is nothing behind it, so it must not be clickable.
 *  * NOT WITH THAT (dimmed, still clickable): stock exists for this value, but not paired with what
 *    is currently chosen on the other axis. Clicking it snaps the other axis to a partner that IS in
 *    stock.
 *
 * Disabling both axes against each other instead would deadlock: pick Maroon, then M (which only
 * exists in Navy) is disabled — and Navy is disabled too because the current size has no Navy. The
 * shopper can see the combination on the page and cannot reach it. Hence the auto-correct.
 *
 * The consequence is the guarantee <BuyBox> relies on: the resolved variant ALWAYS has stock, unless
 * the product is sold out entirely.
 */

export interface PickerVariant {
  id: string
  size: string | null
  color: string | null
  /** Per-variant override. `null` means "fall back to the product's effective price". */
  price: number | null
  stock: number
}

export interface VariantSelection {
  size: string | null
  color: string | null
}

/** The distinct values on one axis, in the order the DB returned them. Empty = axis not in play. */
export function optionValues(variants: PickerVariant[], axis: 'size' | 'color'): string[] {
  const seen = new Set<string>()
  const out: string[] = []

  for (const variant of variants) {
    const value = variant[axis]
    if (value && !seen.has(value)) {
      seen.add(value)
      out.push(value)
    }
  }

  return out
}

/**
 * The variant a selection points at, or null.
 *
 * An axis with no values (a saree: colour only, free size) is not part of the match — otherwise a
 * `size: null` variant could never be found by a selection carrying `size: null`... which it would,
 * but only by accident. Being explicit keeps colour-only and size-only products honest.
 */
export function resolveVariant(
  variants: PickerVariant[],
  selection: VariantSelection,
): PickerVariant | null {
  if (variants.length === 0) return null

  const sizes = optionValues(variants, 'size')
  const colors = optionValues(variants, 'color')

  return (
    variants.find(
      (variant) =>
        (sizes.length === 0 || variant.size === selection.size) &&
        (colors.length === 0 || variant.color === selection.color),
    ) ?? null
  )
}

/** Open on something a shopper can actually buy: the first in-stock variant, else the first row. */
export function initialSelection(variants: PickerVariant[]): VariantSelection {
  const first = variants.find((variant) => variant.stock > 0) ?? variants[0]
  if (!first) return { size: null, color: null }
  return { size: first.size, color: first.color }
}

/** Real swatches for the colours the catalogue actually stocks; anything else falls back to a pill. */
const SWATCHES: Record<string, string> = {
  maroon: '#7b1d24',
  navy: '#1b2a4a',
  black: '#17181a',
  'off-white': '#f1ece1',
  olive: '#6b7345',
  white: '#ffffff',
  red: '#c0392b',
  blue: '#2563eb',
  green: '#15803d',
  grey: '#6b7280',
  gray: '#6b7280',
  beige: '#e5d8bf',
  pink: '#ec4899',
  yellow: '#eab308',
  brown: '#7c4a2d',
}

function swatchFor(color: string): string | undefined {
  return SWATCHES[color.trim().toLowerCase()]
}

interface OptionPillProps {
  label: string
  selected: boolean
  /** No stock anywhere for this value — dead, not clickable. */
  soldOut: boolean
  /** Stock exists, just not with the current partner. Clickable; the partner will move. */
  unavailable: boolean
  swatch?: string
  onSelect: () => void
}

function OptionPill({ label, selected, soldOut, unavailable, swatch, onSelect }: OptionPillProps) {
  // "Stock exists, just not with the current partner." Signalled THREE ways, never by colour alone:
  // a dashed border (visible to a colourblind shopper), a dimmed-but-still-4.5:1 `text-ink-muted`
  // label, and an sr-only suffix on the accessible name.
  //
  // Deliberately NOT `aria-disabled`: this pill IS operable, and activating it is the whole point —
  // it snaps the other axis to a partner that has stock. Announcing it as disabled would hide the
  // one affordance that gets a screen-reader user to a combination they can see on the page, and
  // would re-create the deadlock the auto-correct exists to avoid.
  const offCombination = unavailable && !soldOut

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={soldOut}
      aria-pressed={selected}
      className={cn(
        // min-w-11 guarded the width; nothing guarded the height, so `py-2` + text-sm + border came
        // out at 38px. Both axes now clear the 44px touch target.
        'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5',
        'rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-150',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        selected
          ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
          : 'border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-muted',
        !selected && offCombination && 'border-dashed border-line-strong text-ink-muted',
        soldOut && 'cursor-not-allowed border-line bg-surface-muted text-ink-subtle line-through',
      )}
    >
      {swatch ? (
        <span
          aria-hidden="true"
          className="size-3.5 shrink-0 rounded-full border border-black/10"
          style={{ backgroundColor: swatch }}
        />
      ) : null}
      <span>{label}</span>
      {selected ? <Check className="size-3.5 shrink-0" aria-hidden="true" /> : null}

      {soldOut ? <span className="sr-only">, sold out</span> : null}
      {offCombination ? (
        <span className="sr-only">, not available with your current selection</span>
      ) : null}
    </button>
  )
}

export interface VariantPickerProps {
  variants: PickerVariant[]
  selection: VariantSelection
  onChange: (next: VariantSelection) => void
  className?: string
}

export function VariantPicker({ variants, selection, onChange, className }: VariantPickerProps) {
  const sizes = optionValues(variants, 'size')
  const colors = optionValues(variants, 'color')

  // A product with no variants (most beauty/home items) renders no picker at all.
  if (sizes.length === 0 && colors.length === 0) return null

  const sizeHasStock = (size: string) =>
    variants.some((variant) => variant.size === size && variant.stock > 0)

  const colorHasStock = (color: string) =>
    variants.some((variant) => variant.color === color && variant.stock > 0)

  const sizeWorksWithSelection = (size: string) =>
    colors.length === 0
      ? sizeHasStock(size)
      : variants.some(
          (variant) =>
            variant.size === size && variant.color === selection.color && variant.stock > 0,
        )

  const colorWorksWithSelection = (color: string) =>
    sizes.length === 0
      ? colorHasStock(color)
      : variants.some(
          (variant) =>
            variant.color === color && variant.size === selection.size && variant.stock > 0,
        )

  function selectSize(size: string) {
    if (colors.length === 0) {
      onChange({ size, color: null })
      return
    }

    // Keep the chosen colour when it still has stock in this size; otherwise snap to one that does.
    if (sizeWorksWithSelection(size)) {
      onChange({ size, color: selection.color })
      return
    }

    const partner = variants.find((variant) => variant.size === size && variant.stock > 0)
    onChange({ size, color: partner?.color ?? selection.color })
  }

  function selectColor(color: string) {
    if (sizes.length === 0) {
      onChange({ size: null, color })
      return
    }

    if (colorWorksWithSelection(color)) {
      onChange({ size: selection.size, color })
      return
    }

    const partner = variants.find((variant) => variant.color === color && variant.stock > 0)
    onChange({ size: partner?.size ?? selection.size, color })
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {sizes.length > 0 ? (
        <div>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-ink">Size</span>
            {selection.size ? (
              <span className="text-sm text-ink-muted">{selection.size}</span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <OptionPill
                key={size}
                label={size}
                selected={selection.size === size}
                soldOut={!sizeHasStock(size)}
                unavailable={!sizeWorksWithSelection(size)}
                onSelect={() => selectSize(size)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {colors.length > 0 ? (
        <div>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-ink">Colour</span>
            {selection.color ? (
              <span className="text-sm text-ink-muted">{selection.color}</span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <OptionPill
                key={color}
                label={color}
                selected={selection.color === color}
                soldOut={!colorHasStock(color)}
                unavailable={!colorWorksWithSelection(color)}
                swatch={swatchFor(color)}
                onSelect={() => selectColor(color)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
