import { ImageOff } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface ThumbProps {
  src?: string | null
  alt?: string
  className?: string
  /** Landscape (16:9-ish) instead of square — for banners. */
  wide?: boolean
}

/**
 * A small image preview for a table row.
 *
 * A plain <img>, not next/image, and that is not laziness. These URLs are typed in by sellers and
 * admins and can point at any host on earth; next/image validates against `remotePatterns` and
 * would hard-400 on anything not on the allow-list, turning one bad paste into a broken admin page.
 * A plain <img> degrades to the placeholder instead. The moment uploads land on our own bucket,
 * this becomes next/image.
 */
export function Thumb({ src, alt = '', className, wide = false }: ThumbProps) {
  const shape = wide ? 'aspect-[16/9] w-24' : 'size-12'

  if (!src) {
    return (
      <div
        className={cn(
          'grid shrink-0 place-items-center rounded-lg border border-line bg-surface-sunken text-ink-subtle',
          shape,
          className,
        )}
        aria-hidden="true"
      >
        <ImageOff className="size-4" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden rounded-lg border border-line bg-surface-sunken',
        shape,
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="size-full object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  )
}
