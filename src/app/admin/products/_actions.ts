'use server'

/**
 * Product moderation.
 *
 * `ProductStatus.APPROVED` is the single flag that decides whether a listing exists as far as the
 * public is concerned — every storefront query in '@/lib/queries' spreads `STOREFRONT_PRODUCT`,
 * which gates on it. Flipping it here puts a listing in front of every shopper in Bangladesh, or
 * removes it from search, the category pages and its own direct URL in one write.
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProductStatus } from '@/generated/prisma/client'

import { idField, invalid, refuse, type ActionResult } from '../_lib/forms'

/**
 * DRAFT is absent from this map on purpose: a draft has not been submitted for review, and
 * approving something the seller is still writing would publish a half-finished listing they never
 * asked us to look at.
 */
const TRANSITIONS: Record<ProductStatus, readonly ProductStatus[]> = {
  PENDING: [ProductStatus.APPROVED, ProductStatus.REJECTED],
  APPROVED: [ProductStatus.REJECTED],
  REJECTED: [ProductStatus.APPROVED],
  DRAFT: [],
}

const schema = z.object({
  id: idField,
  status: z.enum(ProductStatus),
})

export async function setProductStatus(
  id: string,
  status: ProductStatus,
): Promise<ActionResult<{ status: ProductStatus }>> {
  await requireAdmin()

  const parsed = schema.safeParse({ id, status })
  if (!parsed.success) return invalid(parsed.error, 'That is not a status a listing can be in.')

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      category: { select: { slug: true } },
      seller: { select: { businessName: true, status: true } },
    },
  })
  if (!product) return refuse('That listing no longer exists.')

  const next = parsed.data.status

  // Idempotent: two admins clearing the same queue is not an error.
  if (product.status === next) return { ok: true, data: { status: next } }

  if (product.status === ProductStatus.DRAFT) {
    return refuse(
      `“${product.title}” is still a draft — ${product.seller.businessName} has not submitted it for review yet.`,
    )
  }

  if (!TRANSITIONS[product.status].includes(next)) {
    return refuse('That listing cannot be moved to that status. Reload and try again.')
  }

  await prisma.product.update({
    where: { id: product.id },
    data: { status: next },
  })

  revalidatePath('/admin/products')
  revalidatePath('/admin')
  revalidatePath('/seller/products')

  // The storefront surfaces this listing could appear on or vanish from. The product's own page is
  // named explicitly because it is the one URL that must stop 200-ing the moment it is rejected.
  revalidatePath(`/product/${product.slug}`)
  revalidatePath(`/category/${product.category.slug}`)
  revalidatePath('/products/search')
  revalidatePath('/')

  return { ok: true, data: { status: next } }
}
