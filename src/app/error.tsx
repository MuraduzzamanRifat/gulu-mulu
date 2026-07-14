'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Home, RefreshCw, Search, ShoppingBag, TriangleAlert } from 'lucide-react'

import { Wordmark } from '@/components/layout/site-header'
import { Button, buttonVariants, Input } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * The app-wide error boundary.
 *
 * Error boundaries must be Client Components — React needs a `componentDidCatch` on the client to
 * swap in a fallback — so there is no DB access here and every link is static. That is a feature:
 * this page has to render when the database is exactly what fell over.
 *
 * `reset()` re-renders the boundary's children, which is the right first move for the errors a
 * marketplace actually throws (a dropped connection, a timed-out query). The search box is the
 * second move, and it is a plain GET form — it works even if the React bundle behind it is broken.
 *
 * `error.digest` is the hash Next logs on the server. In production the real message never reaches
 * the browser, so the digest is the only thread a support agent can pull — which is why it is on
 * screen rather than only in the console.
 */
export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // The server has already logged this; this line is what makes it visible in the browser console
    // for a developer reproducing the failure locally.
    console.error('Storefront error:', error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4">
          <Wordmark />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-xl text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-danger-soft text-danger">
            <TriangleAlert className="size-8" aria-hidden="true" />
          </span>

          <p className="mt-6 text-sm font-bold tracking-widest text-danger uppercase">
            Something broke
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-balance text-ink sm:text-4xl">
            That&apos;s on us, not on you
          </h1>

          <p className="mx-auto mt-3 max-w-md text-base text-pretty text-ink-muted">
            An unexpected error stopped this page from loading. Nothing has been charged and nothing
            has been lost — your cart and your orders are exactly where you left them.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={reset} className="sm:w-auto">
              <RefreshCw className="size-5" aria-hidden="true" />
              Try again
            </Button>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'sm:w-auto')}
            >
              <Home className="size-5" aria-hidden="true" />
              Back to home
            </Link>
          </div>

          {/* Static, JS-free escape hatch: even a broken bundle can submit a GET form. */}
          <form
            action="/products/search"
            method="get"
            role="search"
            className="mt-10 flex flex-col gap-2 sm:flex-row"
          >
            <label htmlFor="error-search" className="sr-only">
              Search products
            </label>
            <Input
              id="error-search"
              name="search"
              type="search"
              icon={Search}
              autoComplete="off"
              placeholder="Search for products, brands and more…"
              containerClassName="flex-1"
              className="h-12 rounded-full bg-surface-muted pl-9 focus-visible:bg-surface"
            />
            <Button type="submit" variant="secondary" size="lg" className="shrink-0 rounded-full px-8">
              Search
            </Button>
          </form>

          <p className="mt-6 text-sm text-ink-subtle">
            Or{' '}
            <Link
              href="/products/search"
              className="inline-flex items-center gap-1 font-semibold text-brand-600 transition-colors hover:text-brand-700"
            >
              <ShoppingBag className="size-3.5" aria-hidden="true" />
              browse every product
            </Link>
          </p>

          {error.digest ? (
            <p className="mt-8 text-xs text-ink-subtle">
              Quote this reference to support:{' '}
              <code className="rounded-md bg-surface-sunken px-1.5 py-0.5 font-mono text-ink-muted">
                {error.digest}
              </code>
            </p>
          ) : null}
        </div>
      </main>
    </div>
  )
}
