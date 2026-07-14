'use client'

import * as React from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

import { DiscountBadge } from '@/components/ui'
import { PLACEHOLDER_IMAGE } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * The PDP gallery: one big frame, a thumbnail rail, and a magnifier on desktop.
 *
 * Interaction rules
 *  - Click a thumbnail, or press ← / → anywhere in the frame, to switch. The frame is a real tab
 *    stop with a live region announcing "Image 2 of 4", so this is usable without a mouse.
 *  - Hover-zoom is enabled ONLY on a device with a fine pointer. On a phone, "hover" is a tap that
 *    would leave the image stuck at 1.8× under the shopper's thumb, so we never arm it there.
 *  - transform-origin tracks the cursor, which is what makes it read as a magnifier rather than a
 *    lurching scale animation.
 */

export interface GalleryImage {
  url: string
  alt: string | null
}

export interface ProductGalleryProps {
  images: GalleryImage[]
  /** Alt-text fallback when an image row has none. */
  title: string
  /** Whole percent, e.g. 40 — renders the "40% OFF" flash. 0 renders nothing. */
  discountPercent?: number
  /** Veils the image, matching the product card's treatment. */
  outOfStock?: boolean
  className?: string
}

export function ProductGallery({
  images,
  title,
  discountPercent = 0,
  outOfStock = false,
  className,
}: ProductGalleryProps) {
  // A product with no image rows still needs a frame — never render a broken/empty box.
  const frames: GalleryImage[] =
    images.length > 0 ? images : [{ url: PLACEHOLDER_IMAGE, alt: title }]

  const [index, setIndex] = React.useState(0)
  const [zooming, setZooming] = React.useState(false)
  const [origin, setOrigin] = React.useState('50% 50%')
  const [canZoom, setCanZoom] = React.useState(false)

  const thumbRefs = React.useRef<(HTMLButtonElement | null)[]>([])

  React.useEffect(() => {
    // Phones and trackpad-less tablets do not get a magnifier — see the note above.
    const query = window.matchMedia('(hover: hover) and (pointer: fine)')
    const sync = () => setCanZoom(query.matches)

    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  const current = frames[Math.min(index, frames.length - 1)]
  const isPlaceholder = current.url === PLACEHOLDER_IMAGE

  function go(next: number) {
    const wrapped = (next + frames.length) % frames.length
    setIndex(wrapped)
    setZooming(false)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (frames.length < 2) return

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      go(index + 1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      go(index - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      go(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      go(frames.length - 1)
    }
  }

  function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!canZoom) return

    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100

    setOrigin(`${Math.min(100, Math.max(0, x))}% ${Math.min(100, Math.max(0, y))}%`)
  }

  // size-11 (44px), not size-9 (36px): these arrows sit ON the product photo on the highest-intent
  // screen in the shop, and unlike the hero they are visible and tappable on mobile.
  const arrowClass = cn(
    'absolute top-1/2 z-20 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full',
    'border border-line bg-surface/90 text-ink shadow-xs backdrop-blur-sm',
    'transition-colors hover:bg-surface hover:text-brand-600',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
  )

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label={`${title} — product images`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onMouseEnter={() => canZoom && setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={onMouseMove}
        className={cn(
          'relative aspect-[4/5] w-full overflow-hidden rounded-card border border-line bg-surface-sunken',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          canZoom && !outOfStock && 'cursor-zoom-in',
        )}
      >
        <Image
          key={current.url}
          src={current.url}
          alt={current.alt ?? title}
          fill
          sizes="(min-width: 1024px) 45vw, 100vw"
          priority
          quality={90}
          // The local SVG placeholder must bypass the optimizer.
          unoptimized={isPlaceholder}
          className={cn(
            'object-cover transition-transform duration-200 ease-out motion-reduce:transition-none',
            zooming && !outOfStock ? 'scale-[1.8]' : 'scale-100',
            outOfStock && 'opacity-70',
          )}
          style={{ transformOrigin: zooming ? origin : '50% 50%' }}
        />

        {discountPercent > 0 ? (
          <DiscountBadge
            percent={discountPercent}
            size="md"
            className="absolute top-3 left-3 z-20 shadow-xs"
          />
        ) : null}

        {outOfStock ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/45">
            <span className="rounded-full bg-surface px-4 py-1.5 text-sm font-semibold text-ink shadow-xs">
              Out of stock
            </span>
          </div>
        ) : null}

        {frames.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous image"
              className={cn(arrowClass, 'left-3')}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next image"
              className={cn(arrowClass, 'right-3')}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>

            <span className="absolute right-3 bottom-3 z-20 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium tabular-nums text-white">
              {index + 1} / {frames.length}
            </span>
          </>
        ) : null}

        {canZoom && !outOfStock ? (
          <span className="absolute bottom-3 left-3 z-20 hidden items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white lg:inline-flex">
            <ZoomIn className="size-3.5" aria-hidden="true" />
            Hover to zoom
          </span>
        ) : null}

        {/* Announce the change for screen readers — the visual counter is decorative. */}
        <span className="sr-only" aria-live="polite">
          Image {index + 1} of {frames.length}
        </span>
      </div>

      {frames.length > 1 ? (
        <div
          className="snap-rail -mx-4 flex gap-2 px-4 sm:mx-0 sm:px-0"
          role="group"
          aria-label="Choose an image"
        >
          {frames.map((frame, i) => {
            const selected = i === index
            return (
              <button
                key={frame.url}
                ref={(el) => {
                  thumbRefs.current[i] = el
                }}
                type="button"
                onClick={() => go(i)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight') {
                    event.preventDefault()
                    const next = (i + 1) % frames.length
                    go(next)
                    thumbRefs.current[next]?.focus()
                  } else if (event.key === 'ArrowLeft') {
                    event.preventDefault()
                    const next = (i - 1 + frames.length) % frames.length
                    go(next)
                    thumbRefs.current[next]?.focus()
                  }
                }}
                aria-label={`Show image ${i + 1}`}
                aria-current={selected}
                className={cn(
                  'relative size-16 shrink-0 cursor-pointer snap-start overflow-hidden rounded-lg border-2 bg-surface-sunken sm:size-20',
                  'transition-colors duration-150',
                  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                  'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                  selected
                    ? 'border-brand-500'
                    : 'border-transparent opacity-70 hover:border-line-strong hover:opacity-100',
                )}
              >
                <Image
                  src={frame.url}
                  alt=""
                  fill
                  sizes="80px"
                  quality={60}
                  unoptimized={frame.url === PLACEHOLDER_IMAGE}
                  className="object-cover"
                />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
