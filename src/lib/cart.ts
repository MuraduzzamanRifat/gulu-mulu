/**
 * Cart engine — one cart abstraction over two very different identities.
 *
 * A shopper browses as a guest (cart keyed by an httpOnly `gm_cart` cookie), then signs in with an
 * OTP and becomes a user (cart keyed by userId). `mergeGuestCartIntoUser()` is the seam between
 * those two worlds and the login action must call it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO HARD CONSTRAINTS THIS FILE IS BUILT AROUND — read before editing
 *
 * 1. COOKIES CANNOT BE SET DURING A SERVER COMPONENT RENDER.
 *    HTTP cannot send Set-Cookie once streaming has begun, so Next 16 throws on `.set()` outside a
 *    Server Function / Route Handler. Therefore the READ path (`getCart`, `getCartCount`) never
 *    mints a cookie and never creates a row — it resolves an EXISTING cart or answers null/0.
 *    Only `getOrCreateCartId()` (and the mutations that call it) may create, and they are
 *    Server-Action-only. Calling addToCart() from a Server Component is a bug, and it will say so.
 *
 * 2. `@@unique([cartId, productId, variantId])` DOES NOT DEDUPE `variantId = NULL`.
 *    In SQL, NULL != NULL, so SQLite happily stores ten identical no-variant rows under that
 *    "unique" index. Prisma knows it: the generated compound-unique input types `variantId` as
 *    `string` (non-nullable), so `upsert` on it will not even compile for a no-variant product.
 *    Hence every write does findFirst-then-update-or-create. Do not "simplify" it back to upsert.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Mutations return a typed result instead of throwing — "out of stock" is an expected outcome of a
 * race, not an exception. Genuine programmer errors still throw.
 */
import { cache } from 'react'
import { cookies } from 'next/headers'
import { z } from 'zod'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { effectivePrice } from '@/lib/format'
import type { PricedLine } from '@/lib/pricing'
import { ProductStatus, SellerStatus, Prisma } from '@/generated/prisma/client'

/** Guest cart key. httpOnly — the browser can hold it, JS can never read or forge it. */
export const CART_COOKIE = 'gm_cart'

const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/** Nobody buys 500 of one SKU on a marketplace; a cap keeps a fat-fingered qty out of the DB. */
const MAX_QTY_PER_LINE = 99

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

const cartInclude = {
  items: {
    // cuid ids are timestamp-prefixed, so id-asc is a stable "oldest first" without a createdAt.
    orderBy: { id: 'asc' },
    include: {
      product: {
        include: {
          images: { orderBy: { displayOrder: 'asc' } },
          seller: { select: { id: true, businessName: true, slug: true, status: true } },
        },
      },
      variant: true,
    },
  },
} satisfies Prisma.CartInclude

export type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>
export type CartLine = CartWithItems['items'][number]

/** Uniform result for every mutation. `count` is the cart's new total quantity (header badge). */
export type CartResult =
  | {
      ok: true
      count: number
      /**
       * Set when we honoured LESS than the customer asked for because stock ran out.
       * The UI should say "only N left" rather than silently lying about what it added.
       */
      clampedTo?: number
    }
  | { ok: false; error: string }

/* -------------------------------------------------------------------------- */
/* Pricing glue — the ONLY place a cart line's unit price is decided          */
/* -------------------------------------------------------------------------- */

/**
 * What one unit of this line actually costs, in whole Taka.
 *
 * Rule (straight from the schema): a variant's `price` is an OVERRIDE — when set it IS the price.
 * When null the line falls back to the product's effective price (i.e. `discountPrice` when it
 * genuinely undercuts `price`). Checkout must call this, never re-derive it, or a variant could be
 * charged at the parent's discounted rate.
 */
export function unitPriceFor(
  product: Pick<Prisma.ProductModel, 'price' | 'discountPrice'>,
  variant: Pick<Prisma.ProductVariantModel, 'price'> | null | undefined,
): number {
  if (variant?.price != null) return variant.price
  return effectivePrice(product)
}

/** Units a line can be bought in right now: the variant's stock when chosen, else the product's. */
export function availableStockFor(
  product: Pick<Prisma.ProductModel, 'stock'>,
  variant: Pick<Prisma.ProductVariantModel, 'stock'> | null | undefined,
): number {
  return variant ? variant.stock : product.stock
}

/**
 * Is this line still buyable? A product can be rejected, suspended or sold out AFTER it was added,
 * so the cart page must re-check on every render and checkout must refuse to charge for it.
 */
export function lineAvailability(line: CartLine): {
  available: boolean
  maxQty: number
  reason?: string
} {
  const { product, variant } = line

  if (product.status !== ProductStatus.APPROVED) {
    return { available: false, maxQty: 0, reason: 'This product is no longer available.' }
  }
  if (product.seller.status !== SellerStatus.APPROVED) {
    return { available: false, maxQty: 0, reason: 'This seller is no longer active.' }
  }

  const stock = availableStockFor(product, variant)
  if (stock <= 0) return { available: false, maxQty: 0, reason: 'Out of stock.' }

  return { available: true, maxQty: Math.min(stock, MAX_QTY_PER_LINE) }
}

/**
 * Cart lines -> priced lines for `summarizeCart()`.
 *
 * Unavailable lines are EXCLUDED: we never charge for something we cannot ship. The cart page
 * still renders them (greyed out, via `lineAvailability`) — they just don't reach the total.
 */
export function toPricedLines(cart: CartWithItems | null): PricedLine[] {
  if (!cart) return []
  return cart.items
    .filter((line) => lineAvailability(line).available)
    .map((line) => ({
      unitPrice: unitPriceFor(line.product, line.variant),
      quantity: line.quantity,
    }))
}

/* -------------------------------------------------------------------------- */
/* Cart resolution                                                            */
/* -------------------------------------------------------------------------- */

/**
 * A cuid-ish, collision-resistant guest key. No cuid package is installed, and Prisma's
 * `@default(cuid())` only fires for `id` — `sessionKey` is ours to mint.
 */
function newSessionKey(): string {
  const ts = Date.now().toString(36)
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  return `c${ts}${rand}`
}

/**
 * The current cart's id, or null — READ-ONLY. Creates nothing, sets no cookie, so it is safe in a
 * Server Component. React-`cache`d, so the header badge and the cart page share one lookup.
 */
const resolveCartId = cache(async (): Promise<string | null> => {
  const user = await getCurrentUser()

  if (user) {
    const cart = await prisma.cart.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    return cart?.id ?? null
  }

  const jar = await cookies()
  const key = jar.get(CART_COOKIE)?.value
  if (!key) return null

  const cart = await prisma.cart.findUnique({ where: { sessionKey: key }, select: { id: true } })
  return cart?.id ?? null
})

/**
 * The current cart's id, creating the cart (and, for a guest, the cookie) if there isn't one.
 *
 * SERVER ACTIONS / ROUTE HANDLERS ONLY — it may call `cookies().set()`, which throws during a
 * Server Component render (constraint 1 at the top of this file).
 *
 * Deliberately does NOT reuse the cached `resolveCartId()`: that cache could have already memoised
 * "null" earlier in this same request, and we'd then create a second cart on top of a real one.
 */
export async function getOrCreateCartId(): Promise<string> {
  const user = await getCurrentUser()

  if (user) {
    const existing = await prisma.cart.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    if (existing) return existing.id

    const created = await prisma.cart.create({ data: { userId: user.id }, select: { id: true } })
    return created.id
  }

  const jar = await cookies()
  const existingKey = jar.get(CART_COOKIE)?.value

  if (existingKey) {
    const existing = await prisma.cart.findUnique({
      where: { sessionKey: existingKey },
      select: { id: true },
    })
    if (existing) return existing.id

    // Cookie survived the cart (a `db:reset` in dev, or a pruned stale cart). Re-adopt the key
    // rather than issuing a new one, so the customer keeps exactly one guest identity.
    const revived = await prisma.cart.create({
      data: { sessionKey: existingKey },
      select: { id: true },
    })
    return revived.id
  }

  const sessionKey = newSessionKey()

  // Set the cookie BEFORE inserting the row. If we're wrongly inside a render, `.set()` throws
  // here — and we exit having created nothing. The other order would leave an orphan cart holding
  // the customer's items that no future request could ever find.
  jar.set(CART_COOKIE, sessionKey, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CART_COOKIE_MAX_AGE,
  })

  const created = await prisma.cart.create({ data: { sessionKey }, select: { id: true } })
  return created.id
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

/** The full cart with items -> product (+images, +seller) and variant. Null when there is none. */
export const getCart = cache(async (): Promise<CartWithItems | null> => {
  const cartId = await resolveCartId()
  if (!cartId) return null

  return prisma.cart.findUnique({ where: { id: cartId }, include: cartInclude })
})

/** Total quantity, for the header badge. One aggregate — never load the cart just to count it. */
export const getCartCount = cache(async (): Promise<number> => {
  const cartId = await resolveCartId()
  if (!cartId) return 0

  return countItems(cartId)
})

/** Uncached count for a known cart — used after a mutation, when the cache is stale by definition. */
async function countItems(cartId: string): Promise<number> {
  const agg = await prisma.cartItem.aggregate({
    where: { cartId },
    _sum: { quantity: true },
  })
  return agg._sum.quantity ?? 0
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

const addToCartSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).nullable(),
  qty: z.number().int().min(1).max(MAX_QTY_PER_LINE),
})

/**
 * Add (or top up) a line.
 *
 * Everything that matters — price, stock, approval — is read from the DB here. The caller supplies
 * ids and a quantity and nothing else; a client cannot smuggle in a price or a seller.
 */
export async function addToCart(
  productId: string,
  variantId: string | null,
  qty: number,
): Promise<CartResult> {
  const parsed = addToCartSchema.safeParse({ productId, variantId, qty })
  if (!parsed.success) return { ok: false, error: 'Invalid item or quantity.' }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: {
      id: true,
      stock: true,
      status: true,
      seller: { select: { status: true } },
      variants: { select: { id: true, stock: true } },
    },
  })

  if (!product) return { ok: false, error: 'Product not found.' }

  // The storefront only ever sells APPROVED products from APPROVED sellers — enforced on the write
  // path too, not just in the read queries, so a stale/forged product id can't sneak past.
  if (product.status !== ProductStatus.APPROVED) {
    return { ok: false, error: 'This product is not available.' }
  }
  if (product.seller.status !== SellerStatus.APPROVED) {
    return { ok: false, error: 'This seller is not currently active.' }
  }

  let variant: { id: string; stock: number } | null = null
  if (parsed.data.variantId) {
    // Must belong to THIS product — otherwise you could price a cheap variant onto a dear product.
    variant = product.variants.find((v) => v.id === parsed.data.variantId) ?? null
    if (!variant) return { ok: false, error: 'That option is not available for this product.' }
  } else if (product.variants.length > 0) {
    return { ok: false, error: 'Please choose an option first.' }
  }

  const stock = variant ? variant.stock : product.stock
  if (stock <= 0) return { ok: false, error: 'This item is out of stock.' }

  const cartId = await getOrCreateCartId()

  // findFirst + update/create, not upsert — see constraint 2 at the top of this file.
  const existing = await prisma.cartItem.findFirst({
    where: { cartId, productId: product.id, variantId: variant?.id ?? null },
    select: { id: true, quantity: true },
  })

  const requested = (existing?.quantity ?? 0) + parsed.data.qty
  const finalQty = Math.min(requested, stock, MAX_QTY_PER_LINE)

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: finalQty } })
  } else {
    await prisma.cartItem.create({
      data: { cartId, productId: product.id, variantId: variant?.id ?? null, quantity: finalQty },
    })
  }

  const count = await countItems(cartId)
  return requested > finalQty ? { ok: true, count, clampedTo: finalQty } : { ok: true, count }
}

const qtySchema = z.number().int().min(-1_000_000).max(MAX_QTY_PER_LINE)

/**
 * Set a line's quantity. `qty <= 0` removes it.
 *
 * Scoped by cartId, so one customer can never touch another's line (IDOR): the item is looked up
 * by `{ id, cartId }`, and a foreign id simply doesn't exist as far as this query is concerned.
 */
export async function updateCartItemQty(itemId: string, qty: number): Promise<CartResult> {
  if (!itemId || !qtySchema.safeParse(qty).success) {
    return { ok: false, error: 'Invalid quantity.' }
  }

  const cartId = await resolveCartId()
  if (!cartId) return { ok: false, error: 'Your cart is empty.' }

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId }, // ← ownership check
    select: {
      id: true,
      variant: { select: { stock: true } },
      product: { select: { stock: true, status: true, seller: { select: { status: true } } } },
    },
  })

  if (!item) return { ok: false, error: 'That item is not in your cart.' }

  if (qty <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } })
    return { ok: true, count: await countItems(cartId) }
  }

  if (
    item.product.status !== ProductStatus.APPROVED ||
    item.product.seller.status !== SellerStatus.APPROVED
  ) {
    return { ok: false, error: 'This product is no longer available.' }
  }

  const stock = item.variant ? item.variant.stock : item.product.stock
  if (stock <= 0) return { ok: false, error: 'This item is out of stock.' }

  const finalQty = Math.min(qty, stock, MAX_QTY_PER_LINE)
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: finalQty } })

  const count = await countItems(cartId)
  return qty > finalQty ? { ok: true, count, clampedTo: finalQty } : { ok: true, count }
}

/** Remove a line. The `{ id, cartId }` filter IS the ownership check — one query, no IDOR. */
export async function removeCartItem(itemId: string): Promise<CartResult> {
  if (!itemId) return { ok: false, error: 'Invalid item.' }

  const cartId = await resolveCartId()
  if (!cartId) return { ok: false, error: 'Your cart is empty.' }

  const { count: deleted } = await prisma.cartItem.deleteMany({ where: { id: itemId, cartId } })
  if (deleted === 0) return { ok: false, error: 'That item is not in your cart.' }

  return { ok: true, count: await countItems(cartId) }
}

/** Empty the cart (also called after an order is placed). Keeps the Cart row itself. */
export async function clearCart(): Promise<CartResult> {
  const cartId = await resolveCartId()
  if (!cartId) return { ok: true, count: 0 }

  await prisma.cartItem.deleteMany({ where: { cartId } })
  return { ok: true, count: 0 }
}

/* -------------------------------------------------------------------------- */
/* Guest -> user merge (called by the login action, right after OTP verify)   */
/* -------------------------------------------------------------------------- */

/**
 * Fold the guest cart into the user's cart, then destroy the guest cart and its cookie.
 *
 * Call this from the OTP login Server Action AFTER `createSession()`. It is idempotent and safe
 * when there is no guest cart at all.
 *
 * Collisions sum, then clamp to stock — three in the guest cart plus two already in the account is
 * five, unless only four exist, in which case it's four. Items that went out of stock or lost
 * approval while the shopper was logged out are dropped rather than resurrected.
 *
 * The cookie is cleared unconditionally: leaving it behind would let the next signed-out visitor on
 * a shared device (an internet café, a family phone — very much a BD reality) re-adopt this cart.
 */
export async function mergeGuestCartIntoUser(userId: string): Promise<void> {
  const jar = await cookies()
  const sessionKey = jar.get(CART_COOKIE)?.value
  if (!sessionKey) return

  jar.delete(CART_COOKIE)

  const guestCart = await prisma.cart.findUnique({
    where: { sessionKey },
    include: {
      items: {
        include: {
          variant: { select: { stock: true } },
          product: {
            select: { id: true, stock: true, status: true, seller: { select: { status: true } } },
          },
        },
      },
    },
  })

  // Nothing to merge, or the cart was already claimed by an account.
  if (!guestCart || guestCart.userId) return

  if (guestCart.items.length === 0) {
    await prisma.cart.delete({ where: { id: guestCart.id } })
    return
  }

  const userCart =
    (await prisma.cart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })) ?? (await prisma.cart.create({ data: { userId }, select: { id: true } }))

  const existingItems = await prisma.cartItem.findMany({
    where: { cartId: userCart.id },
    select: { id: true, productId: true, variantId: true, quantity: true },
  })

  // Keyed on productId+variantId because that's what the (NULL-blind) unique index means to say.
  const lineKey = (productId: string, variantId: string | null) => `${productId}::${variantId ?? ''}`
  const byKey = new Map(existingItems.map((i) => [lineKey(i.productId, i.variantId), i]))

  // Fold the GUEST cart onto itself first. Duplicate keys can genuinely exist there — that is the
  // whole point of constraint 2 — and collapsing them here means each key produces exactly one
  // write below, so we can never emit an insert and an update for the same line in one transaction.
  const incoming = new Map<
    string,
    { productId: string; variantId: string | null; quantity: number; stock: number }
  >()

  for (const item of guestCart.items) {
    if (
      item.product.status !== ProductStatus.APPROVED ||
      item.product.seller.status !== SellerStatus.APPROVED
    ) {
      continue
    }

    const stock = item.variant ? item.variant.stock : item.product.stock
    if (stock <= 0) continue

    const key = lineKey(item.productId, item.variantId)
    const seen = incoming.get(key)

    if (seen) {
      seen.quantity += item.quantity
    } else {
      incoming.set(key, {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        stock,
      })
    }
  }

  const writes: Prisma.PrismaPromise<unknown>[] = []

  for (const [key, line] of incoming) {
    const existing = byKey.get(key)
    const merged = Math.min(
      (existing?.quantity ?? 0) + line.quantity,
      line.stock,
      MAX_QTY_PER_LINE,
    )

    if (existing) {
      writes.push(
        prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: merged } }),
      )
    } else {
      writes.push(
        prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: line.productId,
            variantId: line.variantId,
            quantity: merged,
          },
        }),
      )
    }
  }

  // One transaction: the guest cart disappears if and only if every line landed.
  // Cascade on Cart -> CartItem takes the guest's rows with it.
  writes.push(prisma.cart.delete({ where: { id: guestCart.id } }))
  await prisma.$transaction(writes)
}
