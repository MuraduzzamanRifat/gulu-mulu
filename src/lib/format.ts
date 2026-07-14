import type { Product, ProductImage } from '@/generated/prisma/client'

/**
 * Money in this app is ALWAYS an integer number of whole Bangladeshi Taka.
 * No floats, no paisa. `formatBDT(1299)` -> "৳1,299".
 */
export function formatBDT(taka: number): string {
  return `৳${Math.round(taka).toLocaleString('en-US')}`
}

/** What the customer actually pays: the discount price when it genuinely undercuts price. */
export function effectivePrice(p: Pick<Product, 'price' | 'discountPrice'>): number {
  return p.discountPrice != null && p.discountPrice < p.price ? p.discountPrice : p.price
}

/** Whether this product is actually on offer (guards against a bogus discountPrice >= price). */
export function isDiscounted(p: Pick<Product, 'price' | 'discountPrice'>): boolean {
  return p.discountPrice != null && p.discountPrice < p.price
}

/** Rounded whole-percent saving, e.g. 40 for "40% OFF". Returns 0 when not discounted. */
export function discountPercent(p: Pick<Product, 'price' | 'discountPrice'>): number {
  if (!isDiscounted(p) || p.price <= 0) return 0
  return Math.round(((p.price - p.discountPrice!) / p.price) * 100)
}

/** First image by display order, with a graceful fallback so cards never render broken. */
export function primaryImage(images: Pick<ProductImage, 'url' | 'displayOrder'>[]): string {
  if (!images.length) return PLACEHOLDER_IMAGE
  return [...images].sort((a, b) => a.displayOrder - b.displayOrder)[0].url
}

export const PLACEHOLDER_IMAGE = '/placeholder-product.svg'

/** "M / Maroon" from a variant's size + colour. */
export function variantLabel(v: { size?: string | null; color?: string | null }): string | null {
  const parts = [v.size, v.color].filter(Boolean)
  return parts.length ? parts.join(' / ') : null
}

/** GM-4F2A9C — short, human-quotable over the phone (BD support is phone-heavy). */
export function generateOrderNumber(): string {
  const alphabet = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ' // no I/O, avoids read-back confusion
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `GM-${out}`
}

/** Normalise a BD mobile number to the canonical 01XXXXXXXXX form. */
export function normalizeBdPhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.startsWith('880')) return `0${digits.slice(3)}`
  if (digits.startsWith('1') && digits.length === 10) return `0${digits}`
  return digits
}

/** Valid BD mobile: 11 digits, 01[3-9]XXXXXXXX. */
export function isValidBdPhone(input: string): boolean {
  return /^01[3-9]\d{8}$/.test(normalizeBdPhone(input))
}

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
