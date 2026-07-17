'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, LayoutDashboard, Package, UserRound } from 'lucide-react'

import { cn } from '@/lib/utils'
import { signOutAction } from './auth-actions'
import { SignOutButton } from './sign-out-button'

export interface AccountMenuUser {
  name: string | null
  phone: string
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN'
}

export interface AccountMenuProps {
  user: AccountMenuUser
  className?: string
}

/*
 * This dropdown is reachable on a phone too (the account icon is in the mobile header bar), so
 * min-h-11 — the rows were 36px. The focus ring matters as much: `focus-visible:bg-surface-sunken`
 * alone is the exact same treatment as :hover, so a keyboard user could not see where they were.
 */
const itemClass = cn(
  'flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink',
  'transition-colors hover:bg-surface-sunken',
  'focus-visible:outline-hidden focus-visible:bg-surface-sunken',
  'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset',
  '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-muted',
)

/**
 * Signed-in account dropdown. Sign-out is a real <form> bound to a Server Action, so
 * it still works if the JS bundle never arrives.
 */
export function AccountMenu({ user, className }: AccountMenuProps) {
  const [open, setOpen] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const menuId = React.useId()
  const pathname = usePathname()
  const [lastPathname, setLastPathname] = React.useState(pathname)

  // Navigating (or signing out) closes the dropdown. Adjusted during render, not in an
  // effect — see react-hooks/set-state-in-effect.
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setOpen(false)
  }

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

  const firstName = (user.name?.trim().split(/\s+/)[0] ?? '').slice(0, 14) || 'Account'

  return (
    <div
      ref={wrapperRef}
      className={cn('relative', className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-ink',
          'transition-colors hover:bg-surface-sunken',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
        )}
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
          <UserRound className="size-4" aria-hidden="true" />
        </span>
        <span className="hidden max-w-24 truncate sm:inline">{firstName}</span>
        <ChevronDown
          className={cn(
            'hidden size-4 shrink-0 transition-transform duration-200 sm:block',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className={cn(
            'absolute top-full right-0 z-50 mt-2 w-60 rounded-card border border-line bg-surface p-1.5 shadow-xl',
          )}
        >
          <div className="border-b border-line px-2.5 pt-1 pb-2.5">
            <p className="truncate text-sm font-semibold text-ink">{user.name ?? 'Gulu Mulu user'}</p>
            <p className="truncate text-xs text-ink-muted tabular-nums">{user.phone}</p>
          </div>

          <div className="pt-1.5">
            <Link href="/account" role="menuitem" className={itemClass}>
              <UserRound aria-hidden="true" />
              My account
            </Link>

            <Link href="/account/orders" role="menuitem" className={itemClass}>
              <Package aria-hidden="true" />
              My orders
            </Link>

            {user.role === 'ADMIN' ? (
              <Link href="/zawadpanel" role="menuitem" className={itemClass}>
                <LayoutDashboard aria-hidden="true" />
                Admin dashboard
              </Link>
            ) : null}

            <form action={signOutAction} className="mt-1 border-t border-line pt-1">
              <SignOutButton
                role="menuitem"
                className={cn(itemClass, 'text-danger [&_svg]:text-danger hover:bg-danger-soft')}
              />
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
