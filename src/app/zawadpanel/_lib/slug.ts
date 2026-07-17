/**
 * URL-safe slugs for the catalogue taxonomy an admin curates: categories, brands, CMS pages.
 *
 * Derived identically on the client (the live preview under the name field) and on the server (the
 * value actually stored), so the two can never disagree.
 */
import { z } from 'zod'

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const SLUG_MAX = 60

/**
 * "Women's Fashion & Beauty!" -> "womens-fashion-beauty".
 *
 * Returns '' for input with no latin alphanumerics at all (e.g. a purely Bengali category name) —
 * the caller must then ask for a slug rather than inventing one, because an empty slug would
 * collide with every other empty slug on the @unique column.
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

export const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, 'The slug needs at least 2 characters.')
  .max(SLUG_MAX, `Keep the slug under ${SLUG_MAX} characters.`)
  .refine((value) => SLUG_PATTERN.test(value), {
    message: 'Lowercase letters, numbers and hyphens only — e.g. “womens-fashion”.',
  })
