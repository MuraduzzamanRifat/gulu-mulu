'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import useEmblaCarousel from 'embla-carousel-react'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

import type { Banner } from '@/generated/prisma/client'
import { cn } from '@/lib/utils'

import { bannerHref } from './banner-href'

export interface HeroCarouselProps {
  banners: Banner[]
}

/** Long enough to read a headline, short enough that the third banner is still seen. */
const AUTOPLAY_MS = 5500

/**
 * The full-bleed hero. Embla gives us native-feeling swipe on a phone (where almost all of BD
 * e-commerce happens) for ~5kB, and we drive the auto-rotation ourselves rather than pulling in
 * the autoplay plugin — it is one interval.
 *
 * The rotation stops when the shopper is hovering or has tabbed into a slide (nothing is more
 * hostile than a CTA that slides out from under the cursor), when the tab is in the background,
 * and entirely for anyone who has asked for reduced motion.
 */
export function HeroCarousel({ banners }: HeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start', duration: 26 })
  const [selected, setSelected] = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  const [reduced, setReduced] = React.useState(false)

  React.useEffect(() => {
    if (!emblaApi) return

    const sync = () => setSelected(emblaApi.selectedScrollSnap())
    sync()
    emblaApi.on('select', sync)
    emblaApi.on('reInit', sync)

    return () => {
      emblaApi.off('select', sync)
      emblaApi.off('reInit', sync)
    }
  }, [emblaApi])

  // Subscribed, not read once: a shopper who turns Reduce Motion on mid-session is almost
  // certainly reaching for it *because* the carousel is moving. It has to stop immediately.
  React.useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(query.matches)

    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  React.useEffect(() => {
    if (!emblaApi || paused || reduced || banners.length < 2) return

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') emblaApi.scrollNext()
    }, AUTOPLAY_MS)

    return () => window.clearInterval(timer)
  }, [emblaApi, paused, reduced, banners.length])

  if (banners.length === 0) return null

  const multiple = banners.length > 1

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      className="relative isolate bg-surface-sunken"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${banners.length}`}
              className="relative min-w-0 shrink-0 grow-0 basis-full"
            >
              <Link
                href={bannerHref(banner.linkUrl)}
                className={cn(
                  'group relative block h-[260px] w-full overflow-hidden sm:h-[340px] lg:h-[420px]',
                  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset',
                )}
              >
                <Image
                  src={banner.imageUrl}
                  alt={banner.title}
                  fill
                  // The hero is the LCP element on the whole storefront — the first slide must not wait.
                  priority={index === 0}
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                  sizes="100vw"
                  quality={75}
                  className="object-cover"
                />

                {/* Left-weighted scrim: keeps the headline legible over any photo without
                    flattening the image on the right, where the art usually is. */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-linear-to-r from-black/85 via-black/55 to-black/10"
                />

                <div className="absolute inset-0 flex items-center">
                  <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex max-w-md flex-col items-start gap-2.5 sm:max-w-xl sm:gap-4">
                      <h2 className="text-2xl leading-tight font-extrabold tracking-tight text-white text-balance sm:text-4xl lg:text-5xl">
                        {banner.title}
                      </h2>

                      {banner.subtitle ? (
                        <p className="line-clamp-3 text-sm text-white/85 sm:text-base">
                          {banner.subtitle}
                        </p>
                      ) : null}

                      <span
                        className={cn(
                          'mt-0.5 inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-500 px-5',
                          'text-sm font-semibold text-white shadow-xs transition-colors sm:h-11 sm:text-base',
                          'group-hover:bg-brand-600',
                        )}
                      >
                        Shop now
                        <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {multiple ? (
        <>
          <HeroArrow
            direction="prev"
            onClick={() => emblaApi?.scrollPrev()}
            className="left-3 lg:left-5"
          />
          <HeroArrow
            direction="next"
            onClick={() => emblaApi?.scrollNext()}
            className="right-3 lg:right-5"
          />

          {/* The dots are the ONLY slide control on touch (the arrows are sm:-only), so the
              button is a full 44px target and the dot is just what it draws. Without this a
              missed tap falls through to the banner's own <Link> and navigates the shopper away. */}
          <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center">
            {banners.map((banner, index) => {
              const active = index === selected
              return (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => emblaApi?.scrollTo(index)}
                  aria-label={`Go to slide ${index + 1}: ${banner.title}`}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'group grid size-11 shrink-0 cursor-pointer place-items-center rounded-full',
                    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset',
                  )}
                >
                  {/* Fixed 24px track, scaled pill: the width never changes, so the row never
                      relayouts — the 200ms transition stays on the compositor. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'block h-2 w-6 origin-center rounded-full',
                      'transition-[transform,background-color] duration-200 motion-reduce:transition-none',
                      active
                        ? 'scale-x-100 bg-white'
                        : 'scale-x-[0.333] bg-white/50 group-hover:bg-white/80',
                    )}
                  />
                </button>
              )
            })}
          </div>
        </>
      ) : null}
    </section>
  )
}

function HeroArrow({
  direction,
  onClick,
  className,
}: {
  direction: 'prev' | 'next'
  onClick: () => void
  className?: string
}) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 'prev' ? 'Previous slide' : 'Next slide'}
      className={cn(
        // Hidden on touch: swiping is the gesture there, and arrows would only cover the art.
        'absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full sm:grid',
        'border border-white/25 bg-black/35 text-white backdrop-blur-sm',
        'transition-colors hover:bg-black/60',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white',
        className,
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  )
}
