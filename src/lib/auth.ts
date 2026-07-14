/**
 * Sessions and authorisation.
 *
 * No auth library — a session is just a JWT signed with `jose` (HS256, AUTH_SECRET) living in an
 * httpOnly cookie. The JWT carries ONE claim: the user id. Nothing else.
 *
 * That is deliberate. Roles, seller status and bans are read from the database on every request,
 * never from the token — so demoting a seller or suspending a shop takes effect on their very
 * next page load instead of whenever their 7-day token happens to lapse.
 *
 * Every DB-touching read here is wrapped in React `cache()`, so a layout, a page and the header
 * can all call `getCurrentUser()` in one render and only one query goes to SQLite. Safe to call
 * from any Server Component or Server Action.
 *
 * NOTE: cookies() is async in Next 16 — every function that touches it is async.
 */
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SignJWT, jwtVerify } from 'jose'

import { prisma } from '@/lib/db'
import { Role, SellerStatus } from '@/generated/prisma/client'
import type { Seller, User } from '@/generated/prisma/client'

/** Keep in sync with the literal in src/proxy.ts (the proxy must not import this module). */
export const SESSION_COOKIE = 'gm_session'

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days
const JWT_ALG = 'HS256'

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET is missing. Add it to .env — sessions cannot be signed without it.')
  }
  return new TextEncoder().encode(secret)
}

/* -------------------------------------------------------------------------- */
/* Session lifecycle                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Sign the user in: mint a 7-day JWT and drop it in the `gm_session` cookie.
 * Call this from a Server Action right after `verifyOtp()` hands you a user.
 */
export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: JWT_ALG })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey())

  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true, // JS can never read it — kills cookie theft via XSS
    sameSite: 'lax', // survives top-level navigation back from bKash/SSLCommerz
    secure: process.env.NODE_ENV === 'production', // plain http on localhost, https-only live
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

/** Sign the user out. */
export async function destroySession(): Promise<void> {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

/**
 * The user id inside the session cookie, or null.
 * A missing, malformed, tampered or expired token is simply "not signed in" — never an exception.
 */
async function readSessionUserId(): Promise<string | null> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null

  // Resolved outside the try: a missing AUTH_SECRET is a deployment fault and must be loud,
  // not quietly downgraded to "logged out" for every visitor.
  const key = getSecretKey()

  try {
    const { payload } = await jwtVerify(token, key, { algorithms: [JWT_ALG] })
    return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------------- */
/* Reads (nullable)                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The signed-in user, loaded FRESH from the DB on every request — so a role change or a deleted
 * account is honoured immediately. Returns null when signed out. Never throws on a bad token.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const userId = await readSessionUserId()
  if (!userId) return null

  // The token can outlive the row (account deleted) — findUnique returning null is the answer.
  return prisma.user.findUnique({ where: { id: userId } })
})

/**
 * The current user's shop, or null if they don't have one.
 * Nullable variant for conditional UI ("Seller Centre" link in the header).
 * NOTE: the returned shop is NOT necessarily APPROVED — check `seller.status` before trusting it.
 */
export const getCurrentSeller = cache(async (): Promise<Seller | null> => {
  const user = await getCurrentUser()
  if (!user) return null

  return prisma.seller.findUnique({ where: { userId: user.id } })
})

/** Convenience predicate for header/nav UI. */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === Role.ADMIN
}

/* -------------------------------------------------------------------------- */
/* Gates (redirecting)                                                        */
/* -------------------------------------------------------------------------- */

/** Signed in, or bounced to /login. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

/**
 * A seller with an APPROVED shop, or bounced somewhere useful.
 *
 * This is the real authorisation check — the proxy only looks at whether a cookie exists.
 *
 *  - not signed in        -> /login
 *  - no shop yet          -> /seller/register  (the onboarding funnel)
 *  - shop not approved    -> /seller/pending   (PENDING / REJECTED / SUSPENDED)
 *  - role revoked by admin-> /
 */
export async function requireSeller(): Promise<{ user: User; seller: Seller }> {
  const user = await requireUser()

  const seller = await prisma.seller.findUnique({ where: { userId: user.id } })
  if (!seller) redirect('/seller/register')

  // Checked after the shop lookup so a plain CUSTOMER lands on the sign-up funnel above rather
  // than being dumped on the homepage. Reaching here with a CUSTOMER role means an admin
  // actively demoted them, and they lose access at once — the JWT gets no say.
  if (user.role !== Role.SELLER && user.role !== Role.ADMIN) redirect('/')

  if (seller.status !== SellerStatus.APPROVED) redirect('/seller/pending')

  return { user, seller }
}

/** An admin, or bounced to the homepage. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser()
  if (user.role !== Role.ADMIN) redirect('/')
  return user
}
