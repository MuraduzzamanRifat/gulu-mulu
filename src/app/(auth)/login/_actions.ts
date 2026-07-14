'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createSession } from '@/lib/auth'
import { mergeGuestCartIntoUser } from '@/lib/cart'
import { isValidBdPhone } from '@/lib/format'
import { requestOtp, verifyOtp } from '@/lib/otp'

import { safeNextPath } from '../_lib/next-path'

/* -------------------------------------------------------------------------- */
/* Step 1 — send the code                                                     */
/* -------------------------------------------------------------------------- */

const INVALID_PHONE = 'Enter a valid Bangladeshi mobile number, e.g. 01712345678.'

const requestSchema = z.object({
  // Bounded before it ever reaches normalisation — a megabyte of "0" is not a phone number.
  phone: z.string().trim().min(1, INVALID_PHONE).max(24, INVALID_PHONE).refine(isValidBdPhone, INVALID_PHONE),
})

export type RequestCodeResult =
  | {
      ok: true
      /** The NORMALISED 01XXXXXXXXX number. Step 2 must send back THIS, not what was typed. */
      phone: string
      /** Dev only (DEV_OTP_BYPASS). Drives the amber banner. Never set in production. */
      devCode?: string
    }
  | { ok: false; error: string; retryAfterSeconds?: number }

/**
 * Issue an OTP. `requestOtp()` owns the rate limit (60s per number) and the SMS gateway;
 * this action only guards the input and passes its typed result straight to the UI, so the
 * cooldown, the dev code and every error message survive the trip to the client untouched.
 */
export async function requestCodeAction(input: { phone: string }): Promise<RequestCodeResult> {
  const parsed = requestSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? INVALID_PHONE }
  }

  return requestOtp(parsed.data.phone)
}

/* -------------------------------------------------------------------------- */
/* Step 2 — verify, sign in, merge the guest cart, go where they were going    */
/* -------------------------------------------------------------------------- */

const verifySchema = z.object({
  phone: z.string().trim().min(1, INVALID_PHONE).max(24, INVALID_PHONE).refine(isValidBdPhone, INVALID_PHONE),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code we sent you.'),
  // Re-validated below — the client sends this back and the client is never trusted.
  next: z.string().max(512).optional(),
})

/** Only the failure shape is ever returned: success ends in a redirect, which never resolves. */
export type VerifyCodeResult = { ok: false; error: string }

/**
 * Verify the code and complete the sign-in.
 *
 * The ORDER of the three calls below is the whole point of this action:
 *   1. verifyOtp()             — establishes WHO they are. Sets no cookie.
 *   2. createSession()         — mints the session JWT. Now they are signed in.
 *   3. mergeGuestCartIntoUser()— folds the `gm_cart` guest cart into their account cart.
 *
 * Merging AFTER the session exists is what stops the classic "I added three things, signed in,
 * and my cart was empty" bug that quietly kills conversion on phone-first marketplaces.
 *
 * NOTE: `redirect()` throws — it must not sit inside a try/catch, or the sign-in would silently
 * swallow its own navigation.
 */
export async function verifyCodeAction(input: {
  phone: string
  code: string
  next?: string
}): Promise<VerifyCodeResult | void> {
  const parsed = verifySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the code and try again.' }
  }

  const result = await verifyOtp(parsed.data.phone, parsed.data.code)
  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  await createSession(result.user.id)
  await mergeGuestCartIntoUser(result.user.id)

  // The whole tree is rendered differently when signed in — header account menu, cart badge,
  // wishlist hearts. 'layout' clears every cached segment below the root, not just this page.
  revalidatePath('/', 'layout')

  redirect(safeNextPath(parsed.data.next))
}
