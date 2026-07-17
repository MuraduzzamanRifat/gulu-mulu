'use server'

/**
 * Order administration.
 *
 * An order is the only object in this system that has already moved money and stock. Every mutation
 * here therefore has to undo, or account for, something physical:
 *
 *  - cancelling an order puts stock back on the shelf that checkout took off it,
 *  - and returns the coupon the customer burned to place it,
 *  - marking a COD order delivered means a rider has taken cash out of someone's hand.
 *
 * The whole of `advanceOrderStatus` is one transaction. There is no state of the world in which the
 * order says CANCELLED but the stock never came back.
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { OrderStatus, PaymentMethod, PaymentStatus } from '@/generated/prisma/client'

import { idField, invalid, refuse, type ActionResult } from '../_lib/forms'
import { ORDER_STATUS_LABEL, ORDER_TRANSITIONS, PAYMENT_TRANSITIONS } from '../_lib/status'

/* -------------------------------------------------------------------------- */
/* Order status                                                               */
/* -------------------------------------------------------------------------- */

const statusSchema = z.object({
  id: idField,
  status: z.enum(OrderStatus),
})

/** The two moves that put goods back on the shelf. */
const RESTOCKS: readonly OrderStatus[] = [OrderStatus.CANCELLED, OrderStatus.RETURNED]

export interface AdvanceResult {
  status: OrderStatus
  /** Set when the move also flipped the payment — so the UI can say so out loud. */
  paymentStatus?: PaymentStatus
  restocked: boolean
}

export async function advanceOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<ActionResult<AdvanceResult>> {
  await requireAdmin()

  const parsed = statusSchema.safeParse({ id, status })
  if (!parsed.success) return invalid(parsed.error, 'That is not a status an order can be in.')

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      discount: true,
      couponId: true,
      items: {
        select: { id: true, productId: true, variantId: true, quantity: true },
      },
    },
  })
  if (!order) return refuse('That order no longer exists.')

  const next = parsed.data.status

  if (order.status === next) {
    return { ok: true, data: { status: next, restocked: false } }
  }

  // The transition graph is the whole safety model here. CANCELLED and RETURNED are terminal
  // precisely BECAUSE of the restock below: un-cancelling would have to re-take stock that has been
  // back on the shelf — and quite possibly sold to somebody else — since.
  if (!ORDER_TRANSITIONS[order.status].includes(next)) {
    return refuse(
      `An order that is ${ORDER_STATUS_LABEL[order.status].toLowerCase()} cannot be marked ${ORDER_STATUS_LABEL[next].toLowerCase()}. Reload the page — it may have moved on already.`,
    )
  }

  const restocking = RESTOCKS.includes(next)

  // Cash on delivery is PAID at the moment of delivery — that is what the words mean. The rider has
  // the money. Any other method was already settled (or failed) at the gateway, and is left alone.
  const collectsCashNow =
    next === OrderStatus.DELIVERED &&
    order.paymentMethod === PaymentMethod.COD &&
    order.paymentStatus === PaymentStatus.PENDING

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: next,
        ...(collectsCashNow ? { paymentStatus: PaymentStatus.PAID } : {}),
      },
    })

    // Every line moves with the order. An admin acting on the whole order overrides the per-seller
    // fulfilment state — otherwise a cancelled order would still show a line one seller believes
    // they are shipping.
    await tx.orderItem.updateMany({
      where: { orderId: order.id },
      data: { status: next },
    })

    if (!restocking) return

    for (const item of order.items) {
      // A variant may have been deleted since the sale (the seller's product editor replaces
      // variants wholesale), which nulls `variantId` on this row. `updateMany` matches nothing and
      // moves on, where `update` would throw and take the whole order down with it.
      if (item.variantId) {
        await tx.productVariant.updateMany({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        })
      }

      // Read-modify-write inside the transaction, because `soldCount` must not be driven negative
      // and Prisma cannot express `MAX(0, soldCount - n)` in a single atomic update. A pair of
      // conditional updateManys would be worse: the second would fire on the value the first just
      // wrote and zero a perfectly good count.
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { soldCount: true },
      })

      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { increment: item.quantity },
          soldCount: Math.max(0, (product?.soldCount ?? 0) - item.quantity),
        },
      })
    }

    // A cancelled order never happened, so the single-use coupon the customer spent on it should
    // not be spent. A RETURN is different — the order did happen, the customer did get the
    // discount, and the goods came back afterwards. Only a cancellation gives the code back.
    if (next === OrderStatus.CANCELLED && order.couponId && order.discount > 0) {
      const coupon = await tx.coupon.findUnique({
        where: { id: order.couponId },
        select: { usedCount: true },
      })
      if (coupon) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { usedCount: Math.max(0, coupon.usedCount - 1) },
        })
      }
    }
  })

  revalidatePath('/zawadpanel/orders')
  revalidatePath(`/zawadpanel/orders/${order.id}`)
  revalidatePath('/zawadpanel')
  // The customer's own order history, and the seller's fulfilment queue, both just changed.
  revalidatePath('/account/orders')
  revalidatePath(`/order/${order.orderNumber}`)
  revalidatePath('/seller/orders')
  revalidatePath('/seller')

  return {
    ok: true,
    data: {
      status: next,
      ...(collectsCashNow ? { paymentStatus: PaymentStatus.PAID } : {}),
      restocked: restocking,
    },
  }
}

/* -------------------------------------------------------------------------- */
/* Payment status                                                             */
/* -------------------------------------------------------------------------- */

const paymentSchema = z.object({
  id: idField,
  paymentStatus: z.enum(PaymentStatus),
})

export async function setPaymentStatus(
  id: string,
  paymentStatus: PaymentStatus,
): Promise<ActionResult<{ paymentStatus: PaymentStatus }>> {
  await requireAdmin()

  const parsed = paymentSchema.safeParse({ id, paymentStatus })
  if (!parsed.success) return invalid(parsed.error, 'That is not a payment status.')

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, orderNumber: true, paymentStatus: true },
  })
  if (!order) return refuse('That order no longer exists.')

  const next = parsed.data.paymentStatus

  if (order.paymentStatus === next) return { ok: true, data: { paymentStatus: next } }

  if (!PAYMENT_TRANSITIONS[order.paymentStatus].includes(next)) {
    return refuse(
      next === PaymentStatus.REFUNDED
        ? 'Only a paid order can be refunded — no money has been taken for this one.'
        : 'That payment status cannot follow the current one. Reload the page.',
    )
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: next },
  })

  revalidatePath('/zawadpanel/orders')
  revalidatePath(`/zawadpanel/orders/${order.id}`)
  revalidatePath('/zawadpanel')
  revalidatePath('/account/orders')
  revalidatePath(`/order/${order.orderNumber}`)

  return { ok: true, data: { paymentStatus: next } }
}
