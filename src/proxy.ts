/**
 * Proxy — Next 16's rename of `middleware`. Same job, new name, exported as `proxy`.
 *
 * This is an OPTIMISTIC check and nothing more: does a session cookie exist at all?
 * It does NOT verify the JWT and it does NOT touch the database. Prisma has no business
 * running here — the proxy sits on the hot path of every matched request, and a DB round
 * trip would tax page load for zero security benefit.
 *
 * The real authorisation happens on the page itself, in requireUser / requireSeller /
 * requireAdmin from '@/lib/auth', which re-read the user (and their role, and their shop
 * status) fresh from the DB. Forging a `gm_session` cookie buys an attacker nothing but a
 * redirect back to /login one layer deeper.
 *
 * All this saves is a pointless render of a protected page for someone who is plainly
 * signed out — and it gets them to the login screen with a `next` param so they land back
 * where they were aiming.
 */
import { NextResponse, type NextRequest } from 'next/server'

/** Must match SESSION_COOKIE in '@/lib/auth'. Duplicated on purpose: importing that module
 *  here would drag Prisma and node:crypto into the proxy bundle on every request. */
const SESSION_COOKIE = 'gm_session'

/** Areas that are meaningless when signed out. Keep in step with `config.matcher` below. */
const PROTECTED_PREFIXES = ['/seller', '/admin', '/account', '/checkout']

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // Belt and braces: the matcher already narrows to these prefixes, but a second check here
  // means loosening the matcher later can never accidentally gate the whole storefront.
  if (!isProtected(pathname)) {
    return NextResponse.next()
  }

  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next()
  }

  const loginUrl = new URL('/login', request.url)
  // Preserve the query string too, so /checkout?coupon=EID500 survives the round trip.
  loginUrl.searchParams.set('next', `${pathname}${search}`)

  return NextResponse.redirect(loginUrl)
}

export const config = {
  // `:path*` is zero-or-more segments, so '/seller/:path*' covers '/seller' itself as well as
  // '/seller/products/new'. Static assets and the storefront never hit this function at all.
  matcher: ['/seller/:path*', '/admin/:path*', '/account/:path*', '/checkout/:path*'],
}
