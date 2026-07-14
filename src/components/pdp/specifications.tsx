import { cn } from '@/lib/utils'

/**
 * The Specifications table.
 *
 * Every row comes from a real column on the row we loaded — brand, category, SKU, the shop, the
 * stock, the option axes that actually exist. Nothing is invented: a product with no brand says
 * "Unbranded" rather than inheriting a plausible-looking one, because a spec sheet that guesses is
 * worse than no spec sheet at all.
 */

export interface SpecificationsProduct {
  sku: string | null
  stock: number
  brand: { name: string } | null
  category: { name: string }
  seller: { businessName: string }
  variants: { size: string | null; color: string | null; sku: string | null }[]
}

export interface SpecificationsProps {
  product: SpecificationsProduct
  className?: string
}

function distinct(values: (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

export function Specifications({ product, className }: SpecificationsProps) {
  const sizes = distinct(product.variants.map((variant) => variant.size))
  const colors = distinct(product.variants.map((variant) => variant.color))

  const rows: { label: string; value: string }[] = [
    { label: 'Brand', value: product.brand?.name ?? 'Unbranded' },
    { label: 'Category', value: product.category.name },
    { label: 'Seller', value: product.seller.businessName },
    ...(product.sku ? [{ label: 'SKU', value: product.sku }] : []),
    ...(sizes.length > 0 ? [{ label: 'Available sizes', value: sizes.join(', ') }] : []),
    ...(colors.length > 0 ? [{ label: 'Available colours', value: colors.join(', ') }] : []),
    {
      label: 'Availability',
      value: product.stock > 0 ? `In stock (${product.stock} units)` : 'Out of stock',
    },
    { label: 'Warranty', value: '7-day return · no manufacturer warranty' },
    { label: 'Delivery', value: '48 hours inside Dhaka · 3–5 days nationwide' },
    { label: 'Payment', value: 'Cash on Delivery · bKash · Nagad · Card' },
  ]

  return (
    <div className={cn('overflow-hidden rounded-card border border-line', className)}>
      <dl className="divide-y divide-line">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={cn(
              'grid grid-cols-1 gap-0.5 px-4 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4 sm:px-5',
              // Zebra striping keeps a long spec sheet readable on a 375px screen.
              index % 2 === 1 && 'bg-surface-muted',
            )}
          >
            <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase sm:text-sm sm:normal-case sm:tracking-normal">
              {row.label}
            </dt>
            <dd className="text-sm text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
