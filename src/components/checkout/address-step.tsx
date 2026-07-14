'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, MapPin, Plus } from 'lucide-react'

import { Badge, Button } from '@/components/ui'
import { cn } from '@/lib/utils'

import { AddressForm } from './address-form'
import { checkoutHref } from './checkout-steps'

/** The address, flattened to what the picker actually renders. Serialisable across the RSC seam. */
export interface CheckoutAddress {
  id: string
  label: string | null
  fullName: string
  phone: string
  division: string
  district: string
  area: string
  addressLine: string
  isDefault: boolean
}

export interface AddressStepProps {
  addresses: readonly CheckoutAddress[]
  /** From `?address=` — already re-validated server-side as belonging to this user. */
  selectedId: string | null
  /** Carried through the URL so switching address doesn't forget the payment method. */
  method: string | null
  defaultFullName: string
  defaultPhone: string
}

export function AddressStep({
  addresses,
  selectedId,
  method,
  defaultFullName,
  defaultPhone,
}: AddressStepProps) {
  const router = useRouter()

  const [chosen, setChosen] = React.useState<string | null>(selectedId)
  // A shopper with no saved address has nothing to pick, so open straight into the form.
  const [adding, setAdding] = React.useState(addresses.length === 0)
  const [navigating, startNavigation] = React.useTransition()

  function goToDelivery(addressId: string) {
    startNavigation(() => {
      router.push(checkoutHref({ step: 'delivery', addressId, method }))
    })
  }

  return (
    <section className="rounded-card border border-line bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <h2 className="text-base font-semibold text-ink">Delivery address</h2>

        {addresses.length > 0 && !adding ? (
          <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            Add new
          </Button>
        ) : null}
      </header>

      <div className="p-4 sm:p-5">
        {adding ? (
          <AddressForm
            onSaved={(addressId) => {
              setChosen(addressId)
              setAdding(false)
              goToDelivery(addressId)
            }}
            onCancel={() => setAdding(false)}
            defaultFullName={defaultFullName}
            defaultPhone={defaultPhone}
            isFirstAddress={addresses.length === 0}
          />
        ) : (
          <>
            <ul role="radiogroup" aria-label="Saved addresses" className="space-y-3">
              {addresses.map((address) => {
                const active = chosen === address.id

                return (
                  <li key={address.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer gap-3 rounded-lg border p-3.5 transition-colors sm:p-4',
                        active
                          ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500'
                          : 'border-line hover:border-line-strong hover:bg-surface-muted',
                      )}
                    >
                      <input
                        type="radio"
                        name="addressId"
                        value={address.id}
                        checked={active}
                        onChange={() => setChosen(address.id)}
                        className="mt-0.5 size-4 shrink-0 cursor-pointer border-line text-brand-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-ink">{address.fullName}</span>

                          {address.label ? (
                            <Badge variant="neutral" size="sm">
                              {address.label}
                            </Badge>
                          ) : null}

                          {address.isDefault ? (
                            <Badge variant="brand" size="sm">
                              Default
                            </Badge>
                          ) : null}
                        </div>

                        <p className="mt-1 text-sm text-ink-muted">{address.phone}</p>

                        <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-muted">
                          <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            {address.addressLine}, {address.area}, {address.district},{' '}
                            {address.division}
                          </span>
                        </p>

                        {address.district === 'Dhaka' ? (
                          <p className="mt-1.5 text-xs text-success">Inside Dhaka — ৳60 delivery</p>
                        ) : (
                          <p className="mt-1.5 text-xs text-ink-muted">
                            Outside Dhaka — ৳120 delivery
                          </p>
                        )}
                      </div>
                    </label>
                  </li>
                )
              })}
            </ul>

            <div className="mt-5">
              <Button
                size="lg"
                fullWidth
                loading={navigating}
                disabled={!chosen}
                onClick={() => chosen && goToDelivery(chosen)}
              >
                Deliver to this address
                <ArrowRight aria-hidden="true" />
              </Button>

              {!chosen ? (
                <p className="mt-2 text-center text-xs text-ink-muted">
                  Choose an address to continue.
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
