/**
 * Commission rates, rendered.
 *
 * This lives in `_lib` and NOT beside <CommissionDial> for a reason worth remembering: every export
 * of a `'use client'` module — including a plain, pure helper function — becomes a client reference.
 * A Server Component that imports one and calls it does not get the function, it gets a proxy, and
 * the render dies with:
 *
 *     Attempted to call formatRate() from the server but formatRate is on the client.
 *
 * The rate is displayed on the server (the sellers table, the order breakdown) AND on the client
 * (the dial), so the helper has to sit in a module that belongs to neither.
 */

/** The stored FRACTION (0.125) as the percentage a human reads: "12.5%". No trailing ".0". */
export function formatRate(rate: number): string {
  const percent = Math.round(rate * 10_000) / 100
  return `${percent}%`
}
