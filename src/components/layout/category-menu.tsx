'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, LayoutGrid } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { CategoryNode } from './shell-data'

const HOVER_CLOSE_DELAY = 120

export interface CategoryMenuProps {
  categories: CategoryNode[]
  className?: string
}

/**
 * Desktop mega-menu. Opens on hover AND on click, so a mouse user gets the
 * hover affordance while a keyboard user gets a real button:
 *
 *  - Enter/Space toggles the panel (it's a <button aria-expanded>)
 *  - Escape closes it and returns focus to the trigger
 *  - Tabbing out of the panel closes it (focusout with a relatedTarget check)
 *  - Navigating to a category closes it (pathname effect)
 */
export function CategoryMenu({ categories, className }: CategoryMenuProps) {
  const [open, setOpen] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelId = React.useId()
  const pathname = usePathname()
  const [lastPathname, setLastPathname] = React.useState(pathname)

  // Clicking a category inside the panel navigates — the panel must not survive it.
  // Adjusted during render, not in an effect (no cascading render).
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setOpen(false)
  }

  const cancelClose = React.useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  // A tiny grace period: the pointer has to cross a 8px gap between the trigger and
  // the panel, and a menu that vanishes mid-crossing feels broken.
  const scheduleClose = React.useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY)
  }, [cancelClose])

  React.useEffect(() => cancelClose, [cancelClose])

  React.useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    function onPointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  if (categories.length === 0) return null

  return (
    <div
      ref={wrapperRef}
      className={cn('relative', className)}
      onMouseEnter={() => {
        cancelClose()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
      onBlur={(event) => {
        // Focus left the whole trigger+panel subtree.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap',
          'transition-colors duration-150',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
          open ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-surface-sunken',
        )}
      >
        <LayoutGrid className="size-4 shrink-0" aria-hidden="true" />
        Categories
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id={panelId}
          className={cn(
            'absolute top-full left-0 z-50 mt-2 w-[min(56rem,calc(100vw-3rem))]',
            'rounded-card border border-line bg-surface p-6 shadow-xl',
          )}
        >
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-3">
            {categories.map((parent) => (
              <div key={parent.id} className="min-w-0">
                <Link
                  href={`/category/${parent.slug}`}
                  className={cn(
                    'block truncate text-sm font-semibold text-ink',
                    'hover:text-brand-600 focus-visible:outline-hidden focus-visible:text-brand-600',
                  )}
                >
                  {parent.name}
                </Link>

                {parent.children.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {parent.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/category/${child.slug}`}
                          className={cn(
                            'block truncate text-sm text-ink-muted',
                            'hover:text-brand-600 focus-visible:outline-hidden focus-visible:text-brand-600',
                          )}
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
