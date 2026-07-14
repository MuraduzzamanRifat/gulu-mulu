'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isValidBdPhone, normalizeBdPhone } from '@/lib/format'
import { Role, SellerStatus } from '@/generated/prisma/client'

import { invalid, optionalText, optionalUrl, type ActionResult } from '../../_lib/forms'
import { SLUG_MAX, SLUG_PATTERN, slugify } from '../../_lib/slug'

/* -------------------------------------------------------------------------- */
/* Schema                                                                     */
/* -------------------------------------------------------------------------- */

const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'seller',
  'account',
  'cart',
  'checkout',
  'login',
  'search',
  'product',
  'category',
  'brand',
  'pages',
  'shop',
])

const registerSchema = z
  .object({
    businessName: z
      .string()
      .trim()
      .min(3, 'Your shop name needs at least 3 characters.')
      .max(80, 'Keep the shop name under 80 characters.'),

    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, 'The shop link needs at least 3 characters.')
      .max(SLUG_MAX, `Keep the shop link under ${SLUG_MAX} characters.`)
      .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and single hyphens only.')
      .refine((value) => !RESERVED_SLUGS.has(value), 'That shop link is reserved. Pick another.'),

    description: optionalText(1000),
    logoUrl: optionalUrl('Enter a valid image URL for your logo, or leave it blank.'),

    // BD marketplaces are legally required to verify a trade licence and the owner's NID.
    tradeLicenseNo: z
      .string()
      .trim()
      .min(4, 'Enter your trade licence number.')
      .max(60, 'That trade licence number looks too long.'),
    tradeLicenseUrl: optionalUrl('Enter a valid link to the scanned licence, or leave it blank.'),

    nidNumber: z
      .string()
      .trim()
      .regex(/^\d{10}$|^\d{13}$|^\d{17}$/, 'A Bangladeshi NID is 10, 13 or 17 digits.'),
    nidUrl: optionalUrl('Enter a valid link to the scanned NID, or leave it blank.'),

    bankName: optionalText(80),
    bankAccountName: optionalText(80),
    bankAccountNumber: optionalText(40),

    bkashNumber: z
      .string()
      .trim()
      .transform((value) => (value.length === 0 ? undefined : normalizeBdPhone(value)))
      .optional()
      .refine((value) => value === undefined || isValidBdPhone(value), {
        message: 'Enter a valid bKash number, e.g. 01712345678.',
      }),
  })
  // We cannot pay a shop we have nowhere to pay. One complete method is the minimum.
  .superRefine((data, ctx) => {
    const hasBank = Boolean(data.bankName && data.bankAccountName && data.bankAccountNumber)
    const hasBkash = Boolean(data.bkashNumber)

    if (hasBank || hasBkash) return

    ctx.addIssue({
      code: 'custom',
      path: ['bkashNumber'],
      message:
        'Add a bKash number, or fill in all three bank fields. We cannot pay out to a shop with no payout method.',
    })
  })

export type SellerRegisterInput = z.input<typeof registerSchema>

/* -------------------------------------------------------------------------- */
/* Slug availability (live check while typing)                                */
/* -------------------------------------------------------------------------- */

export type SlugCheck = { slug: string; available: boolean; reason?: string }

/**
 * Is this shop link free? Called from the form as the seller types, and again — authoritatively —
 * inside `registerSeller` below. The live check is a courtesy; the one that counts is the unique
 * index on Seller.slug, which is why the create is wrapped in a try/catch for P2002.
 */
export async function checkSlugAvailability(input: string): Promise<SlugCheck> {
  const slug = slugify(input ?? '')

  if (slug.length < 3) {
    return { slug, available: false, reason: 'Too short.' }
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { slug, available: false, reason: 'Reserved.' }
  }

  const taken = await prisma.seller.findUnique({ where: { slug }, select: { id: true } })
  return taken
    ? { slug, available: false, reason: 'Already taken.' }
    : { slug, available: true }
}

/* -------------------------------------------------------------------------- */
/* Register                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Open a shop.
 *
 * The row lands as PENDING — nothing this seller lists can reach the storefront until an admin
 * approves them (`@/lib/queries` gates every shopper query on `seller.status = APPROVED`).
 *
 * The user is promoted to the SELLER role in the same transaction as the shop is created. Without
 * it `requireSeller()` would bounce them back to the storefront the moment an admin approved the
 * shop — it checks the ROLE as well as the shop, so that an admin demoting someone locks them out
 * immediately. Role and shop are two halves of one fact, so they are written together or not at all.
 * An ADMIN keeps their role: demoting an admin to seller because they opened a shop would be a
 * privilege *downgrade* nobody asked for.
 */
export async function registerSeller(
  input: SellerRegisterInput,
): Promise<ActionResult<{ slug: string }>> {
  const user = await requireUser()

  // One shop per user — `Seller.userId` is unique, and re-registering must not clobber a shop that
  // is already under review.
  const existing = await prisma.seller.findUnique({
    where: { userId: user.id },
    select: { id: true, slug: true },
  })
  if (existing) {
    return {
      ok: false,
      error: 'You already have a shop. Head to the seller centre to manage it.',
    }
  }

  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const data = parsed.data

  const clash = await prisma.seller.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  })
  if (clash) {
    return {
      ok: false,
      error: 'That shop link is already taken.',
      fieldErrors: { slug: 'Already taken — try adding your area or a word.' },
    }
  }

  try {
    await prisma.$transaction([
      prisma.seller.create({
        data: {
          // From the SESSION, never the form.
          userId: user.id,
          businessName: data.businessName,
          slug: data.slug,
          description: data.description ?? null,
          logoUrl: data.logoUrl ?? null,
          status: SellerStatus.PENDING,
          // commissionRate is NOT settable here. The take rate is the marketplace's to set — a
          // seller who could send their own would send 0.
          tradeLicenseNo: data.tradeLicenseNo,
          tradeLicenseUrl: data.tradeLicenseUrl ?? null,
          nidNumber: data.nidNumber,
          nidUrl: data.nidUrl ?? null,
          bankName: data.bankName ?? null,
          bankAccountName: data.bankAccountName ?? null,
          bankAccountNumber: data.bankAccountNumber ?? null,
          bkashNumber: data.bkashNumber ?? null,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { role: user.role === Role.ADMIN ? Role.ADMIN : Role.SELLER },
      }),
    ])
  } catch {
    // The unique index on `slug` (or on `userId`) is the real arbiter — two people can submit the
    // same shop link in the same second and both pass the check above.
    return {
      ok: false,
      error: 'That shop link was just taken. Try another.',
      fieldErrors: { slug: 'Just taken — pick another.' },
    }
  }

  revalidatePath('/', 'layout')

  return { ok: true, data: { slug: data.slug } }
}
