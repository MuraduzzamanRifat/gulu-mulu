/**
 * Shared Server-Action plumbing for the seller portal.
 *
 * Every mutation in this portal returns the same shape, so every form can render errors the same
 * way: a top-line message plus a map of field -> message keyed by the Zod path.
 */
import { z } from 'zod'

export interface FieldErrors {
  [field: string]: string | undefined
}

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors }

/**
 * First message per field, keyed by dotted path ("images.0.url", "businessName").
 *
 * Built from `error.issues` — the one part of the Zod surface that is identical across v3 and v4,
 * unlike `.flatten()` (deprecated in v4) or `z.flattenError` (absent in v3).
 */
export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.')
    if (key && out[key] === undefined) out[key] = issue.message
  }
  return out
}

export function invalid(error: z.ZodError, message = 'Please fix the highlighted fields.'): {
  ok: false
  error: string
  fieldErrors: FieldErrors
} {
  return { ok: false, error: message, fieldErrors: fieldErrorsOf(error) }
}

/* -------------------------------------------------------------------------- */
/* Reusable field schemas                                                     */
/* -------------------------------------------------------------------------- */

/** '' | '  ' -> undefined. Optional text fields arrive from the DOM as empty strings, never null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional()

/**
 * An http(s) URL, or undefined when blank.
 *
 * Hand-checked with `URL` rather than `z.url()` / `.url()`, both of which moved between Zod
 * majors — and because we need to reject `javascript:` and `data:`, which a bare URL check allows.
 */
export const optionalUrl = (label = 'Enter a valid http(s) URL, or leave it blank.') =>
  z
    .string()
    .trim()
    .max(2048)
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional()
    .refine((value) => value === undefined || isHttpUrl(value), { message: label })

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** Whole Taka. Rejects floats, negatives and the empty string. */
export const taka = (label: string) =>
  z
    .number({ error: `${label} must be a number.` })
    .int(`${label} must be a whole number of Taka.`)
    .min(0, `${label} cannot be negative.`)
    .max(10_000_000, `${label} looks too large.`)
