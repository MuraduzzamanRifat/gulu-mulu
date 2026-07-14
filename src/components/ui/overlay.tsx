'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'

/**
 * Shared internals for <Sheet> and <Dialog>.
 *
 * Not part of the public design-system surface — import Sheet/Dialog instead.
 * Deliberately dependency-free: no Radix, no focus-trap lib.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
  )
}

// ---------------------------------------------------------------------------
// Body scroll lock — ref-counted so nested overlays don't unlock each other.
// ---------------------------------------------------------------------------

let lockCount = 0
let prevOverflow = ''
let prevPaddingRight = ''

export function useBodyScrollLock(active: boolean) {
  React.useEffect(() => {
    if (!active) return

    if (lockCount === 0) {
      // Compensate for the vanishing scrollbar so the page doesn't jump.
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      prevOverflow = document.body.style.overflow
      prevPaddingRight = document.body.style.paddingRight
      document.body.style.overflow = 'hidden'
      if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    lockCount += 1

    return () => {
      lockCount = Math.max(0, lockCount - 1)
      if (lockCount === 0) {
        document.body.style.overflow = prevOverflow
        document.body.style.paddingRight = prevPaddingRight
      }
    }
  }, [active])
}

// ---------------------------------------------------------------------------
// Focus trap — moves focus in, cycles Tab within the panel, restores on close.
// ---------------------------------------------------------------------------

export function useFocusTrap(active: boolean, panelRef: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    if (!active) return
    const panel = panelRef.current
    if (!panel) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const targets = focusableWithin(panel)
    ;(targets[0] ?? panel).focus({ preventScroll: true })

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !panel) return

      const focusables = focusableWithin(panel)
      if (focusables.length === 0) {
        // Nothing to tab to — pin focus to the panel itself.
        e.preventDefault()
        panel.focus({ preventScroll: true })
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const current = document.activeElement

      if (e.shiftKey && (current === first || current === panel)) {
        e.preventDefault()
        last.focus({ preventScroll: true })
      } else if (!e.shiftKey && current === last) {
        e.preventDefault()
        first.focus({ preventScroll: true })
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Send focus back to whatever opened us — but only if it's still around.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true })
      }
    }
  }, [active, panelRef])
}

// ---------------------------------------------------------------------------
// Escape to dismiss.
// ---------------------------------------------------------------------------

export function useEscapeKey(active: boolean, onEscape: () => void) {
  React.useEffect(() => {
    if (!active) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onEscape()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // Callers pass a stable (useCallback'd) handler, so this doesn't churn.
  }, [active, onEscape])
}

// ---------------------------------------------------------------------------
// Presence — keeps the node mounted long enough to play its exit transition.
//
// The *enter* transition needs no JS at all: the panel is inserted already
// carrying its open classes, and a `starting:` (@starting-style) variant gives
// the browser the state to animate *from*. We only need state for the exit,
// where the node must outlive `open === false` by one transition.
// ---------------------------------------------------------------------------

export function usePresence(open: boolean, durationMs = 300) {
  const [exiting, setExiting] = React.useState(false)
  const [prevOpen, setPrevOpen] = React.useState(open)

  // Adjusting state during render (React's sanctioned pattern) — this commits
  // in the same pass that `open` flips, so the node never blinks out.
  if (prevOpen !== open) {
    setPrevOpen(open)
    setExiting(!open)
  }

  React.useEffect(() => {
    if (!exiting) return
    const timer = setTimeout(() => setExiting(false), durationMs)
    return () => clearTimeout(timer)
  }, [exiting, durationMs])

  return open || exiting
}

// ---------------------------------------------------------------------------
// Portal — renders into document.body, SSR-safe, without a mount-effect.
// ---------------------------------------------------------------------------

const subscribeToNothing = () => () => {}

export function Portal({ children }: { children: React.ReactNode }) {
  const isServer = React.useSyncExternalStore(
    subscribeToNothing,
    () => false,
    () => true,
  )

  if (isServer) return null
  return createPortal(children, document.body)
}
