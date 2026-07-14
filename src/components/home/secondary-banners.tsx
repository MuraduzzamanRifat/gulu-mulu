import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import type { Banner } from '@/generated/prisma/client'
import { cn } from '@/lib/utils'

import { bannerHref } from './banner-href'

export interface SecondaryBannersProps {
  banners: Banner[]
}

/**
 * The 2-up promo row under the category strip. Same data model as the hero, a quieter frame:
 * rounded, contained, and never competing with the carousel for attention.
 */
export function SecondaryBanners({ banners }: SecondaryBannersProps) {
  if (banners.length === 0) return null

  return (
    <section aria-label="Promotions" className="grid gap-3 sm:grid-cols-2 sm:gap-4">
      {banners.map((banner) => (
        <Link
          key={banner.id}
          href={bannerHref(banner.linkUrl)}
          className={cn(
            'group relative block overflow-hidden rounded-card border border-line',
            'transition-shadow duration-200 hover:shadow-md',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          )}
        >
          <div className="relative aspect-[2/1] w-full bg-surface-sunken">
            <Image
              src={banner.imageUrl}
              alt={banner.title}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              quality={60}
              className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100"
            />

            <div
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-t from-black/85 via-black/40 to-transparent"
            />

            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 sm:p-5">
              <h3 className="text-base leading-snug font-bold text-white text-balance sm:text-lg">
                {banner.title}
              </h3>

              {banner.subtitle ? (
                <p className="line-clamp-2 text-xs text-white/80 sm:text-sm">{banner.subtitle}</p>
              ) : null}

              <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent-300 sm:text-sm">
                Learn more
                <ArrowRight
                  className="size-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
                  aria-hidden="true"
                />
              </span>
            </div>
          </div>
        </Link>
      ))}
    </section>
  )
}
