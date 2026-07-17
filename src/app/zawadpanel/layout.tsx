import type { Metadata } from 'next'

import { requireAdmin } from '@/lib/auth'

import { AdminShell } from './_components/admin-shell'
import { getAttentionCounts } from './_lib/data'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin | Gulu Mulu' },
  // An internal console has no business in anyone's search index.
  robots: { index: false, follow: false, nocache: true },
}

/**
 * The gate for the entire admin console.
 *
 * `requireAdmin()` re-reads the user FROM THE DATABASE on every request and checks `role === ADMIN`
 * — it never trusts the JWT's claims, so revoking someone's admin role locks them out on their very
 * next page load rather than whenever their 7-day token happens to lapse.
 *
 * `src/proxy.ts` also bounces `/zawadpanel/*` when there is no session cookie at all, but that is an
 * optimisation, not the security boundary: it only checks that a cookie EXISTS. This layout is the
 * boundary. Every page below it re-asserts the gate anyway (see the `requireAdmin()` call at the
 * top of each one) — a layout is not a security perimeter you should bet a marketplace on alone,
 * because a route that is one day moved out from under it would silently lose its lock.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Sequential on purpose. Racing the gate against the data with Promise.all would fire an admin-only
  // query for a caller we have not yet established is an admin — harmless today, and exactly the
  // habit that leaks something tomorrow. The gate resolves first, always.
  const admin = await requireAdmin()
  const attention = await getAttentionCounts()

  return (
    <AdminShell admin={{ name: admin.name, phone: admin.phone }} attention={attention}>
      {children}
    </AdminShell>
  )
}
