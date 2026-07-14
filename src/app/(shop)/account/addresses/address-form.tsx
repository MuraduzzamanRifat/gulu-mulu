'use client'

import * as React from 'react'
import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'

import { Button, Input, Label, Select, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'

import {
  EMPTY_ADDRESS_STATE,
  saveAddressAction,
  type AddressFormState,
} from './_actions'
import { areasOf, DIVISION_NAMES, districtsOf } from './bd-locations'

export interface AddressFormValues {
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

export interface AddressFormProps {
  /** Absent = create. Present = edit that address. */
  address?: AddressFormValues
  /** Seeds the name/phone on a first address from the signed-in user. */
  defaultFullName?: string
  defaultPhone?: string
  /** True when this is the account's very first address — it becomes the default automatically. */
  isFirstAddress?: boolean
}

const LABEL_SUGGESTIONS = ['Home', 'Office', 'Parents', 'Hostel']

/**
 * Add / edit a delivery address.
 *
 * DIVISION -> DISTRICT -> AREA cascade: choosing a division rebuilds the district list and blanks
 * the two below it. That is not just convenience — an address whose district doesn't sit in its
 * division gets the wrong delivery fee from `calcDeliveryFee()` and goes to the wrong hub. The
 * Server Action re-checks the trio with `isValidLocation()` regardless, because these three selects
 * are, over the wire, just three strings anyone can post.
 *
 * A real `<form>` bound to a Server Action via `useActionState`: the fields are named, the submit
 * is a submit, and everything except the cascade keeps working if the JS never arrives.
 */
export function AddressForm({
  address,
  defaultFullName,
  defaultPhone,
  isFirstAddress = false,
}: AddressFormProps) {
  // `.bind` sends the id to the server as a sealed argument — it is never a form field, so it can
  // never be swapped for someone else's address id by editing the DOM.
  const boundAction = React.useMemo(
    () => saveAddressAction.bind(null, address?.id ?? null),
    [address?.id],
  )

  const [state, formAction, pending] = React.useActionState<AddressFormState, FormData>(
    boundAction,
    EMPTY_ADDRESS_STATE,
  )

  const [division, setDivision] = React.useState(address?.division ?? '')
  const [district, setDistrict] = React.useState(address?.district ?? '')
  const [area, setArea] = React.useState(address?.area ?? '')

  const districts = division ? districtsOf(division) : []
  const areas = division && district ? areasOf(division, district) : []

  const errors = state.fieldErrors ?? {}

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-danger"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      ) : null}

      <div>
        <Label htmlFor="address-label">Label</Label>
        <Input
          id="address-label"
          name="label"
          maxLength={24}
          defaultValue={address?.label ?? ''}
          placeholder="Home, Office…"
          list="address-label-suggestions"
          disabled={pending}
          error={errors.label}
          autoComplete="off"
        />
        <datalist id="address-label-suggestions">
          {LABEL_SUGGESTIONS.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="address-fullName" required>
            Full name
          </Label>
          <Input
            id="address-fullName"
            name="fullName"
            maxLength={80}
            defaultValue={address?.fullName ?? defaultFullName ?? ''}
            placeholder="Who is receiving this?"
            autoComplete="name"
            disabled={pending}
            error={errors.fullName}
          />
        </div>

        <div>
          <Label htmlFor="address-phone" required>
            Mobile number
          </Label>
          <Input
            id="address-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            maxLength={20}
            defaultValue={address?.phone ?? defaultPhone ?? ''}
            placeholder="01712345678"
            autoComplete="tel"
            disabled={pending}
            error={errors.phone}
            className="tabular-nums"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <Label htmlFor="address-division" required>
            Division
          </Label>
          <Select
            id="address-division"
            name="division"
            value={division}
            disabled={pending}
            error={errors.division}
            onChange={(event) => {
              setDivision(event.target.value)
              // A district from the old division would be nonsense under the new one.
              setDistrict('')
              setArea('')
            }}
          >
            <option value="">Select division</option>
            {DIVISION_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="address-district" required>
            District
          </Label>
          <Select
            id="address-district"
            name="district"
            value={district}
            disabled={pending || !division}
            error={errors.district}
            onChange={(event) => {
              setDistrict(event.target.value)
              setArea('')
            }}
          >
            <option value="">{division ? 'Select district' : 'Pick a division first'}</option>
            {districts.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="address-area" required>
            Area
          </Label>
          <Select
            id="address-area"
            name="area"
            value={area}
            disabled={pending || !district}
            error={errors.area}
            onChange={(event) => setArea(event.target.value)}
          >
            <option value="">{district ? 'Select area' : 'Pick a district first'}</option>
            {areas.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="address-addressLine" required>
          House, road and landmark
        </Label>
        <Textarea
          id="address-addressLine"
          name="addressLine"
          rows={3}
          maxLength={240}
          defaultValue={address?.addressLine ?? ''}
          placeholder="House 12, Road 7, Block C — beside the mosque"
          autoComplete="street-address"
          disabled={pending}
          error={errors.addressLine}
        />
        <p className="mt-1.5 text-xs text-ink-subtle">
          The more specific this is, the fewer calls you&rsquo;ll get from the rider.
        </p>
      </div>

      {isFirstAddress ? (
        <p className="rounded-lg bg-surface-muted p-3 text-sm text-ink-muted">
          This is your first address, so we&rsquo;ll set it as your default for checkout.
        </p>
      ) : (
        <label
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3',
            'transition-colors hover:bg-surface-muted has-checked:border-brand-500 has-checked:bg-brand-50',
          )}
        >
          <input
            type="checkbox"
            name="isDefault"
            defaultChecked={address?.isDefault ?? false}
            disabled={pending}
            className="mt-0.5 size-4 shrink-0 accent-brand-500"
          />
          <span>
            <span className="block text-sm font-medium text-ink">
              Make this my default address
            </span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              It&rsquo;ll be preselected every time you check out.
            </span>
          </span>
        </label>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Link href="/account/addresses" className="sm:w-auto">
          <Button type="button" variant="outline" size="lg" fullWidth disabled={pending}>
            Cancel
          </Button>
        </Link>

        <Button type="submit" size="lg" loading={pending} className="sm:min-w-44">
          {address ? 'Save changes' : 'Save address'}
        </Button>
      </div>
    </form>
  )
}
