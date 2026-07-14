import type { Metadata } from 'next'
import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui'
import { requireUser } from '@/lib/auth'
import { formatDate } from '@/lib/format'

import { ProfileForm } from './profile-form'

export const metadata: Metadata = {
  title: 'Profile',
}

export default async function AccountProfilePage() {
  const user = await requireUser()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Profile</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Member since {formatDate(user.createdAt)}.
        </p>
      </header>

      <div className="rounded-card border border-line bg-surface p-4 sm:p-6">
        <ProfileForm name={user.name} email={user.email} phone={user.phone} />
      </div>

      {/* On lg+ the sidebar carries sign-out. On a phone the sidebar is a tab rail with no room
          for it, so this is the only way out — a real form, working with or without JS. */}
      <section className="rounded-card border border-line bg-surface p-4 lg:hidden">
        <h2 className="text-sm font-semibold text-ink">Sign out</h2>
        <p className="mt-1 mb-3 text-sm text-ink-muted">
          You&rsquo;ll need your mobile number and a fresh code to get back in.
        </p>

        <form action="/logout" method="post">
          <Button type="submit" variant="outline" fullWidth className="text-danger">
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </form>
      </section>
    </div>
  )
}
