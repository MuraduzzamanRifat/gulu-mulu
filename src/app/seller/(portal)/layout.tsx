import type { Metadata } from 'next'

import { requireSeller } from '@/lib/auth'

import { PortalShell } from '../_components/portal-shell'

export const metadata: Metadata = {
  title: { default: 'Seller Centre', template: '%s · Seller Centre | Gulu Mulu' },
  robots: { index: false, follow: false },
}

/**
 * The gate for the whole portal.
 *
 * `requireSeller()` re-reads the user AND the shop from the database on every request, so an admin
 * suspending a shop locks it out on the very next page load. It sends a user with no shop to
 * /seller/register and an unapproved shop to /seller/pending — which is exactly why those two pages
 * live in the sibling (onboarding) group, outside this layout. Putting them here would loop.
 */
export default async function SellerPortalLayout({ children }: { children: React.ReactNode }) {
  const { seller } = await requireSeller()

  return (
    <PortalShell
      seller={{
        businessName: seller.businessName,
        logoUrl: seller.logoUrl,
        commissionRate: seller.commissionRate,
      }}
    >
      {children}
    </PortalShell>
  )
}
