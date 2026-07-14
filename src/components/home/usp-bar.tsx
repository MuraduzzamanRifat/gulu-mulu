import { BadgePercent, Clock, Truck, Undo2 } from 'lucide-react'

const USPS = [
  {
    icon: Truck,
    title: 'Cash on Delivery',
    description: 'Open the parcel, check it, then pay. All 64 districts.',
  },
  {
    icon: Undo2,
    title: 'Instant Return',
    description: 'Not right? Our rider collects it back from your door.',
  },
  {
    icon: Clock,
    title: 'Delivery Within 48hrs',
    description: 'Inside Dhaka in 48 hours, nationwide in 3–5 days.',
  },
  {
    icon: BadgePercent,
    title: 'Best Price Deal',
    description: 'Sellers compete on every listing, so you never overpay.',
  },
] as const

/**
 * The trust row. On a COD-first market these four promises are the whole reason a first-time
 * shopper is willing to press "Order" — so they get real estate on the homepage, not just the
 * thin desktop strip in the header.
 *
 * The `gap-px` over a `bg-line` parent draws the hairline dividers, so there are no border
 * doubling-up seams at the grid's edges.
 */
export function UspBar() {
  return (
    <section
      aria-label="Why shop with Gulu Mulu"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-4"
    >
      {USPS.map(({ icon: Icon, title, description }) => (
        <div
          key={title}
          className="flex flex-col items-center gap-2 bg-surface p-4 text-center sm:flex-row sm:items-start sm:gap-3 sm:p-5 sm:text-left"
        >
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"
          >
            <Icon className="size-5" />
          </span>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{description}</p>
          </div>
        </div>
      ))}
    </section>
  )
}
