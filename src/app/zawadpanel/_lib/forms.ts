/**
 * Server-Action plumbing for the admin panel.
 *
 * Every mutation under /zawadpanel returns the same `ActionResult` shape, so every form renders errors
 * the same way: one top-line message plus a map of field -> message keyed by the Zod path.
 *
 * This deliberately duplicates the seller portal's equivalent rather than importing it. The two
 * panels are owned by different parts of the codebase and must be free to diverge — an admin
 * "reject with a reason" flow has nothing to learn from a seller's product form, and a shared file
 * would quietly couple them.
 */
import { z } from 'zod'

export interface FieldErrors {
  [field: string]: string | undefined
}

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors }

/**
 * First message per field, keyed by dotted path ("priceMax", "images.0.url").
 *
 * Built from `error.issues` — the one part of the Zod surface that is stable across majors, unlike
 * `.flatten()` (deprecated in v4).
 */
export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.')
    if (key && out[key] === undefined) out[key] = issue.message
  }
  return out
}

export function invalid(
  error: z.ZodError,
  message = 'Please fix the highlighted fields.',
): { ok: false; error: string; fieldErrors: FieldErrors } {
  return { ok: false, error: message, fieldErrors: fieldErrorsOf(error) }
}

/** A refusal that isn't a validation failure — "this category still has 12 products". */
export function refuse(error: string): { ok: false; error: string } {
  return { ok: false, error }
}

/* -------------------------------------------------------------------------- */
/* Reusable field schemas                                                     */
/* -------------------------------------------------------------------------- */

/** A cuid coming back from our own UI. Bounded so a megabyte of "id" never reaches the DB. */
export const idField = z.string().trim().min(1, 'Missing id.').max(64)

/** '' | '   ' -> undefined. Optional text arrives from the DOM as an empty string, never as null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional()

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * An http(s) URL, or undefined when blank.
 *
 * Hand-checked with `URL` rather than `z.url()`, because a bare URL check happily accepts
 * `javascript:` and `data:` — and an admin pasting a banner image URL is exactly the surface where
 * that would end up rendered into every shopper's homepage.
 */
export const optionalUrl = (label = 'Enter a valid http(s) URL, or leave it blank.') =>
  z
    .string()
    .trim()
    .max(2048)
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional()
    .refine((value) => value === undefined || isHttpUrl(value), { message: label })

/** A required http(s) URL — a banner with no image is not a banner. */
export const requiredUrl = (label = 'Paste the image URL.') =>
  z
    .string()
    .trim()
    .min(1, label)
    .max(2048)
    .refine(isHttpUrl, 'That is not a valid http(s) URL.')

/** An internal path ("/products/search?x=1") or a full http(s) URL. Blank -> undefined. */
export const optionalLink = () =>
  z
    .string()
    .trim()
    .max(2048)
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional()
    .refine((value) => value === undefined || value.startsWith('/') || isHttpUrl(value), {
      message: 'Use an internal path like /products/search, or a full https:// URL.',
    })

/** Whole Taka. Rejects floats, negatives and the empty string. */
export const taka = (label: string) =>
  z
    .number({ error: `${label} must be a number.` })
    .int(`${label} must be a whole number of Taka.`)
    .min(0, `${label} cannot be negative.`)
    .max(10_000_000, `${label} looks too large.`)

/** Sort key for merchandising rows. Small on purpose — it is a hand-typed ordering, not an id. */
export const displayOrder = z
  .number({ error: 'The display order must be a number.' })
  .int('The display order must be a whole number.')
  .min(0, 'The display order cannot be negative.')
  .max(9999, 'The display order looks too large.')

/* -------------------------------------------------------------------------- */
/* Number parsing at the client boundary                                      */
/* -------------------------------------------------------------------------- */

/**
 * `<input type="number">` hands you a string, and `Number('')` is 0 — which is how an empty price
 * field silently becomes a free product. Blank means "not given" here, and Zod says so out loud.
 */
export function toNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** Same, but blank collapses to 0 — for the ordering fields, where 0 is the honest default. */
export function toNumberOr(value: string, fallback: number): number {
  return toNumber(value) ?? fallback
}
