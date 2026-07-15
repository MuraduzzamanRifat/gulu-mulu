'use client'

import * as React from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

/**
 * Scroll parallax — the element drifts at a different rate than the page, so foreground and
 * background separate in depth. Used on the hero and banner imagery. Pure `transform`, so it's
 * cheap and jank-free; reduced-motion users get a static element (global MotionConfig collapses it).
 */
export function Parallax({
  children,
  className,
  /** How far it drifts, in px, across its scroll pass. Positive = moves up as you scroll down. */
  distance = 40,
}: {
  children: React.ReactNode
  className?: string
  distance?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance])

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }} className="h-full w-full will-change-transform">
        {children}
      </motion.div>
    </div>
  )
}
