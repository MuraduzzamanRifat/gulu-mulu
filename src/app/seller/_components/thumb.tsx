import { ImageIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface ThumbProps {
  src?: string | null
  alt?: string
  className?: string
}

/**
 * A small product thumbnail for portal tables.
 *
 * Deliberately a plain <img>, not next/image: a seller can type ANY image host into the product
 * form, and next/image validates the host against `remotePatterns` in next.config.ts — so an
 * unknown host would render a broken 400 instead of the picture the seller just pasted. When real
 * uploads land on our own S3/R2 bucket every URL becomes ours and this can become next/image.
 */
export function Thumb({ src, alt = '', className }: ThumbProps) {
  return (
    <div
      className={cn(
        'grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-surface-sunken',
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
      ) : (
        <ImageIcon className="size-5 text-ink-subtle" aria-hidden="true" />
      )}
    </div>
  )
}
