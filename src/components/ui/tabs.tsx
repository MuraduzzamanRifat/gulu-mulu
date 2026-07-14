'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  value: string
  setValue: (value: string) => void
  baseId: string
  register: (value: string, el: HTMLButtonElement | null) => void
  focusStep: (from: string, delta: number | 'first' | 'last') => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabs(component: string) {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error(`<${component}> must be rendered inside <Tabs>`)
  return ctx
}

export interface TabsProps {
  /** Uncontrolled initial tab. */
  defaultValue?: string
  /** Controlled value — pair with onValueChange. */
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function Tabs({
  defaultValue = '',
  value: controlled,
  onValueChange,
  children,
  className,
}: TabsProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const isControlled = controlled !== undefined
  const value = isControlled ? controlled : uncontrolled

  const baseId = React.useId()
  // Insertion-ordered map of tab value -> trigger element, for arrow-key roving.
  const triggers = React.useRef<Map<string, HTMLButtonElement | null>>(new Map())

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolled(next)
      onValueChange?.(next)
    },
    [isControlled, onValueChange],
  )

  const register = React.useCallback((tabValue: string, el: HTMLButtonElement | null) => {
    if (el) triggers.current.set(tabValue, el)
    else triggers.current.delete(tabValue)
  }, [])

  const focusStep = React.useCallback(
    (from: string, delta: number | 'first' | 'last') => {
      // Sort by document position rather than trusting Map insertion order —
      // the registry churns as triggers mount/unmount, the DOM never lies.
      const entries = [...triggers.current.entries()]
        .filter((e): e is [string, HTMLButtonElement] => !!e[1] && !e[1].disabled)
        .sort(([, a], [, b]) =>
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
        )
      if (entries.length === 0) return

      let index: number
      if (delta === 'first') index = 0
      else if (delta === 'last') index = entries.length - 1
      else {
        const current = entries.findIndex(([key]) => key === from)
        // Wrap around, per the ARIA tabs pattern.
        index = (current + delta + entries.length) % entries.length
      }

      const [nextValue, el] = entries[index]
      el?.focus()
      // Automatic activation: focusing a tab selects it.
      setValue(nextValue)
    },
    [setValue],
  )

  const ctx = React.useMemo(
    () => ({ value, setValue, baseId, register, focusStep }),
    [value, setValue, baseId, register, focusStep],
  )

  return (
    <TabsContext.Provider value={ctx}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  'aria-label'?: string
}

export function TabsList({ className, children, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        // A rail on mobile: too many tabs to wrap, so they scroll instead.
        'flex items-center gap-1 overflow-x-auto border-b border-line scrollbar-none',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface TabsTriggerProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string
}

export function TabsTrigger({ value, className, children, disabled, ...props }: TabsTriggerProps) {
  const { value: active, setValue, baseId, register, focusStep } = useTabs('TabsTrigger')
  const selected = active === value

  // Stable identity: an inline ref callback would detach/reattach every render.
  const ref = React.useCallback(
    (el: HTMLButtonElement | null) => {
      register(value, el)
      return () => register(value, null)
    },
    [register, value],
  )

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault()
        focusStep(value, 1)
        break
      case 'ArrowLeft':
        e.preventDefault()
        focusStep(value, -1)
        break
      case 'Home':
        e.preventDefault()
        focusStep(value, 'first')
        break
      case 'End':
        e.preventDefault()
        focusStep(value, 'last')
        break
    }
  }

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      // Roving tabindex: only the selected tab is in the tab order.
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={() => setValue(value)}
      onKeyDown={onKeyDown}
      className={cn(
        'relative -mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap',
        'transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
        'disabled:pointer-events-none disabled:opacity-50',
        selected
          ? 'border-brand-500 text-brand-600'
          : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const { value: active, baseId } = useTabs('TabsContent')
  if (active !== value) return null

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn('pt-4 focus-visible:outline-hidden', className)}
      {...props}
    >
      {children}
    </div>
  )
}
