import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

import { AddressForm } from '../address-form'

export const metadata: Metadata = {
  title: 'Add an address',
}

export default async function NewAddressPage() {
  const user = await requireUser()

  // Drives the "this will be your default" note — and the action enforces it regardless.
  const existingCount = await prisma.address.count({ where: { userId: user.id } })

  return (
    <div>
      <Link
        href="/account/addresses"
        className="-ml-1 mb-3 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to addresses
      </Link>

      <header className="mb-5">
        <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
          Add an address
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Where should we deliver? Pick your division, district and area, then add the details.
        </p>
      </header>

      <div className="rounded-card border border-line bg-surface p-4 sm:p-6">
        <AddressForm
          defaultFullName={user.name ?? ''}
          defaultPhone={user.phone}
          isFirstAddress={existingCount === 0}
        />
      </div>
    </div>
  )
}
