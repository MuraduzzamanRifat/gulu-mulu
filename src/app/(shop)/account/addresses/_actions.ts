'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isValidBdPhone, normalizeBdPhone } from '@/lib/format'

import { isValidLocation } from './bd-locations'

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

export type AddressField =
  | 'label'
  | 'fullName'
  | 'phone'
  | 'division'
  | 'district'
  | 'area'
  | 'addressLine'

export interface AddressFormState {
  /** Undefined before the first submit — that's how the form knows not to shout on load. */
  status?: 'error'
  /** A message that belongs to the whole form, not one field. */
  error?: string
  fieldErrors?: Partial<Record<AddressField, string>>
}

export const EMPTY_ADDRESS_STATE: AddressFormState = {}

const INVALID_PHONE = 'Enter a valid Bangladeshi mobile number, e.g. 01712345678.'

const addressSchema = z.object({
  label: z.string().trim().max(24, 'Keep the label under 24 characters.').optional(),
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter the full name of whoever is receiving the parcel.')
    .max(80, 'That name is too long.'),
  phone: z
    .string()
    .trim()
    .min(1, INVALID_PHONE)
    .max(24, INVALID_PHONE)
    .refine(isValidBdPhone, INVALID_PHONE),
  division: z.string().trim().min(1, 'Choose a division.').max(40),
  district: z.string().trim().min(1, 'Choose a district.').max(40),
  area: z.string().trim().min(1, 'Choose an area.').max(60),
  addressLine: z
    .string()
    .trim()
    .min(6, 'Add house, road and any landmark — the rider needs to find you.')
    .max(240, 'That address is too long. Keep it under 240 characters.'),
  isDefault: z.boolean(),
})

/** First error per field wins — a field with two complaints only has room to show one. */
function fieldErrorsOf(error: z.ZodError): Partial<Record<AddressField, string>> {
  const out: Partial<Record<AddressField, string>> = {}

  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !(key in out)) {
      out[key as AddressField] = issue.message
    }
  }

  return out
}

/** FormData is all strings (and an absent checkbox is simply not there). Normalise before Zod. */
function readAddressForm(formData: FormData) {
  const text = (name: string) => {
    const value = formData.get(name)
    return typeof value === 'string' ? value : ''
  }

  return {
    label: text('label') || undefined,
    fullName: text('fullName'),
    phone: text('phone'),
    division: text('division'),
    district: text('district'),
    area: text('area'),
    addressLine: text('addressLine'),
    isDefault: formData.get('isDefault') != null,
  }
}

/** Every write path repaints the same three places. */
function revalidateAddresses(): void {
  revalidatePath('/account/addresses')
  revalidatePath('/account')
  // Checkout picks the delivery address (and its fee) from this list.
  revalidatePath('/checkout')
}

/* -------------------------------------------------------------------------- */
/* Create / update                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Create an address, or update one the caller actually owns.
 *
 * `addressId` is bound by the form component, never posted — but even if it were forged, the
 * `updateMany({ where: { id, userId } })` below simply matches zero rows for someone else's
 * address. There is no code path here that can touch another customer's data.
 *
 * The default flag is maintained transactionally: exactly one address is default, or none is.
 */
export async function saveAddressAction(
  addressId: string | null,
  _prevState: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const user = await requireUser()

  const parsed = addressSchema.safeParse(readAddressForm(formData))
  if (!parsed.success) {
    return { status: 'error', fieldErrors: fieldErrorsOf(parsed.error) }
  }

  const { label, fullName, phone, division, district, area, addressLine, isDefault } = parsed.data

  // The trio must exist TOGETHER. Checked server-side because the cascading selects that make this
  // impossible in the UI are, in the end, just three text fields in an HTTP body.
  if (!isValidLocation(division, district, area)) {
    return {
      status: 'error',
      error: 'That division, district and area do not go together. Please pick them again.',
      fieldErrors: { area: 'Choose a valid area for this district.' },
    }
  }

  // First address is always the default: a customer with one address and no default would hit
  // checkout with nothing preselected, which is a pointless extra tap.
  const existingCount = await prisma.address.count({ where: { userId: user.id } })
  const makeDefault = isDefault || existingCount === 0

  const data = {
    label: label ?? null,
    fullName,
    phone: normalizeBdPhone(phone), // store the canonical 01XXXXXXXXX, never the typed form
    division,
    district,
    area,
    addressLine,
    isDefault: makeDefault,
  }

  if (addressId) {
    const owned = await prisma.address.findFirst({
      where: { id: addressId, userId: user.id },
      select: { id: true },
    })

    if (!owned) {
      return { status: 'error', error: 'That address no longer exists.' }
    }

    await prisma.$transaction([
      // Demote the others FIRST, then promote this one — the reverse order would leave a window
      // where the row we just set is immediately unset by its own clearing query.
      ...(makeDefault
        ? [
            prisma.address.updateMany({
              where: { userId: user.id, isDefault: true, id: { not: owned.id } },
              data: { isDefault: false },
            }),
          ]
        : []),
      prisma.address.update({ where: { id: owned.id }, data }),
    ])
  } else {
    await prisma.$transaction([
      ...(makeDefault
        ? [
            prisma.address.updateMany({
              where: { userId: user.id, isDefault: true },
              data: { isDefault: false },
            }),
          ]
        : []),
      prisma.address.create({ data: { ...data, userId: user.id } }),
    ])
  }

  revalidateAddresses()
  redirect('/account/addresses')
}

/* -------------------------------------------------------------------------- */
/* Delete                                                                     */
/* -------------------------------------------------------------------------- */

const idSchema = z.object({ addressId: z.string().min(1).max(64) })

export type AddressActionResult = { ok: true } | { ok: false; error: string }

/**
 * Delete an address.
 *
 * Safe for orders: Order keeps a full snapshot of the shipping details (shipFullName, shipDivision,
 * …) precisely so that history survives this, and its `addressId` is nullable. A delivered order
 * never loses the address it was delivered to.
 *
 * If the default is deleted, the oldest remaining address is promoted — never leave an account
 * with addresses but no default.
 */
export async function deleteAddressAction(input: {
  addressId: string
}): Promise<AddressActionResult> {
  const parsed = idSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'That address could not be identified.' }
  }

  const user = await requireUser()

  const address = await prisma.address.findFirst({
    where: { id: parsed.data.addressId, userId: user.id },
    select: { id: true, isDefault: true },
  })

  if (!address) {
    return { ok: false, error: 'That address no longer exists.' }
  }

  await prisma.address.delete({ where: { id: address.id } })

  if (address.isDefault) {
    const next = await prisma.address.findFirst({
      where: { userId: user.id },
      orderBy: { id: 'asc' }, // cuids are time-sortable, so this is "the oldest survivor"
      select: { id: true },
    })

    if (next) {
      await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } })
    }
  }

  revalidateAddresses()
  return { ok: true }
}

/* -------------------------------------------------------------------------- */
/* Set default                                                                */
/* -------------------------------------------------------------------------- */

/** Promote one address to default and demote the rest — in a single transaction, so there is never
 *  a moment with two defaults (or none). */
export async function setDefaultAddressAction(input: {
  addressId: string
}): Promise<AddressActionResult> {
  const parsed = idSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'That address could not be identified.' }
  }

  const user = await requireUser()

  const address = await prisma.address.findFirst({
    where: { id: parsed.data.addressId, userId: user.id },
    select: { id: true },
  })

  if (!address) {
    return { ok: false, error: 'That address no longer exists.' }
  }

  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId: user.id, isDefault: true, id: { not: address.id } },
      data: { isDefault: false },
    }),
    prisma.address.update({ where: { id: address.id }, data: { isDefault: true } }),
  ])

  revalidateAddresses()
  return { ok: true }
}
