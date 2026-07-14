'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Portal, useBodyScrollLock, useEscapeKey, useFocusTrap, usePresence } from './overlay'

const DURATION = 200

export type DialogSize = 'sm' | 'md' | 'lg'

const SIZES: Record<DialogSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
}

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: React.ReactNode
  /** Action row — typically Cancel + Confirm buttons. */
  footer?: React.ReactNode
  size?: DialogSize
  /** Hide the X. Use for a blocking confirm where the footer owns dismissal. */
  hideCloseButton?: boolean
  className?: string
}

/**
 * Modal dialog. Same a11y contract as <Sheet>: focus trap, Escape, backdrop
 * click, body scroll lock, focus restored to the trigger on close.
 *
 * Presents as a bottom sheet on mobile and a centred card from `sm` up.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideCloseButton = false,
  className,
}: DialogProps) {
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
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4',
          !open && 'pointer-events-none',
        )}
        inert={!open}
      >
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
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          tabIndex={-1}
          className={cn(
            'relative flex max-h-[90dvh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-xl outline-hidden sm:rounded-card',
            'transition-[opacity,transform,scale] ease-out motion-reduce:transition-none',
            open
              ? 'translate-y-0 scale-100 opacity-100 starting:translate-y-4 starting:opacity-0 sm:starting:translate-y-0 sm:starting:scale-95'
              : 'translate-y-4 opacity-0 sm:translate-y-0 sm:scale-95',
            SIZES[size],
            className,
          )}
          style={{ transitionDuration: `${DURATION}ms` }}
        >
          <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold text-ink sm:text-lg">
                {title}
              </h2>
              {description ? (
                <p id={descId} className="mt-1 text-sm text-ink-muted">
                  {description}
                </p>
              ) : null}
            </div>

            {!hideCloseButton ? (
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className={cn(
                  '-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted',
                  'transition-colors hover:bg-surface-sunken hover:text-ink',
                  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                )}
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {children ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5 sm:pb-5">
              {children}
            </div>
          ) : null}

          {footer ? (
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5 sm:pb-3">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </Portal>
  )
}
