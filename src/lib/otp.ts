/**
 * Phone-OTP: the front door of Gulu Mulu.
 *
 * Bangladesh is a phone-first market — most shoppers have no email address they check,
 * so the mobile number IS the identity. There is no password anywhere in this app.
 *
 * Flow: requestOtp(phone) -> SMS -> verifyOtp(phone, code) -> User (created on first login).
 *
 * In dev (`DEV_OTP_BYPASS="true"` in .env) no SMS is sent, the code is always `123456`,
 * and it is printed to the server console so you can log in without a phone.
 *
 * Every function returns a typed result instead of throwing, so Server Actions can put
 * `result.error` straight on the screen.
 */
import { randomInt } from 'node:crypto'

import { prisma } from '@/lib/db'
import { isValidBdPhone, normalizeBdPhone } from '@/lib/format'
import { Role } from '@/generated/prisma/client'
import type { User } from '@/generated/prisma/client'

/** How long a freshly issued code stays usable. */
const OTP_TTL_MS = 5 * 60 * 1000
/** A phone may not be sent a second code inside this window (anti-SMS-bombing + cost control). */
const OTP_RESEND_COOLDOWN_MS = 60 * 1000
const OTP_LENGTH = 6
/** The fixed code accepted (and issued) when DEV_OTP_BYPASS is on. Never reachable in prod. */
const DEV_OTP = '123456'

/** True when we skip real SMS and hardcode the OTP. Driven by .env, off by default. */
export function isDevOtpBypass(): boolean {
  return process.env.DEV_OTP_BYPASS === 'true'
}

export type RequestOtpResult =
  | {
      ok: true
      /** The canonical 01XXXXXXXXX form — pass THIS to verifyOtp, not the raw input. */
      phone: string
      /** Only ever set in dev. The UI renders it in a yellow "dev mode" banner. */
      devCode?: string
    }
  | { ok: false; error: string; retryAfterSeconds?: number }

export type VerifyOtpResult =
  | { ok: true; user: User; isNewUser: boolean }
  | { ok: false; error: string }

const INVALID_PHONE_ERROR = 'Enter a valid Bangladeshi mobile number, e.g. 01712345678.'

/** Six cryptographically-random digits (leading zeros preserved — it's a string, not a number). */
function generateOtpCode(): string {
  if (isDevOtpBypass()) return DEV_OTP

  let code = ''
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += randomInt(0, 10).toString()
  }
  return code
}

/**
 * Deliver the code over SMS.
 *
 * BD bulk-SMS gateways (BulkSMSBD, SSL Wireless, Alpha Net, Reve …) all expose the same
 * shape: a form-encoded POST with an API key, a sender ID and an 8801XXXXXXXXX number.
 * Configure SMS_API_URL / SMS_API_KEY / SMS_SENDER_ID to switch real sending on.
 *
 * With no gateway configured this refuses loudly rather than pretending it sent — otherwise
 * a misconfigured production deploy would silently lock every user out.
 */
async function sendOtpSms(phone: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiUrl = process.env.SMS_API_URL
  const apiKey = process.env.SMS_API_KEY
  const senderId = process.env.SMS_SENDER_ID

  if (!apiUrl || !apiKey || !senderId) {
    console.error(
      `[otp] SMS gateway is not configured (need SMS_API_URL, SMS_API_KEY, SMS_SENDER_ID). ` +
        `Cannot deliver a code to ${phone}. Set DEV_OTP_BYPASS="true" for local development.`,
    )
    return { ok: false, error: 'SMS is temporarily unavailable. Please try again shortly.' }
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        api_key: apiKey,
        senderid: senderId,
        // Gateways want the country code: 01712345678 -> 8801712345678
        number: `88${phone}`,
        message: `Your Gulu Mulu code is ${code}. It expires in 5 minutes. Never share it with anyone.`,
      }),
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error(`[otp] SMS gateway responded ${response.status} ${response.statusText} for ${phone}`)
      return { ok: false, error: 'We could not send the SMS. Please try again.' }
    }

    return { ok: true }
  } catch (error) {
    console.error(`[otp] SMS gateway request failed for ${phone}`, error)
    return { ok: false, error: 'We could not send the SMS. Please try again.' }
  }
}

/**
 * Issue a login code for a phone number.
 *
 * Refuses if an unconsumed, unexpired code was already issued in the last 60 seconds, so a
 * mashed "Resend" button can't burn SMS credit or spam a stranger's handset.
 */
export async function requestOtp(phone: string): Promise<RequestOtpResult> {
  const normalized = normalizeBdPhone(phone)
  if (!isValidBdPhone(normalized)) {
    return { ok: false, error: INVALID_PHONE_ERROR }
  }

  const now = new Date()

  // Rate limit: is there a still-live code from within the cooldown window?
  const recent = await prisma.otpCode.findFirst({
    where: {
      phone: normalized,
      consumedAt: null,
      expiresAt: { gt: now },
      createdAt: { gt: new Date(now.getTime() - OTP_RESEND_COOLDOWN_MS) },
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  if (recent) {
    const elapsedMs = now.getTime() - recent.createdAt.getTime()
    const retryAfterSeconds = Math.max(1, Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsedMs) / 1000))
    return {
      ok: false,
      error: `We just sent you a code. Please wait ${retryAfterSeconds}s before asking for another.`,
      retryAfterSeconds,
    }
  }

  // Exactly one code may be live per phone: retire any older survivors before minting a new one,
  // so an abandoned code from 4 minutes ago can't be replayed after the user asks for a fresh one.
  await prisma.otpCode.updateMany({
    where: { phone: normalized, consumedAt: null, expiresAt: { gt: now } },
    data: { expiresAt: now },
  })

  const code = generateOtpCode()
  const otp = await prisma.otpCode.create({
    data: {
      phone: normalized,
      code,
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    },
    select: { id: true },
  })

  if (isDevOtpBypass()) {
    console.log(
      `\n${'='.repeat(56)}\n` +
        `  DEV OTP for ${normalized}  ->  ${code}\n` +
        `  (DEV_OTP_BYPASS is on: no SMS sent, code valid 5 minutes)\n` +
        `${'='.repeat(56)}\n`,
    )
    return { ok: true, phone: normalized, devCode: code }
  }

  const sent = await sendOtpSms(normalized, code)
  if (!sent.ok) {
    // The SMS never left the building, so don't hold the user to the resend cooldown —
    // kill the code we just minted and let them hit the button again straight away.
    await prisma.otpCode.update({ where: { id: otp.id }, data: { expiresAt: now } })
    return { ok: false, error: sent.error }
  }

  return { ok: true, phone: normalized }
}

/**
 * Check a code and sign the person in.
 *
 * On success the code is burned (single use) and the User is created if this is their first
 * ever login — that's the entire signup flow in this market: type your number, type the code.
 *
 * Caller must still call `createSession(user.id)` from '@/lib/auth' — this function only
 * establishes WHO they are, it does not set the cookie.
 */
export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  const normalized = normalizeBdPhone(phone)
  if (!isValidBdPhone(normalized)) {
    return { ok: false, error: INVALID_PHONE_ERROR }
  }

  // Users paste codes with spaces ("123 456") and BD keyboards love a stray dash.
  const submitted = code.replace(/\D/g, '')
  if (submitted.length !== OTP_LENGTH) {
    return { ok: false, error: `Enter the ${OTP_LENGTH}-digit code we sent you.` }
  }

  const now = new Date()
  const devBypass = isDevOtpBypass() && submitted === DEV_OTP

  const match = await prisma.otpCode.findFirst({
    where: {
      phone: normalized,
      code: submitted,
      consumedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  if (!match && !devBypass) {
    return { ok: false, error: 'That code is wrong or has expired. Request a new one.' }
  }

  if (match) {
    // Guarded on `consumedAt: null` so two rapid submits of the same code can't both win.
    const consumed = await prisma.otpCode.updateMany({
      where: { id: match.id, consumedAt: null },
      data: { consumedAt: now },
    })

    if (consumed.count !== 1 && !devBypass) {
      return { ok: false, error: 'That code has already been used. Request a new one.' }
    }
  }

  // Find-or-create: in a phone-OTP world there is no separate "register" step.
  let user = await prisma.user.findUnique({ where: { phone: normalized } })
  let isNewUser = false

  if (!user) {
    try {
      user = await prisma.user.create({
        data: { phone: normalized, role: Role.CUSTOMER },
      })
      isNewUser = true
    } catch {
      // Lost a race with a concurrent verify for the same number — the row exists now.
      user = await prisma.user.findUnique({ where: { phone: normalized } })
      if (!user) {
        return { ok: false, error: 'We could not sign you in. Please try again.' }
      }
    }
  }

  return { ok: true, user, isNewUser }
}
