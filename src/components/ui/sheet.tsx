'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Portal, useBodyScrollLock, useEscapeKey, useFocusTrap, usePresence } from './overlay'

const DURATION = 300

export type SheetSide = 'left' | 'right' | 'bottom'

const PANEL_BASE: Record<SheetSide, string> = {
  left: 'inset-y-0 left-0 h-full w-[86%] max-w-sm border-r',
  right: 'inset-y-0 right-0 h-full w-[86%] max-w-sm border-l',
  bottom: 'inset-x-0 bottom-0 max-h-[85dvh] w-full rounded-t-2xl border-t',
}

/**
 * Open/closed transforms. These MUST be complete literal class strings —
 * Tailwind scans source as raw text, so an interpolated `starting:${...}`
 * would never be generated.
 */
const PANEL_OPEN: Record<SheetSide, string> = {
  left: 'translate-x-0 starting:-translate-x-full',
  right: 'translate-x-0 starting:translate-x-full',
  bottom: 'translate-y-0 starting:translate-y-full',
}

const PANEL_CLOSED: Record<SheetSide, string> = {
  left: '-translate-x-full',
  right: 'translate-x-full',
  bottom: 'translate-y-full',
}

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  side?: SheetSide
  title?: string
  description?: string
  children: React.ReactNode
  /** Pinned to the bottom of the panel — e.g. "Apply filters". */
  footer?: React.ReactNode
  /** Class for the panel itself. */
  className?: string
}

/**
 * Slide-over panel for mobile filters and the mobile menu.
 *
 * Traps focus, closes on Escape and on backdrop click, and locks body scroll
 * while open. Stays mounted through its exit transition so it animates out.
 */
export function Sheet({
  open,
  onOpenChange,
  side = 'right',
  title,
  description,
  children,
  footer,
  className,
}: SheetProps) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const mounted = usePresence(open, DURATION)

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange])

  useBodyScrollLock(mounted)
  useEscapeKey(open, close)
  useFocusTrap(open, panelRef)

  const titleId = React.useId()
  const descId = React.useId()

  if (!mounted) return null

  return (
    <Portal>
      {/* While exiting, the panel is still on screen but must not be reachable. */}
      <div className={cn('fixed inset-0 z-50', !open && 'pointer-events-none')} inert={!open}>
        {/* Backdrop */}
        <div
          onClick={close}
          aria-hidden="true"
          className={cn(
            'absolute inset-0 bg-black/50 transition-opacity ease-out motion-reduce:transition-none',
            open ? 'opacity-100 starting:opacity-0' : 'opacity-0',
          )}
          style={{ transitionDuration: `${DURATION}ms` }}
        />

        {/* Panel */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descId : undefined}
          aria-label={title ? undefined : 'Panel'}
          tabIndex={-1}
          className={cn(
            'absolute flex flex-col border-line bg-surface shadow-xl outline-hidden',
            'transition-transform ease-out motion-reduce:transition-none',
            PANEL_BASE[side],
            open ? PANEL_OPEN[side] : PANEL_CLOSED[side],
            className,
          )}
          style={{ transitionDuration: `${DURATION}ms` }}
        >
          {/* Grab handle — signals "tap outside to dismiss" on the bottom sheet. */}
          {side === 'bottom' ? (
            <div className="flex justify-center pt-3" aria-hidden="true">
              <div className="h-1 w-10 rounded-full bg-line-strong" />
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-4 px-4 py-4">
            <div className="min-w-0">
              {title ? (
                <h2 id={titleId} className="truncate text-base font-semibold text-ink">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p id={descId} className="mt-0.5 text-sm text-ink-muted">
                  {description}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className={cn(
                // size-11 = 44px. The negative margin keeps the glyph optically on
                // the header's edge while the *target* grows outward into the padding.
                '-mt-2 -mr-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-muted',
                'transition-colors hover:bg-surface-sunken hover:text-ink',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
              )}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
            {children}
          </div>

          {footer ? (
            <div className="shrink-0 border-t border-line bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </Portal>
  )
}
