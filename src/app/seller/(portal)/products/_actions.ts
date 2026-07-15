'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { prisma } from '@/lib/db'
import { requireSeller } from '@/lib/auth'
import { ProductStatus } from '@/generated/prisma/client'

import { invalid, isHttpUrl, optionalText, taka, type ActionResult } from '../../_lib/forms'
import { slugify, slugSuffix } from '../../_lib/slug'

/* -------------------------------------------------------------------------- */
/* Schema                                                                     */
/* -------------------------------------------------------------------------- */

const imageSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Paste an image URL, or remove this row.')
    .max(2048)
    .refine(isHttpUrl, 'That is not a valid http(s) image URL.'),
  alt: optionalText(120),
})

const variantSchema = z
  .object({
    size: optionalText(40),
    color: optionalText(40),
    /** Null = "no override": the variant is sold at the product's own price. */
    price: taka('Variant price').nullable(),
    stock: z.number().int('Variant stock must be a whole number.').min(0, 'Stock cannot be negative.'),
    sku: optionalText(60),
  })
  .refine((v) => Boolean(v.size) || Boolean(v.color), {
    message: 'A variant needs a size, a colour, or both.',
    path: ['size'],
  })

const productSchema = z
  .object({
    title: z.string().trim().min(3, 'Give the product a title of at least 3 characters.').max(140),
    description: z
      .string()
      .trim()
      .min(20, 'Write at least 20 characters — shoppers do not buy what they cannot picture.')
      .max(5000),
    categoryId: z.string().trim().min(1, 'Choose a category.'),
    brandId: optionalText(64),
    price: taka('Price').min(1, 'Price must be at least ৳1.'),
    /** The struck-through price is `price`; `discountPrice` is what is actually charged. */
    discountPrice: taka('Discount price').nullable(),
    stock: z.number().int('Stock must be a whole number.').min(0, 'Stock cannot be negative.'),
    sku: optionalText(60),
    images: z.array(imageSchema).min(1, 'Add at least one image URL.').max(8),
    variants: z.array(variantSchema).max(20),
  })
  .refine((p) => p.discountPrice == null || p.discountPrice < p.price, {
    message: 'The discount price must be lower than the original price.',
    path: ['discountPrice'],
  })

export type ProductInput = z.input<typeof productSchema>

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A free slug derived from the title. Product slugs are globally unique across every shop, so
 * "Cotton Saree" from two sellers cannot both be `cotton-saree` — the loser gets a short suffix.
 */
async function uniqueProductSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title) || `product-${slugSuffix()}`

  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${slugSuffix()}`
    const clash = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!clash || clash.id === excludeId) return candidate
  }

  // Six collisions on a random 4-char suffix is not going to happen; if it somehow does, fall
  // back to something that cannot collide rather than throwing in the seller's face.
  return `${base}-${Date.now().toString(36)}`
}

/** Blank strings arrive from a client <select>; they mean "no brand", not "brand ''". */
async function resolveBrandId(brandId: string | undefined): Promise<string | null> {
  if (!brandId) return null
  const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } })
  return brand?.id ?? null
}

/* -------------------------------------------------------------------------- */
/* Create                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Create a listing. It lands as PENDING — an admin approves it before it is visible on the
 * storefront (`@/lib/queries` gates every shopper-facing query on APPROVED). The form says so
 * plainly, because a listing that silently fails to appear is the fastest way to lose a seller.
 */
export async function createProduct(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  const { seller } = await requireSeller()

  const parsed = productSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const data = parsed.data

  // The category is re-read from the DB — a forged categoryId would otherwise be a foreign-key
  // crash at best, and a listing filed under a category that does not exist at worst.
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
    select: { id: true },
  })
  if (!category) {
    return { ok: false, error: 'That category no longer exists.', fieldErrors: { categoryId: 'Choose a category.' } }
  }

  const product = await prisma.product.create({
    data: {
      title: data.title,
      slug: await uniqueProductSlug(data.title),
      description: data.description,
      price: data.price,
      discountPrice: data.discountPrice,
      sku: data.sku ?? null,
      stock: data.stock,
      categoryId: category.id,
      brandId: await resolveBrandId(data.brandId),
      // sellerId comes from the SESSION, never from the form. This is the whole IDOR guard.
      sellerId: seller.id,
      status: ProductStatus.PENDING,
      images: {
        create: data.images.map((image, index) => ({
          url: image.url,
          alt: image.alt ?? null,
          displayOrder: index,
        })),
      },
      variants: {
        create: data.variants.map((variant) => ({
          size: variant.size ?? null,
          color: variant.color ?? null,
          price: variant.price,
          stock: variant.stock,
          sku: variant.sku ?? null,
        })),
      },
    },
    select: { id: true },
  })

  revalidatePath('/seller/products')
  revalidatePath('/seller')

  return { ok: true, data: { id: product.id } }
}

/* -------------------------------------------------------------------------- */
/* Update                                                                     */
/* -------------------------------------------------------------------------- */

const updateSchema = z.object({
  id: z.string().trim().min(1).max(64),
  product: productSchema,
})

/**
 * Edit a listing.
 *
 * OWNERSHIP: the product is re-read with `{ id, sellerId }` — BOTH. Passing another shop's product
 * id finds nothing and the action refuses; there is no path where the client's id alone decides
 * what gets written.
 *
 * An edit drops the listing back to PENDING. That is not bureaucracy: without it, a seller could
 * get a bag of rice approved and then quietly edit it into something the marketplace would never
 * have listed.
 */
export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<ActionResult<{ id: string }>> {
  const { seller } = await requireSeller()

  const parsed = updateSchema.safeParse({ id, product: input })
  if (!parsed.success) return invalid(parsed.error)
  const data = parsed.data.product

  const existing = await prisma.product.findFirst({
    where: { id: parsed.data.id, sellerId: seller.id },
    select: { id: true, title: true, slug: true },
  })
  if (!existing) {
    return { ok: false, error: 'That product does not exist in your shop.' }
  }

  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
    select: { id: true },
  })
  if (!category) {
    return { ok: false, error: 'That category no longer exists.', fieldErrors: { categoryId: 'Choose a category.' } }
  }

  // Only re-slug when the title actually moved — a stable URL is worth keeping.
  const slug =
    existing.title === data.title ? existing.slug : await uniqueProductSlug(data.title, existing.id)

  const brandId = await resolveBrandId(data.brandId)

  // Images and variants are replace-all: the form is the whole truth about them, and diffing rows
  // the seller can reorder and delete freely would be a lot of ceremony for the same result.
  // A transaction, so a half-written product can never be served.
  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId: existing.id } }),
    prisma.productVariant.deleteMany({ where: { productId: existing.id } }),
    prisma.product.update({
      where: { id: existing.id },
      data: {
        title: data.title,
        slug,
        description: data.description,
        price: data.price,
        discountPrice: data.discountPrice,
        sku: data.sku ?? null,
        stock: data.stock,
        categoryId: category.id,
        brandId,
        status: ProductStatus.PENDING,
        images: {
          create: data.images.map((image, index) => ({
            url: image.url,
            alt: image.alt ?? null,
            displayOrder: index,
          })),
        },
        variants: {
          create: data.variants.map((variant) => ({
            size: variant.size ?? null,
            color: variant.color ?? null,
            price: variant.price,
            stock: variant.stock,
            sku: variant.sku ?? null,
          })),
        },
      },
    }),
  ])

  revalidatePath('/seller/products')
  revalidatePath(`/seller/products/${existing.id}/edit`)
  revalidatePath('/seller')
  // The listing has just dropped back to PENDING, so the storefront must stop serving it — under
  // the old slug as well as the new one, if the title moved.
  revalidatePath(`/product/${existing.slug}`)
  if (slug !== existing.slug) revalidatePath(`/product/${slug}`)

  return { ok: true, data: { id: existing.id } }
}

/* -------------------------------------------------------------------------- */
/* Delete                                                                     */
/* -------------------------------------------------------------------------- */

const deleteSchema = z.object({ id: z.string().trim().min(1).max(64) })

/**
 * Delete a listing.
 *
 * Refused while the product sits on an order line that is still in flight: OrderItem carries
 * `onDelete` nothing for the product relation, so deleting it would break the customer's order
 * history. (Cascade removes the cart items and wishlist entries, which is fine — those are not
 * a record of anything that happened.)
 */
export async function deleteProduct(id: string): Promise<ActionResult<null>> {
  const { seller } = await requireSeller()

  const parsed = deleteSchema.safeParse({ id })
  if (!parsed.success) return { ok: false, error: 'That product could not be identified.' }

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.id, sellerId: seller.id },
    select: { id: true, slug: true, _count: { select: { orderItems: true } } },
  })
  if (!product) {
    return { ok: false, error: 'That product does not exist in your shop.' }
  }

  if (product._count.orderItems > 0) {
    return {
      ok: false,
      error:
        'This product has been ordered, so it cannot be deleted — that would erase a customer’s order history. Set its stock to 0 to take it out of circulation.',
    }
  }

  await prisma.product.delete({ where: { id: product.id } })

  revalidatePath('/seller/products')
  revalidatePath('/seller')
  revalidatePath(`/product/${product.slug}`)

  return { ok: true, data: null }
}
