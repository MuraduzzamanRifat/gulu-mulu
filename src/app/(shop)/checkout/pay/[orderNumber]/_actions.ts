'use server'

/**
 * The MOCK gateway's "webhook".
 *
 * In the real flow this transition would NEVER be triggered by a button the customer can press.
 * It would be driven by SSLCommerz's server-to-server IPN, and the code would look like this
 * (see '@/lib/payments/sslcommerz' — every piece of it is already written and typed):
 *
 *     const validation = await validateIpn(untrustedBody.val_id ?? '')      // ask the gateway
 *     const order      = await prisma.order.findUnique({                    // by the VALIDATOR's
 *       where: { orderNumber: validation.tranId },                          // tran_id, not the
 *     })                                                                    // request body's
 *     const verdict    = assertIpnMatchesOrder(validation, {                // amount + currency
 *       orderNumber: order.orderNumber,                                     // + already-paid
 *       total: order.total,
 *       alreadyPaid: order.paymentStatus === PaymentStatus.PAID,
 *     })
 *     if (!verdict.accept) return new Response('OK')                        // 200, and ignore
 *
 * Here, instead, the "customer" presses a button. That is exactly why the page it lives on shouts
 * DEMO at the top: this action is a demonstration of the STATE MACHINE, not of the security model.
 *
 * What it still gets right, because these bugs are real either way:
 *   - ownership is re-checked from the session (you cannot settle someone else's order);
 *   - COD orders are refused outright (there is no gateway leg to settle);
 *   - a PAID order is idempotent — pressing "succeed" twice does not double anything;
 *   - the amount is never taken from the request. There is no amount in the request.
 */
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { OrderStatus, PaymentMethod, PaymentStatus } from '@/generated/prisma/client'

const settleSchema = z.object({
  orderNumber: z.string().trim().min(3).max(20),
  outcome: z.enum(['success', 'failure']),
})

export type SettlePaymentResult = { ok: false; error: string }

/** A plausible-looking gateway reference, so the order page has something to print. */
function mockTransactionId(): string {
  return `MOCK-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`
}

export async function settleMockPayment(
  input: z.input<typeof settleSchema>,
): Promise<SettlePaymentResult | undefined> {
  const user = await requireUser()

  const parsed = settleSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid payment simulation request.' }

  const { orderNumber, outcome } = parsed.data

  // Scoped by userId: this IS the authorisation check. Another shopper's order number resolves to
  // nothing at all, so there is no way to flip someone else's payment status.
  const order = await prisma.order.findFirst({
    where: { orderNumber, userId: user.id },
    select: { id: true, orderNumber: true, paymentMethod: true, paymentStatus: true, status: true },
  })

  if (!order) return { ok: false, error: 'Order not found.' }

  if (order.paymentMethod === PaymentMethod.COD) {
    return { ok: false, error: 'Cash on Delivery orders are not paid through a gateway.' }
  }

  // Idempotency. The real IPN arrives more than once; so can a double-tapped button on a bad
  // connection. Money must never be banked twice for one payment.
  if (order.paymentStatus === PaymentStatus.PAID) {
    redirect(`/order/${order.orderNumber}`)
  }

  if (outcome === 'success') {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: PaymentStatus.PAID,
        transactionId: mockTransactionId(),
        // Paid up front means the seller can start packing — a paid order is a confirmed order.
        // COD, by contrast, stays PENDING until a human confirms it.
        status: OrderStatus.CONFIRMED,
      },
    })
  } else {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: PaymentStatus.FAILED,
        // The ORDER is not cancelled — the stock is still held, and the customer can retry from
        // the order page. Only the payment failed. Binning the order here would be the fastest way
        // to lose a sale to a flaky mobile connection.
        status: OrderStatus.PENDING,
      },
    })
  }

  revalidatePath(`/order/${order.orderNumber}`)
  revalidatePath('/account/orders')

  redirect(`/order/${order.orderNumber}`)
}
