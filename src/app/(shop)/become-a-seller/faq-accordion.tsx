import { Plus } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface FaqItem {
  question: string
  answer: string
}

/**
 * The FAQ accordion.
 *
 * Built on native `<details>`/`<summary>` — which means it opens, closes, is keyboard operable and
 * is announced correctly by a screen reader with **zero** JavaScript. A merchant on a ৳8,000 Android
 * phone over 3G gets a working accordion before React has finished downloading. There is no
 * interactivity here that the platform does not already give us for free, so this stays a Server
 * Component.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {items.map((item) => (
        <details key={item.question} className="group">
          <summary
            className={cn(
              'flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-5',
              'text-left text-sm font-semibold text-ink transition-colors select-none',
              'hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-hidden',
              // Safari still paints the default disclosure triangle without this.
              '[&::-webkit-details-marker]:hidden',
            )}
          >
            <span className="min-w-0">{item.question}</span>
            <span
              aria-hidden="true"
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-muted',
                'transition-transform duration-200 group-open:rotate-45 group-open:bg-brand-50 group-open:text-brand-600',
                'motion-reduce:transition-none',
              )}
            >
              <Plus className="size-4" />
            </span>
          </summary>

          <div className="px-4 pb-4 sm:px-5">
            <p className="max-w-[62ch] text-sm leading-6 text-ink-muted">{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  )
}
