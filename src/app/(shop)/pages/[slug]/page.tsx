import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, Headset, MessageCircleQuestion } from 'lucide-react'

import { buttonVariants, Card } from '@/components/ui'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

import { getPublishedPage, getPublishedPages, groupByAudience } from '../_queries'
import { Markdown, markdownExcerpt } from './markdown'

interface PolicyPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PolicyPageProps): Promise<Metadata> {
  const { slug } = await params
  const page = await getPublishedPage(slug)

  if (!page) {
    return { title: 'Page not found', robots: { index: false, follow: false } }
  }

  const description = markdownExcerpt(page.content)

  return {
    title: page.title,
    description,
    alternates: { canonical: `/pages/${page.slug}` },
    openGraph: {
      type: 'article',
      title: `${page.title} | Gulu Mulu`,
      description,
      url: `/pages/${page.slug}`,
      modifiedTime: page.updatedAt.toISOString(),
    },
  }
}

/** The sidebar index — every other policy, one tap away, without leaving the page you're reading. */
function PolicyNav({
  heading,
  pages,
  currentSlug,
}: {
  heading: string
  pages: { slug: string; title: string }[]
  currentSlug: string
}) {
  if (pages.length === 0) return null

  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-ink-subtle uppercase">
        {heading}
      </h2>
      <ul className="space-y-0.5">
        {pages.map((page) => {
          const isCurrent = page.slug === currentSlug
          return (
            <li key={page.slug}>
              <Link
                href={`/pages/${page.slug}`}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  'block rounded-lg px-3 py-2 text-sm transition-colors',
                  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                  isCurrent
                    ? 'bg-brand-50 font-semibold text-brand-700'
                    : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                )}
              >
                {page.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default async function PolicyPage({ params }: PolicyPageProps) {
  const { slug } = await params

  const [page, allPages] = await Promise.all([getPublishedPage(slug), getPublishedPages()])

  // Missing, or pulled from publication by an admin. Either way it does not exist to a shopper.
  if (!page) notFound()

  const grouped = groupByAudience(allPages)

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:py-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-5">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
          <li>
            <Link href="/" className="transition-colors hover:text-brand-600">
              Home
            </Link>
          </li>
          <ChevronRight className="size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
          <li>
            <Link href="/pages" className="transition-colors hover:text-brand-600">
              Policies
            </Link>
          </li>
          <ChevronRight className="size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
          <li aria-current="page" className="min-w-0 truncate font-medium text-ink">
            {page.title}
          </li>
        </ol>
      </nav>

      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
        {/* Sidebar — desktop only; on mobile the full index sits at the foot of the page. */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <PolicyNav heading="For shoppers" pages={grouped.customer} currentSlug={page.slug} />
            <PolicyNav heading="For sellers" pages={grouped.seller} currentSlug={page.slug} />
          </div>
        </aside>

        <article className="min-w-0">
          <header className="border-b border-line pb-6">
            <h1 className="text-2xl font-bold tracking-tight text-balance text-ink sm:text-3xl">
              {page.title}
            </h1>

            <p className="mt-3 text-sm text-ink-subtle">
              Last updated{' '}
              <time dateTime={page.updatedAt.toISOString()}>{formatDate(page.updatedAt)}</time>
            </p>
          </header>

          {/* The measure: ~68 characters. Longer lines are what make policy pages unreadable. */}
          <div className="max-w-[68ch] pt-2 text-base">
            <Markdown source={page.content} />
          </div>

          {/* Support card — a policy page is where a confused customer lands, so give them an exit. */}
          <Card className="mt-10 max-w-[68ch] bg-surface-muted p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Headset className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-ink">Still need a hand?</h2>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    Our team answers 9am–9pm, seven days a week.
                  </p>
                </div>
              </div>
              <a
                href="mailto:support@gulumulu.com.bd"
                className={cn(buttonVariants({ variant: 'outline', size: 'md' }), 'shrink-0')}
              >
                Contact support
              </a>
            </div>
          </Card>

          {/* Mobile index of the other policies. */}
          <section className="mt-10 lg:hidden">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
              <MessageCircleQuestion className="size-4 text-ink-subtle" aria-hidden="true" />
              Other policies
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {allPages
                .filter((other) => other.slug !== page.slug)
                .map((other) => (
                  <Link
                    key={other.slug}
                    href={`/pages/${other.slug}`}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-card border border-line bg-surface px-4 py-3',
                      'text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-surface-muted',
                      'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                    )}
                  >
                    <span className="min-w-0 truncate">{other.title}</span>
                    <ChevronRight
                      className="size-4 shrink-0 text-ink-subtle"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
            </div>
          </section>
        </article>
      </div>
    </div>
  )
}
