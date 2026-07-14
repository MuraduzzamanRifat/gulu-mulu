'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Prisma } from '@/generated/prisma/client'

export type ProfileField = 'name' | 'email'

export interface ProfileFormState {
  status?: 'success' | 'error'
  message?: string
  fieldErrors?: Partial<Record<ProfileField, string>>
}

export const EMPTY_PROFILE_STATE: ProfileFormState = {}

/**
 * PHONE IS NOT HERE, AND THAT IS THE POINT.
 *
 * The phone number is the login identity — it is what `verifyOtp()` matches on and what the User
 * row is uniquely keyed by. Letting it be edited from a profile form would mean an account could
 * be silently re-pointed at a number its owner does not control, and the OTP that guards the whole
 * app would then be sent to the attacker. Changing it is an OTP-verified flow of its own, not a
 * text field. The UI renders it read-only; this action does not accept it at all.
 *
 * Both fields are optional and nullable: a blank box means "clear it", not "leave it alone".
 */
const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Your name needs at least 2 characters.')
    .max(60, 'That name is too long.')
    .optional(),
  email: z.email('Enter a valid email address.').max(120, 'That email is too long.').optional(),
})

function fieldErrorsOf(error: z.ZodError): Partial<Record<ProfileField, string>> {
  const out: Partial<Record<ProfileField, string>> = {}

  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !(key in out)) {
      out[key as ProfileField] = issue.message
    }
  }

  return out
}

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser()

  const text = (name: string) => {
    const value = formData.get(name)
    return typeof value === 'string' ? value.trim() : ''
  }

  // An empty box is a deliberate "clear this", so it must reach the schema as `undefined` (which
  // is optional and therefore valid) rather than as '' (which would fail min-length and read as an
  // error the customer never made).
  const parsed = profileSchema.safeParse({
    name: text('name') || undefined,
    email: text('email') || undefined,
  })

  if (!parsed.success) {
    return { status: 'error', fieldErrors: fieldErrorsOf(parsed.error) }
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name ?? null,
        // Lower-cased so "Rifat@Gmail.com" and "rifat@gmail.com" can't become two accounts —
        // the unique index is case-sensitive on SQLite.
        email: parsed.data.email ? parsed.data.email.toLowerCase() : null,
      },
    })
  } catch (error) {
    // P2002 = unique constraint. `email` is @unique, so this is the one collision that can happen.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        status: 'error',
        fieldErrors: { email: 'That email is already used by another Gulu Mulu account.' },
      }
    }

    throw error
  }

  // The header greets the customer by name, so the whole shell has to be repainted, not just here.
  revalidatePath('/', 'layout')
  revalidatePath('/account/profile')

  return { status: 'success', message: 'Your profile has been updated.' }
}
