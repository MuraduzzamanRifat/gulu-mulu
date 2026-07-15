'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type * as React from 'react'

/**
 * Class-based theming (next-themes toggles `.dark` on <html>). Defaults to light — the boutique
 * warm-white look is the brand; dark is an opt-in night variant, not the system default, so a
 * shopper on a dark-mode phone isn't force-flipped away from the intended palette.
 */
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
