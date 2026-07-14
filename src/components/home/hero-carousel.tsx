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

  React.useEffect(() => {
    if (!emblaApi || paused || banners.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') emblaApi.scrollNext()
    }, AUTOPLAY_MS)

    return () => window.clearInterval(timer)
  }, [emblaApi, paused, banners.length])

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
                  <div className="mx-auto w-full max-w-7xl px-4">
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

          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5 sm:bottom-4">
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
                    'h-2 rounded-full transition-[width,background-color] duration-200',
                    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white',
                    active ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80',
                  )}
                />
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
        'absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full sm:grid',
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
