'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, LayoutDashboard, Menu, Package, Store, UserRound } from 'lucide-react'

import { Sheet } from '@/components/ui'
import { cn } from '@/lib/utils'
import { signOutAction } from './auth-actions'
import type { AccountMenuUser } from './account-menu'
import type { CategoryNode } from './shell-data'
import { SignOutButton } from './sign-out-button'

export interface MobileMenuProps {
  categories: CategoryNode[]
  user: AccountMenuUser | null
}

// min-h-11: every row in the sheet is a thumb target, and this sheet exists only on touch.
const linkClass = cn(
  'flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-ink',
  'transition-colors hover:bg-surface-sunken active:bg-surface-sunken',
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
  '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-muted',
)

/** The category rows inside an open <details>. Same 44px floor, quieter type. */
const subLinkClass = cn(
  'flex min-h-11 w-full items-center rounded-lg px-2 py-2 text-sm transition-colors',
  'hover:bg-surface-sunken',
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
)

/**
 * The mobile counterpart of the mega-menu: a hamburger that opens the shared <Sheet>.
 * Each top-level category is a native <details>, so the accordion needs no state and
 * stays keyboard-operable for free.
 */
export function MobileMenu({ categories, user }: MobileMenuProps) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const [lastPathname, setLastPathname] = React.useState(pathname)

  // Any navigation from inside the sheet must dismiss it. Adjusted during render — an
  // effect here would close the sheet one render too late.
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className={cn(
          'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink md:hidden',
          'transition-colors hover:bg-surface-sunken',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
        )}
      >
        <Menu className="size-6" aria-hidden="true" />
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        side="left"
        title={user ? (user.name ?? 'My account') : 'Menu'}
        description={user ? user.phone : 'Shop every category'}
      >
        {user ? (
          <div className="mb-4 space-y-0.5 border-b border-line pb-4">
            <Link href="/account" className={linkClass}>
              <UserRound aria-hidden="true" />
              My account
            </Link>
            <Link href="/account/orders" className={linkClass}>
              <Package aria-hidden="true" />
              My orders
            </Link>
            {user.role === 'SELLER' || user.role === 'ADMIN' ? (
              <Link href="/seller" className={linkClass}>
                <Store aria-hidden="true" />
                Seller centre
              </Link>
            ) : null}
            {user.role === 'ADMIN' ? (
              <Link href="/admin" className={linkClass}>
                <LayoutDashboard aria-hidden="true" />
                Admin dashboard
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="mb-4 border-b border-line pb-4">
            <Link
              href="/login"
              className={cn(
                'flex h-11 w-full items-center justify-center rounded-lg bg-brand-500 text-sm font-semibold text-white',
                'transition-colors hover:bg-brand-600 active:bg-brand-700',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
              )}
            >
              Sign in
            </Link>
            <p className="mt-2 text-center text-xs text-ink-muted">
              Track orders, save favourites and check out faster.
            </p>
          </div>
        )}

        <p className="px-2 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
          Categories
        </p>

        <nav aria-label="Categories">
          <ul className="space-y-0.5">
            {categories.map((parent) => (
              <li key={parent.id}>
                {parent.children.length === 0 ? (
                  <Link href={`/category/${parent.slug}`} className={linkClass}>
                    {parent.name}
                  </Link>
                ) : (
                  <details className="group">
                    <summary
                      className={cn(
                        'flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 py-2',
                        'text-sm font-medium text-ink transition-colors hover:bg-surface-sunken',
                        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                        '[&::-webkit-details-marker]:hidden',
                      )}
                    >
                      {parent.name}
                      <ChevronDown
                        className="size-4 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>

                    <ul className="mt-0.5 mb-1 ml-2 space-y-0.5 border-l border-line pl-3">
                      <li>
                        <Link
                          href={`/category/${parent.slug}`}
                          className={cn(subLinkClass, 'font-medium text-brand-600')}
                        >
                          All {parent.name}
                        </Link>
                      </li>
                      {parent.children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={`/category/${child.slug}`}
                            className={cn(subLinkClass, 'text-ink-muted hover:text-ink')}
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {user ? (
          <form action={signOutAction} className="mt-4 border-t border-line pt-4">
            <SignOutButton
              className={cn(linkClass, 'text-danger [&_svg]:text-danger hover:bg-danger-soft')}
            />
          </form>
        ) : null}
      </Sheet>
    </>
  )
}
