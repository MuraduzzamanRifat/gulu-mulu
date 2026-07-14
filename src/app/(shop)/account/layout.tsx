import type { Metadata } from 'next'

import { requireUser } from '@/lib/auth'

import { AccountNav } from './account-nav'

export const metadata: Metadata = {
  title: { default: 'My account', template: '%s | My account | Gulu Mulu' },
  // An account area has nothing a search engine should ever see.
  robots: { index: false, follow: false },
}

/**
 * The customer account shell.
 *
 * `requireUser()` here gates EVERY page beneath it in one place — it re-reads the user from the
 * database, so a deleted or demoted account is bounced immediately. src/proxy.ts only checks that
 * a cookie exists; this is the real gate.
 *
 * Renders inside the (shop) shell, so the header, footer and mobile tab bar come for free.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:py-8">
      <div className="lg:flex lg:gap-8">
        <aside className="lg:w-64 lg:shrink-0">
          <AccountNav name={user.name} phone={user.phone} />
        </aside>

        {/* min-w-0 is load-bearing: without it a long order number or a wide table stretches the
            flex item and the whole page scrolls sideways on a phone. */}
        <div className="min-w-0 flex-1 pt-5 lg:pt-0">{children}</div>
      </div>
    </div>
  )
}
