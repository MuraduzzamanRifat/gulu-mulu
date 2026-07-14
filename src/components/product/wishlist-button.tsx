'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { toggleWishlist } from './_actions'

export interface WishlistButtonProps {
  productId: string
  /** Server-known state. The button flips optimistically from here. */
  wishlisted?: boolean
  /** The product title, so the toast can name what was saved. */
  title?: string
  className?: string
}

/**
 * The heart on a product card. Optimistic: it fills the instant you tap, and rolls
 * back if the Server Action says no. Signed-out shoppers are routed to /login rather
 * than silently failing.
 *
 * It lives ABOVE the card's full-bleed link (z-20), and stops the click from
 * bubbling into that link — tapping the heart must never navigate.
 */
export function WishlistButton({
  productId,
  wishlisted = false,
  title,
  className,
}: WishlistButtonProps) {
  const router = useRouter()
  const [saved, setSaved] = React.useState(wishlisted)
  const [pending, startTransition] = React.useTransition()

  // The card may be re-rendered by the server with fresh state (e.g. after a revalidate).
  React.useEffect(() => {
    setSaved(wishlisted)
  }, [wishlisted])

  function onClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()

    const next = !saved
    setSaved(next) // optimistic

    startTransition(async () => {
      const result = await toggleWishlist({ productId })

      if (!result.ok) {
        setSaved(!next) // roll back
        if (result.requiresAuth) {
          toast.error(result.error)
          router.push('/login')
          return
        }
        toast.error(result.error)
        return
      }

      setSaved(result.wishlisted)
      toast.success(
        result.wishlisted
          ? title
            ? `Saved “${title}” to your wishlist`
            : 'Saved to your wishlist'
          : 'Removed from your wishlist',
      )
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      title={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      className={cn(
        'grid size-8 place-items-center rounded-full border border-line bg-surface/90 backdrop-blur-sm',
        'text-ink-muted shadow-xs transition-[color,background-color,transform] duration-150',
        'hover:scale-105 hover:text-brand-500 active:scale-95 motion-reduce:hover:scale-100',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
        'disabled:pointer-events-none disabled:opacity-70',
        saved && 'text-brand-500',
        className,
      )}
    >
      <Heart className={cn('size-4', saved && 'fill-current')} aria-hidden="true" />
    </button>
  )
}
