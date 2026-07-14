'use server'

/**
 * Seller moderation — the gate every shop on the marketplace has to walk through.
 *
 * Two of these mutations are the most consequential in the console:
 *
 *  - `setSellerStatus(APPROVED)` puts a business's entire catalogue in front of the public.
 *  - `setCommissionRate` moves the marketplace's revenue dial.
 *
 * Both re-read the seller FRESH from the database, and neither trusts a single byte the client sent
 * beyond the id. The client cannot tell us what a seller's current status is, and it certainly
 * cannot tell us what their commission "was".
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, SellerStatus } from '@/generated/prisma/client'

import { idField, invalid, refuse, type ActionResult } from '../_lib/forms'

/* -------------------------------------------------------------------------- */
/* Status                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * What an admin may do to a shop, from where.
 *
 * APPROVED cannot go straight to REJECTED: a shop that is already trading and has taken money gets
 * SUSPENDED (reversible, and it says "we are looking into this") rather than rejected (which is the
 * verdict on an application, not on a business). The distinction is small on screen and enormous to
 * the person on the other end of it.
 */
const TRANSITIONS: Record<SellerStatus, readonly SellerStatus[]> = {
  PENDING: [SellerStatus.APPROVED, SellerStatus.REJECTED],
  APPROVED: [SellerStatus.SUSPENDED],
  REJECTED: [SellerStatus.APPROVED],
  SUSPENDED: [SellerStatus.APPROVED, SellerStatus.REJECTED],
}

const statusSchema = z.object({
  id: idField,
  status: z.enum(SellerStatus),
})

export async function setSellerStatus(
  id: string,
  status: SellerStatus,
): Promise<ActionResult<{ status: SellerStatus }>> {
  await requireAdmin()

  const parsed = statusSchema.safeParse({ id, status })
  if (!parsed.success) return invalid(parsed.error, 'That is not a status a shop can be in.')

  const seller = await prisma.seller.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      businessName: true,
      status: true,
      user: { select: { id: true, role: true } },
    },
  })
  if (!seller) return refuse('That shop no longer exists.')

  const next = parsed.data.status

  if (seller.status === next) {
    // Not an error — two admins clicked Approve at once. The world is already how they want it.
    return { ok: true, data: { status: next } }
  }

  if (!TRANSITIONS[seller.status].includes(next)) {
    return refuse(
      `A shop that is ${seller.status.toLowerCase()} cannot be moved to ${next.toLowerCase()}. Reload the page — someone may have got there first.`,
    )
  }

  await prisma.$transaction(async (tx) => {
    await tx.seller.update({ where: { id: seller.id }, data: { status: next } })

    // Approving a shop must also PROMOTE ITS OWNER, or they will bounce straight off their own
    // portal: `requireSeller()` checks `user.role`, not just the shop's status, and a CUSTOMER with
    // an approved shop is redirected to the storefront. An ADMIN who also runs a shop keeps their
    // admin role — demoting them to SELLER here would lock them out of this very page.
    if (next === SellerStatus.APPROVED && seller.user.role === Role.CUSTOMER) {
      await tx.user.update({ where: { id: seller.user.id }, data: { role: Role.SELLER } })
    }
  })

  // A shop's status decides whether its ENTIRE catalogue is visible: every storefront query in
  // '@/lib/queries' gates on `seller: { status: APPROVED }`. So this is a storefront-wide change,
  // not just an admin one.
  revalidatePath('/', 'layout')
  revalidatePath('/admin/sellers')
  revalidatePath('/admin')

  return { ok: true, data: { status: next } }
}

/* -------------------------------------------------------------------------- */
/* Commission                                                                 */
/* -------------------------------------------------------------------------- */

const MAX_RATE_PERCENT = 50

/**
 * The rate arrives as a PERCENTAGE (what the admin typed: `12.5`) and is stored as a FRACTION
 * (`0.125`), because that is what `splitCommission()` multiplies by. Doing that conversion in one
 * place, on the server, is the only way the two can never drift.
 */
const commissionSchema = z.object({
  id: idField,
  percent: z
    .number({ error: 'Enter the commission as a percentage, e.g. 12.5.' })
    .min(0, 'Commission cannot be negative.')
    .max(MAX_RATE_PERCENT, `Commission cannot exceed ${MAX_RATE_PERCENT}%.`),
})

export async function setCommissionRate(
  id: string,
  percent: number,
): Promise<ActionResult<{ commissionRate: number }>> {
  await requireAdmin()

  const parsed = commissionSchema.safeParse({ id, percent })
  if (!parsed.success) return invalid(parsed.error, 'That commission rate is not valid.')

  const seller = await prisma.seller.findUnique({
    where: { id: parsed.data.id },
    select: { id: true },
  })
  if (!seller) return refuse('That shop no longer exists.')

  // Two decimal places of a percent, and not one more. `12.3 / 100` is 0.12300000000000001 in
  // binary floating point, and a rate with a tail of garbage digits is a rate that renders as
  // "12.300000000000001%" the first time someone reads it back.
  const commissionRate = Math.round(parsed.data.percent * 100) / 10_000

  await prisma.seller.update({
    where: { id: seller.id },
    data: { commissionRate },
  })

  // Existing OrderItems are untouched, and that is the point: `commissionRate` and
  // `commissionAmount` are FROZEN onto every line at purchase time. Changing the dial re-prices the
  // future and cannot rewrite a single Taka of the past — not a delivered order, not a pending
  // payout.
  revalidatePath('/admin/sellers')
  revalidatePath('/seller')

  return { ok: true, data: { commissionRate } }
}
