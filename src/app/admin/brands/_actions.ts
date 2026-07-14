'use server'

/**
 * Brands.
 *
 * `Product.brandId` is an OPTIONAL relation, which means Prisma's default referential action is
 * SetNull: deleting a brand would succeed, silently, and quietly un-brand every product that
 * belonged to it. No error, no warning, forty listings changed. So the delete is refused while
 * anything still points at the brand, and the refusal says how many.
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'

import {
  displayOrder,
  idField,
  invalid,
  optionalUrl,
  refuse,
  type ActionResult,
} from '../_lib/forms'
import { slugField } from '../_lib/slug'

const brandSchema = z.object({
  name: z.string().trim().min(1, 'Give the brand a name.').max(60),
  slug: slugField,
  logoUrl: optionalUrl('Enter a valid logo URL, or leave it blank.'),
  isFeatured: z.boolean(),
  displayOrder,
})

export type BrandInput = z.input<typeof brandSchema>

function revalidateBrands(slug?: string) {
  revalidatePath('/admin/brands')
  // The featured-brand strip is on the homepage; the brand menu is in the root layout.
  revalidatePath('/', 'layout')
  if (slug) revalidatePath(`/brand/${slug}`)
}

export async function createBrand(input: BrandInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()

  const parsed = brandSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const data = parsed.data

  const clash = await prisma.brand.findUnique({ where: { slug: data.slug }, select: { id: true } })
  if (clash) {
    return {
      ok: false,
      error: 'That slug is already taken.',
      fieldErrors: { slug: 'Another brand already uses this slug.' },
    }
  }

  const brand = await prisma.brand.create({
    data: {
      name: data.name,
      slug: data.slug,
      logoUrl: data.logoUrl ?? null,
      isFeatured: data.isFeatured,
      displayOrder: data.displayOrder,
    },
    select: { id: true },
  })

  revalidateBrands(data.slug)

  return { ok: true, data: { id: brand.id } }
}

export async function updateBrand(
  id: string,
  input: BrandInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()

  const parsedId = idField.safeParse(id)
  if (!parsedId.success) return refuse('That brand could not be identified.')

  const parsed = brandSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const data = parsed.data

  const existing = await prisma.brand.findUnique({
    where: { id: parsedId.data },
    select: { id: true, slug: true },
  })
  if (!existing) return refuse('That brand no longer exists.')

  const clash = await prisma.brand.findUnique({ where: { slug: data.slug }, select: { id: true } })
  if (clash && clash.id !== existing.id) {
    return {
      ok: false,
      error: 'That slug is already taken.',
      fieldErrors: { slug: 'Another brand already uses this slug.' },
    }
  }

  await prisma.brand.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      slug: data.slug,
      logoUrl: data.logoUrl ?? null,
      isFeatured: data.isFeatured,
      displayOrder: data.displayOrder,
    },
  })

  revalidateBrands(data.slug)
  if (existing.slug !== data.slug) revalidatePath(`/brand/${existing.slug}`)

  return { ok: true, data: { id: existing.id } }
}

export async function deleteBrand(id: string): Promise<ActionResult<null>> {
  await requireAdmin()

  const parsedId = idField.safeParse(id)
  if (!parsedId.success) return refuse('That brand could not be identified.')

  const brand = await prisma.brand.findUnique({
    where: { id: parsedId.data },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: true, collections: true } },
    },
  })
  if (!brand) return refuse('That brand no longer exists.')

  const { products, collections } = brand._count

  if (products > 0) {
    return refuse(
      `${products} product${products === 1 ? '' : 's'} still ${products === 1 ? 'carries' : 'carry'} the “${brand.name}” brand. Deleting it would strip the brand from ${products === 1 ? 'that listing' : 'all of them'} without a word — re-brand ${products === 1 ? 'it' : 'them'} first.`,
    )
  }

  if (collections > 0) {
    return refuse(
      `${collections} “Shop Under ৳X” collection${collections === 1 ? '' : 's'} target${collections === 1 ? 's' : ''} “${brand.name}”. Re-target or delete ${collections === 1 ? 'it' : 'them'} first.`,
    )
  }

  await prisma.brand.delete({ where: { id: brand.id } })

  revalidateBrands(brand.slug)

  return { ok: true, data: null }
}
