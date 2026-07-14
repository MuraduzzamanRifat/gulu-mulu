import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { requireUser } from '@/lib/auth'

import { getUserAddress } from '../../../_queries'
import { AddressForm } from '../../address-form'

export const metadata: Metadata = {
  title: 'Edit address',
}

/**
 * `params` is a Promise in Next 16 — always await it.
 *
 * `getUserAddress()` is scoped to the signed-in user, so another customer's address id 404s here
 * exactly as a made-up one does. It never leaks that the row exists.
 */
export default async function EditAddressPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()

  const address = await getUserAddress(user.id, id)
  if (!address) notFound()

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
        <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Edit address</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Changes apply to future orders. Orders already placed keep the address they were shipped
          to.
        </p>
      </header>

      <div className="rounded-card border border-line bg-surface p-4 sm:p-6">
        <AddressForm
          address={{
            id: address.id,
            label: address.label,
            fullName: address.fullName,
            phone: address.phone,
            division: address.division,
            district: address.district,
            area: address.area,
            addressLine: address.addressLine,
            isDefault: address.isDefault,
          }}
        />
      </div>
    </div>
  )
}
