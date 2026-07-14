'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FileText,
  Images,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  ShieldCheck,
  Store,
  Tag,
  Ticket,
  Users,
} from 'lucide-react'

import { signOutAction } from '@/components/layout/auth-actions'
import { Sheet } from '@/components/ui'
import { cn } from '@/lib/utils'

import type { AttentionCounts } from '../_lib/data'

export interface AdminShellProps {
  admin: { name: string | null; phone: string }
  attention: AttentionCounts
  children: React.ReactNode
}

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact: boolean
  /** Which attention counter, if any, badges this item. */
  badge?: keyof AttentionCounts
}

interface NavSection {
  heading: string | null
  items: NavItem[]
}

const NAV: NavSection[] = [
  {
    heading: null,
    items: [
      { href: '/admin', label: 'Overview', icon: LayoutGrid, exact: true },
      { href: '/admin/sellers', label: 'Sellers', icon: Users, exact: false, badge: 'sellers' },
      { href: '/admin/products', label: 'Products', icon: Package, exact: false, badge: 'products' },
      { href: '/admin/orders', label: 'Orders', icon: ReceiptText, exact: false },
    ],
  },
  {
    heading: 'Merchandising',
    items: [
      { href: '/admin/categories', label: 'Categories', icon: LayoutGrid, exact: false },
      { href: '/admin/brands', label: 'Brands', icon: Tag, exact: false },
      { href: '/admin/banners', label: 'Banners', icon: Images, exact: false },
      { href: '/admin/collections', label: 'Collections', icon: Ticket, exact: false },
      { href: '/admin/pages', label: 'CMS pages', icon: FileText, exact: false },
    ],
  },
]

function isActive(pathname: string, href: string, exact: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

const navLink = (active: boolean) =>
  cn(
    'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-400',
    '[&_svg]:size-4.5 [&_svg]:shrink-0',
    active
      ? 'bg-indigo-600 text-white'
      : 'text-slate-400 hover:bg-white/5 hover:text-white active:bg-white/10',
  )

/** The queue counter. Amber, not red — a queue is work, not an incident. */
function QueueBadge({ count }: { count: number }) {
  if (count <= 0) return null

  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[0.6875rem] font-bold text-slate-950 tabular-nums">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function NavList({ pathname, attention }: { pathname: string; attention: AttentionCounts }) {
  return (
    <nav aria-label="Admin console" className="space-y-5">
      {NAV.map((section) => (
        <div key={section.heading ?? 'main'} className="space-y-1">
          {section.heading ? (
            <p className="px-3 pb-1 text-[0.6875rem] font-semibold tracking-widest text-slate-500 uppercase">
              {section.heading}
            </p>
          ) : null}

          {section.items.map(({ href, label, icon: Icon, exact, badge }) => {
            const active = isActive(pathname, href, exact)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={navLink(active)}
              >
                <Icon aria-hidden="true" />
                {label}
                {badge ? <QueueBadge count={attention[badge]} /> : null}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function Wordmark() {
  return (
    <Link
      href="/admin"
      className="flex items-center gap-2 rounded-lg px-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white">
        <ShieldCheck className="size-4.5" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-extrabold tracking-tight text-white">Gulu Mulu</span>
        <span className="mt-0.5 text-[0.625rem] font-semibold tracking-[0.18em] text-indigo-400 uppercase">
          Admin
        </span>
      </span>
    </Link>
  )
}

function ShellFooter({ admin }: { admin: AdminShellProps['admin'] }) {
  return (
    <div className="space-y-3 border-t border-white/10 pt-3">
      <div className="px-3">
        <p className="truncate text-sm font-semibold text-white">{admin.name ?? 'Administrator'}</p>
        <p className="truncate text-xs text-slate-500 tabular-nums">{admin.phone}</p>
      </div>

      <div className="space-y-1">
        <Link href="/" className={navLink(false)}>
          <Store aria-hidden="true" />
          View storefront
        </Link>

        <form action={signOutAction}>
          <button
            type="submit"
            className={cn(navLink(false), 'w-full text-left hover:bg-red-500/15 hover:text-red-300')}
          >
            <LogOut aria-hidden="true" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}

/**
 * The admin chrome.
 *
 * Deliberately nothing like the storefront AND nothing like the seller portal: a slate console with
 * an indigo accent and a persistent dark top bar, against the seller's black-and-crimson rail. That
 * is not decoration — an admin holds a session that can approve a shop or cancel an order, and the
 * one thing the UI must never let them forget is which side of the marketplace they are standing on.
 *
 * Client only because the nav needs `usePathname()` for its active state and the mobile drawer needs
 * open/closed state. Every page rendered inside it stays a Server Component.
 */
export function AdminShell({ admin, attention, children }: AdminShellProps) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const [lastPathname, setLastPathname] = React.useState(pathname)

  // Navigating from inside the drawer must dismiss it. Adjusted during render — an effect would
  // close it one paint too late and the new page would flash behind an open sheet.
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setOpen(false)
  }

  return (
    <div className="min-h-dvh bg-slate-100 lg:pl-64">
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-6 bg-slate-950 p-4 lg:flex">
        <Wordmark />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavList pathname={pathname} attention={attention} />
        </div>

        <ShellFooter admin={admin} />
      </aside>

      {/* Top bar — the seller portal has none, and that alone tells you where you are. */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-800 bg-slate-900 px-3 lg:px-8">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open admin menu"
          aria-expanded={open}
          className={cn(
            'relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-white lg:hidden',
            'transition-colors hover:bg-white/10',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-400',
          )}
        >
          <Menu className="size-6" aria-hidden="true" />
          {attention.total > 0 ? (
            <span
              className="absolute top-1.5 right-1.5 size-2 rounded-full bg-amber-400"
              aria-hidden="true"
            />
          ) : null}
        </button>

        <span className="flex items-center gap-2 lg:hidden">
          <ShieldCheck className="size-4 text-indigo-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">Admin</span>
        </span>

        <span className="hidden items-center gap-2 lg:flex">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide text-amber-300 uppercase">
            Internal
          </span>
          <span className="text-sm text-slate-400">
            You are acting as an administrator — every change here is live.
          </span>
        </span>

        <Link
          href="/"
          className={cn(
            'ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-slate-300',
            'transition-colors hover:bg-white/10 hover:text-white',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-400',
          )}
        >
          <Store className="size-4" aria-hidden="true" />
          Storefront
        </Link>
      </header>

      {/* Mobile drawer — the shared <Sheet>, re-skinned to match the rail. */}
      <Sheet open={open} onOpenChange={setOpen} side="left" className="border-white/10 bg-slate-950">
        <div className="flex h-full flex-col gap-6">
          <Wordmark />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <NavList pathname={pathname} attention={attention} />
          </div>
          <ShellFooter admin={admin} />
        </div>
      </Sheet>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  )
}
