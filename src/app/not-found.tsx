import Link from 'next/link'
import { ArrowRight, Compass, Home, PackageSearch, Search, ShoppingBag } from 'lucide-react'

import { Wordmark } from '@/components/layout/site-header'
import { Button, buttonVariants, Input } from '@/components/ui'
import { getFeaturedCategories } from '@/lib/queries'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
}

/**
 * The global 404.
 *
 * Next renders the root `not-found` inside the ROOT layout, not inside the storefront shell — so it
 * gets no SiteHeader and no footer, and has to carry its own way home. Everything on this page is a
 * route out: the wordmark, the search box, the real featured categories, and the two buttons.
 *
 * The search box is a plain GET form pointed at the same endpoint the header uses. A shopper who
 * hits a dead product URL is nearly always one search away from what they wanted, and they should
 * not need JavaScript to run it.
 */
export default async function NotFound() {
  const categories = await getFeaturedCategories()

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4">
          <Wordmark />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-xl text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <PackageSearch className="size-8" aria-hidden="true" />
          </span>

          <p className="mt-6 text-sm font-bold tracking-widest text-brand-600 uppercase">
            Error 404
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-balance text-ink sm:text-4xl">
            This shelf is empty
          </h1>

          <p className="mx-auto mt-3 max-w-md text-base text-pretty text-ink-muted">
            The page you were looking for has moved, sold out, or never existed. Nothing is broken —
            let&apos;s get you back to the shopping.
          </p>

          {/* Search — the fastest route from a dead URL to a live product. */}
          <form
            action="/products/search"
            method="get"
            role="search"
            className="mt-8 flex flex-col gap-2 sm:flex-row"
          >
            <label htmlFor="notfound-search" className="sr-only">
              Search products
            </label>
            <Input
              id="notfound-search"
              name="search"
              type="search"
              icon={Search}
              autoComplete="off"
              placeholder="Search for products, brands and more…"
              containerClassName="flex-1"
              className="h-12 rounded-full bg-surface-muted pl-9 focus-visible:bg-surface"
            />
            <Button type="submit" size="lg" className="shrink-0 rounded-full px-8">
              Search
            </Button>
          </form>

          {/* Real categories, not invented ones. */}
          {categories.length > 0 ? (
            <div className="mt-8">
              <p className="flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wide text-ink-subtle uppercase">
                <Compass className="size-3.5" aria-hidden="true" />
                Or jump straight in
              </p>
              <ul className="mt-3 flex flex-wrap justify-center gap-2">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/category/${category.slug}`}
                      className={cn(
                        'inline-flex items-center rounded-full border border-line bg-surface px-3.5 py-1.5',
                        'text-sm font-medium text-ink-muted transition-colors',
                        'hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700',
                        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                      )}
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/" className={cn(buttonVariants({ variant: 'primary', size: 'lg' }))}>
              <Home className="size-5" aria-hidden="true" />
              Back to home
            </Link>
            <Link
              href="/products/search"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
            >
              <ShoppingBag className="size-5" aria-hidden="true" />
              Browse all products
            </Link>
          </div>

          <p className="mt-8 text-sm text-ink-subtle">
            Looking for a policy?{' '}
            <Link
              href="/pages"
              className="inline-flex items-center gap-0.5 font-semibold text-brand-600 transition-colors hover:text-brand-700"
            >
              Read them all
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
