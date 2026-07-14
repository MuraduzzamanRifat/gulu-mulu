'use client'

import * as React from 'react'
import { Apple, Play, Smartphone, X } from 'lucide-react'

import { cn } from '@/lib/utils'

const STORAGE_KEY = 'gm:app-banner-dismissed'

const STORES = [
  {
    href: 'https://play.google.com/store/apps',
    icon: Play,
    eyebrow: 'Get it on',
    name: 'Google Play',
  },
  {
    href: 'https://www.apple.com/app-store/',
    icon: Apple,
    eyebrow: 'Download on the',
    name: 'App Store',
  },
] as const

/* -------------------------------------------------------------------------- */
/* The dismissal, as an external store                                        */
/* -------------------------------------------------------------------------- */
/*
 * localStorage IS an external store, so it is read with `useSyncExternalStore` rather than an
 * effect that calls setState (which the React Compiler rightly rejects — it is a cascading render).
 *
 * `getServerSnapshot` reports "dismissed" so the strip is absent from the HTML: the server cannot
 * know what this browser chose, and rendering it optimistically would flash it back in the face of
 * everyone who has already closed it. React swaps in the real client snapshot right after
 * hydration, so a first-time visitor still sees it — below the fold-defining hero, where a
 * one-frame late arrival costs nothing.
 */

const listeners = new Set<() => void>()

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  // The `storage` event fires in the OTHER tabs — dismiss it in one, it goes in all of them.
  window.addEventListener('storage', onStoreChange)

  return () => {
    listeners.delete(onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

/** A primitive, so React's snapshot identity check is stable across renders. */
function getSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // Private mode / storage blocked: fail open and show the strip. A banner is not worth an error.
    return false
  }
}

function getServerSnapshot(): boolean {
  return true
}

function dismissForever() {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // Nothing to do — it just reappears next visit.
  }
  for (const listener of listeners) listener()
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

/** The "Get the Gulu Mulu app" strip. Dismissible, and the dismissal sticks. */
export function AppDownloadBanner() {
  const dismissed = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  if (dismissed) return null

  return (
    <aside
      aria-label="Download the Gulu Mulu app"
      className="border-b border-line bg-linear-to-r from-brand-600 to-brand-500"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <span
          aria-hidden="true"
          className="hidden size-10 shrink-0 place-items-center rounded-full bg-white/15 text-white sm:grid"
        >
          <Smartphone className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white sm:text-base">
            Get the Gulu Mulu app
          </p>
          <p className="truncate text-xs text-white/85 sm:text-sm">
            Track every order, unlock app-only deals, and check out in two taps.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {STORES.map(({ href, icon: Icon, eyebrow, name }) => (
            <a
              key={name}
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className={cn(
                // min-h-11/min-w-11: below `sm` this collapses to an icon-only chip, and an
                // icon-only chip still has to be a 44px thumb target.
                'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg bg-black/85 px-3 py-1.5 text-white',
                'transition-colors hover:bg-black',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white',
              )}
            >
              <Icon className="size-4 shrink-0 sm:size-5" aria-hidden="true" />
              {/* The two-line store lockup does not fit beside a second chip at 375px —
                  there, the icon carries it and the label goes to screen readers only. */}
              <span className="hidden flex-col leading-none sm:flex">
                <span className="text-[0.625rem] text-white/80">{eyebrow}</span>
                <span className="mt-0.5 text-xs font-semibold whitespace-nowrap">{name}</span>
              </span>
              <span className="sr-only sm:hidden">{`${eyebrow} ${name}`}</span>
            </a>
          ))}

          <button
            type="button"
            onClick={dismissForever}
            aria-label="Dismiss app download banner"
            className={cn(
              'grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-white/80',
              'transition-colors hover:bg-white/15 hover:text-white',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white',
            )}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  )
}
