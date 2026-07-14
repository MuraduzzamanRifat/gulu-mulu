import type { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Plus } from 'lucide-react'

import { Badge, buttonVariants, EmptyState } from '@/components/ui'
import { requireUser } from '@/lib/auth'
import { DELIVERY_FEE_INSIDE_DHAKA, DELIVERY_FEE_OUTSIDE_DHAKA } from '@/lib/pricing'
import { formatBDT } from '@/lib/format'
import { cn } from '@/lib/utils'

import { getUserAddresses } from '../_queries'
import { AddressCardActions } from './address-card-actions'

export const metadata: Metadata = {
  title: 'Addresses',
}

export default async function AccountAddressesPage() {
  const user = await requireUser()
  const addresses = await getUserAddresses(user.id)

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Addresses</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Delivery is {formatBDT(DELIVERY_FEE_INSIDE_DHAKA)} inside Dhaka and{' '}
            {formatBDT(DELIVERY_FEE_OUTSIDE_DHAKA)} everywhere else.
          </p>
        </div>

        {addresses.length > 0 ? (
          <Link
            href="/account/addresses/new"
            className={cn(buttonVariants({ variant: 'primary', size: 'md' }))}
          >
            <Plus aria-hidden="true" />
            Add address
          </Link>
        ) : null}
      </header>

      {addresses.length > 0 ? (
        <ul className="space-y-3">
          {addresses.map((address) => (
            <li
              key={address.id}
              className={cn(
                'rounded-card border bg-surface p-4',
                address.isDefault ? 'border-brand-500 ring-1 ring-brand-500/20' : 'border-line',
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-full',
                    address.isDefault
                      ? 'bg-brand-50 text-brand-600'
                      : 'bg-surface-sunken text-ink-muted',
                  )}
                >
                  <MapPin className="size-5" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{address.label ?? 'Address'}</p>
                    {address.isDefault ? <Badge variant="brand">Default</Badge> : null}
                  </div>

                  <p className="mt-1 text-sm font-medium text-ink">{address.fullName}</p>
                  <p className="text-sm text-ink-muted tabular-nums">{address.phone}</p>

                  <p className="mt-1.5 text-sm text-pretty text-ink-muted">
                    {address.addressLine}, {address.area}, {address.district}, {address.division}
                  </p>
                </div>
              </div>

              <div className="mt-3.5 border-t border-line pt-3">
                <AddressCardActions
                  addressId={address.id}
                  label={address.label ?? address.fullName}
                  isDefault={address.isDefault}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-card border border-line bg-surface">
          <EmptyState
            icon={MapPin}
            title="No saved addresses"
            description="Save an address now and checkout becomes a two-tap job — no typing your road number on a phone keyboard while the rider waits."
            action={
              // Styled <Link> — a <button> nested inside an <a> is invalid markup.
              <Link
                href="/account/addresses/new"
                className={cn(buttonVariants({ size: 'lg' }))}
              >
                <Plus aria-hidden="true" />
                Add your first address
              </Link>
            }
          />
        </div>
      )}
    </div>
  )
}
