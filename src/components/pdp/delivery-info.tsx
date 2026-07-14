import { Banknote, RotateCcw, ShieldCheck, Truck } from 'lucide-react'

import { formatBDT } from '@/lib/format'
import { DELIVERY_FEE_INSIDE_DHAKA, DELIVERY_FEE_OUTSIDE_DHAKA } from '@/lib/pricing'
import { cn } from '@/lib/utils'

/**
 * The trust block: delivery, returns, payment.
 *
 * The two fees are imported from '@/lib/pricing' rather than typed out, so the promise made on the
 * product page and the number charged at checkout are the same constant. A hard-coded "৳60" here is
 * exactly how a storefront ends up lying to its customers after someone tweaks the fee.
 */

export interface DeliveryInfoProps {
  className?: string
}

const ROWS = [
  {
    icon: Truck,
    title: 'Delivery within 48 hours in Dhaka',
    body: `${formatBDT(DELIVERY_FEE_INSIDE_DHAKA)} inside Dhaka · ${formatBDT(
      DELIVERY_FEE_OUTSIDE_DHAKA,
    )} outside Dhaka (3–5 days)`,
  },
  {
    icon: RotateCcw,
    title: '7-day easy return',
    body: 'Changed your mind, or the size is off? Return it within 7 days of delivery.',
  },
  {
    icon: Banknote,
    title: 'Cash on Delivery available',
    body: 'Pay the rider in cash — or use bKash, Nagad or a card at checkout.',
  },
  {
    icon: ShieldCheck,
    title: '100% authentic products',
    body: 'Every seller is verified with a trade licence and NID before they can list.',
  },
] as const

export function DeliveryInfo({ className }: DeliveryInfoProps) {
  return (
    <section
      aria-label="Delivery and returns"
      className={cn('rounded-card border border-line bg-surface-muted p-4 sm:p-5', className)}
    >
      <ul className="flex flex-col gap-4">
        {ROWS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-brand-600 shadow-xs">
              <Icon className="size-4.5" aria-hidden="true" />
            </span>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
