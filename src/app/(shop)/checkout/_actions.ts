'use server'

/**
 * Checkout mutations: save an address, and place an order.
 *
 * `placeOrder` is the most security-sensitive function in the entire marketplace. Its contract:
 *
 *   NOTHING THE CLIENT SENDS TOUCHES THE MONEY.
 *
 * The client sends exactly two things — an address id and a payment method — and both are
 * re-validated against the database. Every price, every stock level, every commission rate and the
 * coupon are re-read FRESH inside the transaction and recomputed by the pricing engine. A client
 * that POSTs `{ total: 1 }` changes nothing, because there is no `total` in the input at all.
 */
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { isValidDivisionDistrict } from '@/components/checkout/locations'
import { requireUser } from '@/lib/auth'
import { getCart, unitPriceFor } from '@/lib/cart'
import { prisma } from '@/lib/db'
import {
  generateOrderNumber,
  isValidBdPhone,
  normalizeBdPhone,
  primaryImage,
  variantLabel,
} from '@/lib/format'
import { requiresGateway } from '@/lib/payments/methods'
import { applyCoupon, calcDeliveryFee, lineTotal, splitCommission } from '@/lib/pricing'
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  SellerStatus,
} from '@/generated/prisma/client'

import { COUPON_COOKIE, normalizeCouponCode } from '../cart/_coupon'

/* -------------------------------------------------------------------------- */
/* Address                                                                    */
/* -------------------------------------------------------------------------- */

const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the recipient’s full name.').max(80),
  phone: z
    .string()
    .trim()
    .refine(isValidBdPhone, 'Enter a valid Bangladeshi mobile number, e.g. 01712345678.'),
  division: z.string().trim().min(1, 'Choose a division.').max(40),
  district: z.string().trim().min(1, 'Choose a district.').max(40),
  area: z.string().trim().min(2, 'Enter your area or thana.').max(60),
  addressLine: z
    .string()
    .trim()
    .min(6, 'Enter the house, road and any landmark — the rider needs to find you.')
    .max(200),
  label: z.string().trim().max(20).optional(),
  isDefault: z.boolean().optional(),
})

export type AddressInput = z.infer<typeof addressSchema>

export type CreateAddressResult =
  | { ok: true; addressId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> }

/**
 * Save a new delivery address for the signed-in shopper.
 *
 * The division/district PAIR is checked, not just each field on its own. Zod is perfectly happy
 * with `{ division: 'Sylhet', district: 'Dhaka' }` — both are non-empty strings — and that exact
 * payload is how a customer buys ৳60 delivery to Sylhet, because `calcDeliveryFee()` looks only at
 * the district. The pair check in `isValidDivisionDistrict` is what closes it.
 */
export async function createAddress(input: AddressInput): Promise<CreateAddressResult> {
  const user = await requireUser()

  const parsed = addressSchema.safeParse(input)
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error)
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors,
    }
  }

  const data = parsed.data

  if (!isValidDivisionDistrict(data.division, data.district)) {
    return {
      ok: false,
      error: 'That district is not in the chosen division.',
      fieldErrors: { district: ['Choose a district inside the selected division.'] },
    }
  }

  const phone = normalizeBdPhone(data.phone)
  const makeDefault = data.isDefault === true

  const address = await prisma.$transaction(async (tx) => {
    // Exactly one default. Demote the incumbent first, or a later `findFirst` on isDefault becomes
    // a coin toss and the shopper's parcel goes to last year's flat.
    if (makeDefault) {
      await tx.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    const existingCount = await tx.address.count({ where: { userId: user.id } })

    return tx.address.create({
      data: {
        userId: user.id,
        label: data.label || null,
        fullName: data.fullName,
        phone,
        division: data.division,
        district: data.district,
        area: data.area,
        addressLine: data.addressLine,
        // The first address a shopper ever saves is their default whether they ticked the box or
        // not — otherwise their one and only address isn't selected by default. Absurd, but easy
        // to ship.
        isDefault: makeDefault || existingCount === 0,
      },
      select: { id: true },
    })
  })

  revalidatePath('/checkout')
  revalidatePath('/account/addresses')

  return { ok: true, addressId: address.id }
}

/* -------------------------------------------------------------------------- */
/* Place order                                                                */
/* -------------------------------------------------------------------------- */

const placeOrderSchema = z.object({
  addressId: z.string().min(1).max(64),
  paymentMethod: z.enum(PaymentMethod),
})

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>

/** Only the failure shape crosses the wire — success ends in a `redirect()`. */
export type PlaceOrderResult = { ok: false; error: string }

/**
 * Raised inside the transaction to roll the whole order back with a message the customer can act
 * on. A plain Error would surface as "Something went wrong"; this surfaces as
 * "Only 2 left of Denim Jacket." — and, crucially, the transaction has already been rolled back by
 * the time we catch it, so no stock was decremented and no order row survives.
 */
class CheckoutError extends Error {}

const ORDER_NUMBER_ATTEMPTS = 5

/**
 * Turn the cart into an Order. Everything below happens inside ONE transaction:
 *
 *   1. re-read every cart line's product, variant and seller FRESH (no client prices, ever)
 *   2. re-validate approval + stock, failing loudly and specifically if something sold out
 *   3. recompute subtotal / delivery / discount / total via the pricing engine
 *   4. create Order + OrderItems, snapshotting title, image, variant label and unit price, and
 *      freezing the commission split per line via `splitCommission()`
 *   5. decrement product AND variant stock, increment soldCount
 *   6. increment the coupon's usedCount
 *   7. clear the cart
 *
 * If ANY of that fails, all of it fails. There is no half-placed order: no order without stock
 * taken, no stock taken without an order, no coupon burned on an order that never existed.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult | undefined> {
  const user = await requireUser()

  const parsed = placeOrderSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Choose a delivery address and a payment method.' }
  }

  const { addressId, paymentMethod } = parsed.data

  // The address must be THIS user's. Scoping the lookup by userId IS the authorisation check —
  // someone else's id simply does not exist as far as this query is concerned.
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId: user.id },
  })
  if (!address) {
    return { ok: false, error: 'That delivery address could not be found. Please choose another.' }
  }

  const cart = await getCart()
  if (!cart || cart.items.length === 0) {
    return { ok: false, error: 'Your cart is empty.' }
  }

  const jar = await cookies()
  const couponCode = normalizeCouponCode(jar.get(COUPON_COOKIE)?.value ?? '')

  let orderNumber: string

  try {
    orderNumber = await prisma.$transaction(async (tx) => {
      /* ---------------------------------------------------------------- 1. Re-read ------- */
      // The client sent NOTHING about these lines. Even the quantities come from the cart rows in
      // the database, not from the page the customer was looking at.
      const items = await tx.cartItem.findMany({
        where: { cartId: cart.id },
        orderBy: { id: 'asc' },
        include: {
          variant: true,
          product: {
            include: {
              images: { orderBy: { displayOrder: 'asc' } },
              seller: { select: { id: true, status: true, commissionRate: true, businessName: true } },
            },
          },
        },
      })

      if (items.length === 0) throw new CheckoutError('Your cart is empty.')

      /* ---------------------------------------------------------------- 2. Re-validate --- */
      const lines = items.map((item) => {
        const { product, variant, quantity } = item

        if (product.status !== ProductStatus.APPROVED) {
          throw new CheckoutError(`“${product.title}” is no longer available. Please remove it.`)
        }
        if (product.seller.status !== SellerStatus.APPROVED) {
          throw new CheckoutError(
            `${product.seller.businessName} is no longer selling on Gulu Mulu. Please remove their items.`,
          )
        }
        if (variant && variant.productId !== product.id) {
          // Belt and braces against a mangled cart row: a variant from another product would let
          // its price override this product's.
          throw new CheckoutError(`“${product.title}” has an invalid option. Please remove it.`)
        }

        const stock = variant ? variant.stock : product.stock
        if (stock <= 0) {
          throw new CheckoutError(`“${product.title}” has just sold out. Please remove it.`)
        }
        if (stock < quantity) {
          throw new CheckoutError(
            `Only ${stock} left of “${product.title}”. Please lower the quantity.`,
          )
        }

        // The ONE place a unit price is decided — a variant's `price` is an override, not a
        // discount off the parent. Never re-derived here.
        const unitPrice = unitPriceFor(product, variant)

        return {
          item,
          product,
          variant,
          quantity,
          unitPrice,
          lineTotal: lineTotal({ unitPrice, quantity }),
        }
      })

      /* ---------------------------------------------------------------- 3. Recompute ----- */
      const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
      if (subtotal <= 0) throw new CheckoutError('Your cart total is zero. Nothing to order.')

      // The district is the ONLY thing that sets the fee, and it comes off the Address row we just
      // read out of the database — never off the form the customer submitted.
      const deliveryFee = calcDeliveryFee(address.district)

      const coupon = couponCode
        ? await tx.coupon.findUnique({ where: { code: couponCode } })
        : null

      // Re-run the coupon against the subtotal WE just computed. A code that expired, hit its
      // usage limit, or fell below its minimum while the customer was on the payment step dies
      // here — it does not sneak through on the strength of having been valid ten minutes ago.
      const { discount, error: couponError } = applyCoupon(subtotal, coupon)
      if (coupon && couponError) {
        throw new CheckoutError(`${couponError} Remove the coupon and try again.`)
      }

      const total = Math.max(0, subtotal + deliveryFee - discount)

      /* ---------------------------------------------------------------- 4. Order number -- */
      // 34^6 ≈ 1.5bn, so a collision is vanishingly unlikely — but "vanishingly unlikely" is not
      // "impossible", and the column is @unique. Retry rather than 500 on a one-in-a-billion.
      let candidate = ''
      for (let attempt = 0; attempt < ORDER_NUMBER_ATTEMPTS; attempt++) {
        const next = generateOrderNumber()
        const clash = await tx.order.findUnique({
          where: { orderNumber: next },
          select: { id: true },
        })
        if (!clash) {
          candidate = next
          break
        }
      }
      if (!candidate) throw new CheckoutError('Could not generate an order number. Please retry.')

      /* ---------------------------------------------------------------- 5. Create -------- */
      const order = await tx.order.create({
        data: {
          orderNumber: candidate,
          userId: user.id,
          addressId: address.id,

          // Snapshot. The order must survive the customer editing or deleting this address — the
          // rider still has to find the flat the parcel was actually sold to.
          shipFullName: address.fullName,
          shipPhone: address.phone,
          shipDivision: address.division,
          shipDistrict: address.district,
          shipArea: address.area,
          shipAddressLine: address.addressLine,

          subtotal,
          deliveryFee,
          discount,
          total,

          paymentMethod,
          // COD is not "unpaid pending a gateway" — it is a legitimate order awaiting the rider.
          // Everything else stays PENDING until the (mock) gateway says otherwise.
          paymentStatus: PaymentStatus.PENDING,
          status: OrderStatus.PENDING,

          couponId: discount > 0 && coupon ? coupon.id : null,

          items: {
            create: lines.map((line) => {
              // Commission is frozen at purchase time, from the seller's CURRENT rate, read out of
              // the DB a few lines ago. A later rate change can never rewrite this history or a
              // pending payout. splitCommission guarantees commission + earning === lineTotal
              // exactly — no rounding leak, no failed audit.
              const { commissionAmount, sellerEarning } = splitCommission(
                line.lineTotal,
                line.product.seller.commissionRate,
              )

              return {
                productId: line.product.id,
                variantId: line.variant?.id ?? null,
                sellerId: line.product.seller.id,

                titleSnapshot: line.product.title,
                imageSnapshot: primaryImage(line.product.images),
                variantLabel: line.variant ? variantLabel(line.variant) : null,

                unitPrice: line.unitPrice,
                quantity: line.quantity,
                lineTotal: line.lineTotal,

                commissionRate: line.product.seller.commissionRate,
                commissionAmount,
                sellerEarning,

                status: OrderStatus.PENDING,
              }
            }),
          },
        },
        select: { orderNumber: true },
      })

      /* ---------------------------------------------------------------- 6. Stock --------- */
      for (const line of lines) {
        const { product, variant, quantity } = line

        if (variant) {
          // The variant's stock is authoritative for a variant line (that is what
          // `availableStockFor()` says), so THIS is the guarded decrement. `updateMany` with a
          // `stock >= qty` filter is an atomic compare-and-set: if someone else bought the last
          // one between our read and this write, it matches 0 rows and we roll the order back
          // rather than shipping a phantom.
          const claimed = await tx.productVariant.updateMany({
            where: { id: variant.id, stock: { gte: quantity } },
            data: { stock: { decrement: quantity } },
          })
          if (claimed.count === 0) {
            throw new CheckoutError(
              `“${product.title}” (${variantLabel(variant) ?? 'selected option'}) just sold out.`,
            )
          }

          // The product's own `stock` is a denormalised roll-up across variants. Decrement it too,
          // but it is NOT authoritative and it can legitimately have drifted below the variant
          // total — so a miss here floors it at 0 instead of failing an otherwise valid order.
          const rolled = await tx.product.updateMany({
            where: { id: product.id, stock: { gte: quantity } },
            data: { stock: { decrement: quantity }, soldCount: { increment: quantity } },
          })
          if (rolled.count === 0) {
            await tx.product.update({
              where: { id: product.id },
              data: { stock: 0, soldCount: { increment: quantity } },
            })
          }
        } else {
          const claimed = await tx.product.updateMany({
            where: { id: product.id, stock: { gte: quantity } },
            data: { stock: { decrement: quantity }, soldCount: { increment: quantity } },
          })
          if (claimed.count === 0) {
            throw new CheckoutError(`“${product.title}” just sold out.`)
          }
        }
      }

      /* ---------------------------------------------------------------- 7. Coupon -------- */
      if (discount > 0 && coupon) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        })
      }

      /* ---------------------------------------------------------------- 8. Clear cart ---- */
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } })

      return order.orderNumber
    })
  } catch (error) {
    // The transaction is already rolled back: no order, no stock taken, no coupon burned.
    if (error instanceof CheckoutError) {
      return { ok: false, error: error.message }
    }

    console.error('[placeOrder] transaction failed', error)
    return {
      ok: false,
      error: 'We could not place your order. Nothing has been charged — please try again.',
    }
  }

  // Committed. The coupon has been consumed, so the cookie must go or the next cart silently
  // re-applies a single-use code.
  jar.delete(COUPON_COOKIE)

  revalidatePath('/cart')
  revalidatePath('/account/orders')
  revalidatePath('/', 'layout') // the header cart badge is in the layout, and it's now 0

  // COD skips the gateway entirely — the rider collects the cash. Everything else goes to the
  // clearly-labelled MOCK gateway, which charges nobody and says so on the page.
  redirect(
    requiresGateway(paymentMethod)
      ? `/checkout/pay/${orderNumber}`
      : `/order/${orderNumber}?placed=1`,
  )
}
