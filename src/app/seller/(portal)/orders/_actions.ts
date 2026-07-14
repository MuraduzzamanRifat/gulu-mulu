'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireSeller } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { OrderStatus } from '@/generated/prisma/client'

import type { ActionResult } from '../../_lib/forms'
import { nextOrderStatus, ORDER_STATUS_LABEL, ORDER_STATUS_VALUES } from '../../_lib/status'

const schema = z.object({
  orderItemId: z.string().trim().min(1).max(64),
  /**
   * What the seller BELIEVED the status was when they tapped. Not used to set anything — it is
   * compared against the row we read back, so a stale tab that has been open for an hour cannot
   * skip a rung by racing another device.
   */
  expected: z.enum(ORDER_STATUS_VALUES),
})

export type AdvanceResult = ActionResult<{ status: OrderStatus }>

/**
 * Walk ONE of this seller's order lines one rung up the fulfilment ladder:
 * PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED.
 *
 * OWNERSHIP: the line is re-read with `{ id, sellerId }` — BOTH — so a seller cannot touch another
 * shop's line even in an order they are also selling into. The next status is computed on the
 * SERVER from the status in the database; the client sends no target status at all, so there is no
 * way to jump a PENDING line straight to DELIVERED and trigger a payout that never shipped.
 *
 * The order's own status is deliberately left alone: on a multi-vendor order it belongs to the
 * whole basket, and one seller shipping their line does not mean the customer's order has shipped.
 * That roll-up is the marketplace's job (admin/ops), not a seller's.
 */
export async function advanceOrderItem(input: {
  orderItemId: string
  expected: OrderStatus
}): Promise<AdvanceResult> {
  const { seller } = await requireSeller()

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'That order line could not be identified.' }
  }

  const item = await prisma.orderItem.findFirst({
    where: { id: parsed.data.orderItemId, sellerId: seller.id },
    select: { id: true, status: true },
  })
  if (!item) {
    return { ok: false, error: 'That order line is not in your shop.' }
  }

  if (item.status !== parsed.data.expected) {
    return {
      ok: false,
      error: `This line is already ${ORDER_STATUS_LABEL[item.status].toLowerCase()}. Refresh to see where it is.`,
    }
  }

  const next = nextOrderStatus(item.status)
  if (!next) {
    return {
      ok: false,
      error:
        item.status === OrderStatus.DELIVERED
          ? 'This line is already delivered.'
          : `A ${ORDER_STATUS_LABEL[item.status].toLowerCase()} line cannot be moved on. Contact support.`,
    }
  }

  await prisma.orderItem.update({
    where: { id: item.id },
    data: { status: next },
  })

  revalidatePath('/seller/orders')
  revalidatePath('/seller')

  return { ok: true, data: { status: next } }
}
