import { revalidatePath } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'

import { destroySession, SESSION_COOKIE } from '@/lib/auth'

/**
 * /logout — destroy the session, go home.
 *
 * A Route Handler rather than a page, so a plain `<form method="post" action="/logout">` signs
 * you out with the JS bundle switched off entirely.
 *
 * The cookie is cleared TWICE on purpose. `destroySession()` mutates the request-scoped cookie
 * store from '@/lib/auth' (the single source of truth for the cookie's name and options), and the
 * explicit `response.cookies.delete()` guarantees the `Set-Cookie` lands on THIS response no
 * matter how the store is merged. A logout that half-works is a security bug, not a UX one.
 *
 * 303 (not 307/308) is the correct redirect after a POST: it tells the browser to follow with a
 * GET, so refreshing the homepage afterwards doesn't re-post the sign-out.
 */
async function signOut(request: NextRequest): Promise<NextResponse> {
  await destroySession()

  // The header, the cart badge and every wishlist heart render differently signed out.
  revalidatePath('/', 'layout')

  const response = NextResponse.redirect(new URL('/', request.url), { status: 303 })
  response.cookies.delete(SESSION_COOKIE)

  return response
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return signOut(request)
}

/**
 * GET is supported so a bare `<a href="/logout">` works too (an email footer, a bookmark, a
 * shared-device panic link). Route Handlers are never prefetched by <Link>, so this cannot be
 * triggered by hovering a link.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return signOut(request)
}
