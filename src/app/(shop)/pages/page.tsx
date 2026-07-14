import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Ban,
  ChevronRight,
  FileText,
  Info,
  PackageCheck,
  PackageOpen,
  Repeat,
  RotateCcw,
  Scale,
  ShieldCheck,
  Store,
  Truck,
  Undo2,
  type LucideIcon,
} from 'lucide-react'

import type { Page } from '@/generated/prisma/client'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

import { getPublishedPages, groupByAudience } from './_queries'
import { markdownExcerpt } from './[slug]/markdown'

export const metadata: Metadata = {
  title: 'Policies & Help',
  description:
    'Every Gulu Mulu policy in one place — returns, refunds, exchanges, delivery, cancellation, ' +
    'privacy and the rules our sellers agree to.',
  alternates: { canonical: '/pages' },
}

/** A face for each policy. Anything an admin adds later falls back to the document glyph. */
const PAGE_ICONS: Record<string, LucideIcon> = {
  'about-us': Info,
  'return-refund-policy': Undo2,
  'exchange-policy': Repeat,
  'shipping-delivery-policy': Truck,
  'cancellation-policy': Ban,
  'privacy-policy': ShieldCheck,
  'terms-conditions': Scale,
  'seller-policy': Store,
  'product-policy': PackageCheck,
  'pickup-delivery-policy': PackageOpen,
  'seller-exchange-return-policy': RotateCcw,
}

function PolicyCard({ page }: { page: Page }) {
  const Icon = PAGE_ICONS[page.slug] ?? FileText

  return (
    <Link
      href={`/pages/${page.slug}`}
      className={cn(
        'group flex flex-col rounded-card border border-line bg-surface p-4 sm:p-5',
        'transition-shadow duration-200 hover:border-line-strong hover:shadow-md',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
      )}
    >
      <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
        <Icon className="size-5" aria-hidden="true" />
      </span>

      <h3 className="text-base font-semibold tracking-tight text-ink">{page.title}</h3>

      {page.titleBn ? (
        <p className="mt-0.5 text-sm text-ink-subtle" lang="bn">
          {page.titleBn}
        </p>
      ) : null}

      <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-muted">
        {markdownExcerpt(page.content, 130)}
      </p>

      <span className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-subtle">
        <span>Updated {formatDate(page.updatedAt)}</span>
        <span className="inline-flex items-center gap-0.5 font-semibold text-brand-600">
          Read
          <ChevronRight
            className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            aria-hidden="true"
          />
        </span>
      </span>
    </Link>
  )
}

function PolicySection({
  id,
  title,
  description,
  pages,
}: {
  id: string
  title: string
  description: string
  pages: Page[]
}) {
  if (pages.length === 0) return null

  return (
    <section aria-labelledby={id} className="mt-10 first:mt-0">
      <div className="mb-4">
        <h2
          id={id}
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink sm:text-xl"
        >
          <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-brand-500" />
          {title}
        </h2>
        <p className="mt-1 pl-3 text-sm text-ink-muted">{description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => (
          <PolicyCard key={page.id} page={page} />
        ))}
      </div>
    </section>
  )
}

/**
 * The index of every published CMS page, split by who it is written for. Nothing here is hardcoded
 * copy — pull a page from publication in the admin and it disappears from this grid, from the
 * sitemap, and from its own URL.
 */
export default async function PoliciesIndexPage() {
  const pages = await getPublishedPages()
  const grouped = groupByAudience(pages)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-bold tracking-tight text-balance text-ink sm:text-3xl">
          Policies &amp; Help
        </h1>
        <p className="mt-3 text-base text-pretty text-ink-muted">
          Everything Gulu Mulu promises you — and everything our sellers promise us — written down
          in plain language. No small print.
        </p>
      </header>

      <div className="mt-8 sm:mt-12">
        <PolicySection
          id="for-shoppers"
          title="For shoppers"
          description="Your rights when you buy on Gulu Mulu: returns, delivery, cancellations and your data."
          pages={grouped.customer}
        />

        <PolicySection
          id="for-sellers"
          title="For sellers"
          description="The rules every shop on the marketplace agrees to before its first listing goes live."
          pages={grouped.seller}
        />
      </div>

      <div className="mt-12 rounded-card border border-line bg-surface-muted px-5 py-6 text-center sm:py-8">
        <h2 className="text-base font-semibold text-ink sm:text-lg">
          Thinking of selling on Gulu Mulu?
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-pretty text-ink-muted">
          Read the seller policies, then open your shop. Approval takes three working days and there
          is no listing fee.
        </p>
        <Link
          href="/become-a-seller"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg px-2 py-1"
        >
          Become a seller
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
