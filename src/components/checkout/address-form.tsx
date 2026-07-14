'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { Button, Input, Label, Select, Textarea } from '@/components/ui'
import { createAddress } from '@/app/(shop)/checkout/_actions'

import { BD_DIVISIONS, districtsOf } from './locations'

export interface AddressFormProps {
  /** Called with the new address id once the Server Action has saved it. */
  onSaved: (addressId: string) => void
  onCancel?: () => void
  /** Pre-fill the recipient from the account, so the common case is two taps and a road name. */
  defaultFullName?: string
  defaultPhone?: string
  /** No saved addresses yet — then there is nothing to cancel back to. */
  isFirstAddress?: boolean
}

type FieldErrors = Record<string, string[] | undefined>

/**
 * Add a delivery address.
 *
 * The division → district cascade is genuine: picking Sylhet re-populates the district list with
 * Sylhet's four districts and clears a stale Dhaka. The Server Action re-checks the pair anyway
 * (`isValidDivisionDistrict`) — this select is a convenience, not a security control, because a
 * district of "Dhaka" under a division of "Sylhet" is worth ৳60 of delivery fee to whoever forges
 * it.
 */
export function AddressForm({
  onSaved,
  onCancel,
  defaultFullName = '',
  defaultPhone = '',
  isFirstAddress = false,
}: AddressFormProps) {
  const [pending, startTransition] = React.useTransition()
  const [division, setDivision] = React.useState('')
  const [district, setDistrict] = React.useState('')
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)

  const districts = districtsOf(division)

  function onDivisionChange(next: string) {
    setDivision(next)
    // A district from the previous division would be a lie the moment it's submitted. Drop it.
    setDistrict('')
  }

  function fieldError(name: string): string | undefined {
    return errors[name]?.[0]
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const input = {
      fullName: String(form.get('fullName') ?? ''),
      phone: String(form.get('phone') ?? ''),
      division: String(form.get('division') ?? ''),
      district: String(form.get('district') ?? ''),
      area: String(form.get('area') ?? ''),
      addressLine: String(form.get('addressLine') ?? ''),
      label: String(form.get('label') ?? '') || undefined,
      isDefault: form.get('isDefault') === 'on',
    }

    startTransition(async () => {
      const result = await createAddress(input)

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        setFormError(result.error)
        return
      }

      setErrors({})
      setFormError(null)
      toast.success('Address saved.')
      onSaved(result.addressId)
    })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName" required>
            Full name
          </Label>
          <Input
            id="fullName"
            name="fullName"
            defaultValue={defaultFullName}
            placeholder="Rahim Uddin"
            autoComplete="name"
            error={fieldError('fullName')}
            disabled={pending}
          />
        </div>

        <div>
          <Label htmlFor="phone" required>
            Mobile number
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            defaultValue={defaultPhone}
            placeholder="01712345678"
            autoComplete="tel"
            error={fieldError('phone')}
            disabled={pending}
          />
        </div>

        <div>
          <Label htmlFor="division" required>
            Division
          </Label>
          <Select
            id="division"
            name="division"
            value={division}
            onChange={(event) => onDivisionChange(event.target.value)}
            error={fieldError('division')}
            disabled={pending}
          >
            <option value="">Select division</option>
            {BD_DIVISIONS.map((option) => (
              <option key={option.name} value={option.name}>
                {option.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="district" required>
            District
          </Label>
          <Select
            id="district"
            name="district"
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            error={fieldError('district')}
            disabled={pending || !division}
          >
            <option value="">{division ? 'Select district' : 'Choose a division first'}</option>
            {districts.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          {district === 'Dhaka' ? (
            <p className="mt-1.5 text-xs text-success">Inside Dhaka — delivery is ৳60.</p>
          ) : district ? (
            <p className="mt-1.5 text-xs text-ink-muted">Outside Dhaka — delivery is ৳120.</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="area" required>
            Area / Thana
          </Label>
          <Input
            id="area"
            name="area"
            placeholder="Dhanmondi"
            autoComplete="address-level3"
            error={fieldError('area')}
            disabled={pending}
          />
        </div>

        <div>
          <Label htmlFor="label">Label</Label>
          <Select id="label" name="label" defaultValue="Home" disabled={pending}>
            <option value="Home">Home</option>
            <option value="Office">Office</option>
            <option value="Other">Other</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="addressLine" required>
          House, road & landmark
        </Label>
        <Textarea
          id="addressLine"
          name="addressLine"
          rows={3}
          placeholder="House 42, Road 8, Block C — beside Popular Diagnostic"
          autoComplete="street-address"
          error={fieldError('addressLine')}
          disabled={pending}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={isFirstAddress}
          disabled={pending || isFirstAddress}
          className="size-4 shrink-0 rounded-xs border-line text-brand-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
        />
        Make this my default delivery address
      </label>

      {formError ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" loading={pending} className="sm:min-w-40" fullWidth>
          Save & continue
        </Button>

        {onCancel && !isFirstAddress ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending} fullWidth>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}
