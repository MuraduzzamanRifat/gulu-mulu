'use client'

import { MotionConfig } from 'framer-motion'
import type * as React from 'react'

/**
 * One global switch for motion accessibility. `reducedMotion="user"` makes every framer-motion
 * component across the site honour the OS "reduce motion" preference — transforms collapse to
 * instant, so we never have to remember to gate individual animations. Complements the global
 * CSS `prefers-reduced-motion` rule in globals.css (that one covers plain CSS transitions).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
