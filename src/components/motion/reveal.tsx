'use client'

import * as React from 'react'
import { motion } from 'framer-motion'

/**
 * Scroll-into-view reveal — sections rise and fade in as they enter the viewport, which reads as
 * depth (content arriving from behind the fold) rather than snapping in. Fires once.
 *
 * Reduced-motion is handled globally by <MotionProvider reducedMotion="user">, so we don't gate
 * it here — framer collapses the transform for those users automatically.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
  as = 'div',
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  /** Starting vertical offset in px. */
  y?: number
  as?: 'div' | 'section' | 'li'
}) {
  const Comp = motion[as]
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Comp>
  )
}

/**
 * Staggered variant for grids/rails — children reveal in sequence. Wrap items in <RevealItem>.
 */
export function RevealStagger({
  children,
  className,
  stagger = 0.06,
}: {
  children: React.ReactNode
  className?: string
  stagger?: number
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      variants={{ show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  )
}
