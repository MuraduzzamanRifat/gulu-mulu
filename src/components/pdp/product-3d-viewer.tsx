'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { Rotate3d, X } from 'lucide-react'

// three + the R3F scene are code-split behind this dynamic import with ssr:false. Nothing
// WebGL-related ships in the product page's bundle or runs on the server; it only downloads
// and initialises a GL context once the shopper taps "View in 3D". On a mobile-first storefront
// that opt-in is the difference between 3D being a delight and being a battery/perf tax on people
// who never asked for it.
const ShoeCanvas = dynamic(() => import('./shoe-canvas'), {
  ssr: false,
  loading: () => (
    <div className="grid size-full place-items-center text-sm text-ink-muted">Loading 3D view…</div>
  ),
})

export function Product3DViewer({ src }: { src?: string }) {
  const [open, setOpen] = React.useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink transition-colors hover:border-brand-300 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500 outline-hidden"
      >
        <Rotate3d className="size-4 text-brand-500" aria-hidden="true" />
        View in 3D
      </button>
    )
  }

  return (
    <div className="mt-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-card border border-line bg-surface-muted">
        <ShoeCanvas src={src} />
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close 3D view"
          className="absolute top-3 right-3 z-10 grid size-11 place-items-center rounded-full border border-line bg-white/90 text-ink-muted backdrop-blur-sm transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-500 outline-hidden"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-ink-subtle">
        Drag to rotate · scroll to zoom · this is a demo model
      </p>
    </div>
  )
}
