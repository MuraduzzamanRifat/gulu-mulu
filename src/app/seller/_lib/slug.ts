/**
 * URL-safe slugs, derived the same way on the client (live preview as you type) and on the server
 * (the value that is actually stored). Shared so the two can never disagree.
 */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const SLUG_MAX = 60

/**
 * "Rongdhonu Fashion House!" -> "rongdhonu-fashion-house".
 *
 * Returns '' for input with no latin alphanumerics at all (e.g. a purely Bengali shop name) —
 * the caller must then ask the seller to type a slug themselves rather than inventing one.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '')
}

/** A short, unambiguous suffix used to break a slug collision: "cotton-saree-k3m9". */
export function slugSuffix(): string {
  return Math.random().toString(36).slice(2, 6)
}
