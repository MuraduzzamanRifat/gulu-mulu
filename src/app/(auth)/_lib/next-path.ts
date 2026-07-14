/**
 * `?next=` handling — the difference between a deep-link that survives login and one that
 * silently dumps the shopper on the homepage.
 *
 * `src/proxy.ts` appends `?next=<pathname><search>` to every gated redirect, so /login is
 * responsible for sending people back where they were actually going.
 *
 * SECURITY: this is an open-redirect sink. Anything that is not unambiguously a path on THIS
 * origin is thrown away and replaced with '/'. The rules, in order:
 *
 *   "/account/orders"      -> kept
 *   "/checkout?coupon=EID" -> kept (the proxy preserves the query string)
 *   "https://evil.com"     -> '/'  (absolute URL)
 *   "//evil.com"           -> '/'  (protocol-relative — the classic bypass)
 *   "/\evil.com"           -> '/'  (backslash: browsers normalise \ to / in the authority)
 *   "/login?next=/login"   -> '/'  (would bounce the user straight back here)
 *   "javascript:alert(1)"  -> '/'  (no leading slash)
 *
 * Both the page (to build the form) and the Server Action (which must never trust what the
 * client posts back) run every candidate through this.
 */

/** Never send someone back to a page that would immediately bounce them out again. */
const LOOPING_PREFIXES = ['/login', '/logout']

export const DEFAULT_NEXT_PATH = '/'

/**
 * CR, LF, TAB, NUL and friends. A control character in a redirect target is a header-injection
 * attempt, never a real path. Done by char code rather than a regex so no control character has
 * to be embedded in this source file.
 */
function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 0x20 || code === 0x7f) return true
  }
  return false
}

export function safeNextPath(candidate: string | string[] | undefined | null): string {
  // Next gives an array when a param is repeated (?next=/a&next=/b). Take the first only.
  const raw = Array.isArray(candidate) ? candidate[0] : candidate
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) return DEFAULT_NEXT_PATH

  if (hasControlChars(raw)) return DEFAULT_NEXT_PATH

  // Must be same-origin and rooted. "//host" and "/\host" both resolve off-origin in browsers.
  if (!raw.startsWith('/')) return DEFAULT_NEXT_PATH
  if (raw.startsWith('//') || raw.startsWith('/\\')) return DEFAULT_NEXT_PATH

  const pathname = raw.split(/[?#]/, 1)[0]
  if (LOOPING_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return DEFAULT_NEXT_PATH
  }

  return raw
}
