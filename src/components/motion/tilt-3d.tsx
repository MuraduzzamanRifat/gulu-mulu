'use client'

import * as React from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

import { cn } from '@/lib/utils'

/**
 * Pointer-tracking 3D tilt — the workhorse of the "every section feels three-dimensional" brief,
 * done without a single WebGL context (so it's free on the GPU and can't crash a phone).
 *
 * Deliberately DESKTOP-ONLY: it activates only for a fine pointer (mouse). Touch users scroll
 * with their finger, and tilting a card under a scrolling thumb is jank, not delight — so on a
 * phone this renders a plain, fast card. It also stands down entirely for prefers-reduced-motion.
 *
 * Everything animated here is `transform` (rotateX/Y + a small translateZ pop on the inner
 * `[data-tilt-layer]`), which stays on the compositor — no layout, no paint.
 */
export function Tilt3D({
  children,
  className,
  intensity = 7,
  scale = 1.0,
}: {
  children: React.ReactNode
  className?: string
  /** Max tilt in degrees at the card edges. */
  intensity?: number
  /** Optional lift-on-hover scale. */
  scale?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [active, setActive] = React.useState(false)

  React.useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setActive(fine && !reduced)
  }, [])

  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const spring = { stiffness: 150, damping: 16, mass: 0.4 }
  const rotateX = useSpring(useTransform(py, [0, 1], [intensity, -intensity]), spring)
  const rotateY = useSpring(useTransform(px, [0, 1], [-intensity, intensity]), spring)

  if (!active) {
    return <div className={className}>{children}</div>
  }

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    px.set((e.clientX - rect.left) / rect.width)
    py.set((e.clientY - rect.top) / rect.height)
  }
  const reset = () => {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      whileHover={scale !== 1 ? { scale } : undefined}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        transformPerspective: 900,
      }}
      className={cn('will-change-transform', className)}
    >
      {children}
    </motion.div>
  )
}
