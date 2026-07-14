'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Baby, Shirt, Sparkles, Store, ToyBrick, Venus, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface Tab {
  label: string
  href: string
  icon: LucideIcon
}

const TABS: Tab[] = [
  { label: 'For You', href: '/', icon: Store },
  { label: 'Men', href: '/category/men', icon: Shirt },
  { label: 'Women', href: '/category/women', icon: Venus },
  { label: 'Kids', href: '/category/kids', icon: ToyBrick },
  { label: 'Baby', href: '/category/baby', icon: Baby },
  { label: 'Beauty', href: '/category/health-beauty', icon: Sparkles },
]

/**
 * The app-style bottom tab bar. Mobile only — `md:hidden` — because on desktop the
 * mega-menu already carries the same navigation.
 *
 * The storefront layout reserves the height with `pb-16 md:pb-0`, so a fixed bar can
 * never sit on top of the last row of products.
 */
export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-sm md:hidden',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-6">
        {TABS.map(({ label, href, icon: Icon }) => {
          // "For You" is only active on the exact homepage; a category tab also stays lit
          // while you're deeper inside it (e.g. /category/men/... ).
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-14 flex-col items-center justify-center gap-0.5 px-0.5',
                  'text-[0.625rem] leading-tight font-medium transition-colors',
                  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset',
                  active ? 'text-brand-600' : 'text-ink-muted hover:text-ink active:text-ink',
                )}
              >
                <Icon
                  className={cn('size-5 shrink-0', active && 'text-brand-600')}
                  aria-hidden="true"
                />
                <span className="w-full truncate text-center">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
