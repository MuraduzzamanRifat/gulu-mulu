'use server'

/**
 * The "Shop Under ৳999" collections.
 *
 * The signature merchandising pattern of this marketplace: a collection is anchored on a BUDGET
 * rather than a category, because price-led BD e-commerce converts on the number. Each one renders
 * as a card that deep-links into the real search with the filters pre-applied — one code path, and
 * the facets and sorting keep working from there.
 *
 * A collection may narrow by a category OR a brand, never both. That is not an arbitrary rule: the
 * storefront's card builds `?priceMax=999&categories=…` OR `?priceMax=999&brands=…`, so setting
 * both would silently drop the brand and quietly sell a collection that does not do what its label
 * says. Refused here, out loud, instead.
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'

import {
  displayOrder,
  idField,
  invalid,
  optionalText,
  optionalUrl,
  refuse,
  taka,
  type ActionResult,
} from '../_lib/forms'

const collectionSchema = z
  .object({
    label: z.string().trim().min(3, 'Give the collection a label.').max(80),
    imageUrl: optionalUrl('Enter a valid image URL, or leave it blank.'),
    priceMax: taka('The budget ceiling').min(1, 'The budget ceiling must be at least ৳1.'),
    categoryId: optionalText(64),
    brandId: optionalText(64),
    displayOrder,
    isActive: z.boolean(),
  })
  .refine((c) => !(c.categoryId && c.brandId), {
    message: 'Pick a category or a brand — not both. The storefront card can only filter on one.',
    path: ['brandId'],
  })

export type CollectionInput = z.input<typeof collectionSchema>

function revalidateCollections() {
  revalidatePath('/zawadpanel/collections')
  revalidatePath('/')
}

/** Both are optional, and both must be real. A forged id would be a foreign-key crash. */
async function resolveTargets(categoryId?: string, brandId?: string) {
  const [category, brand] = await Promise.all([
    categoryId
      ? prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } })
      : Promise.resolve(null),
    brandId
      ? prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } })
      : Promise.resolve(null),
  ])

  if (categoryId && !category) {
    return { ok: false as const, field: 'categoryId', error: 'That category no longer exists.' }
  }
  if (brandId && !brand) {
    return { ok: false as const, field: 'brandId', error: 'That brand no longer exists.' }
  }

  return { ok: true as const, categoryId: category?.id ?? null, brandId: brand?.id ?? null }
}

export async function createCollection(
  input: CollectionInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()

  const parsed = collectionSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const data = parsed.data

  const targets = await resolveTargets(data.categoryId, data.brandId)
  if (!targets.ok) {
    return { ok: false, error: targets.error, fieldErrors: { [targets.field]: targets.error } }
  }

  const collection = await prisma.collection.create({
    data: {
      label: data.label,
      imageUrl: data.imageUrl ?? null,
      priceMax: data.priceMax,
      categoryId: targets.categoryId,
      brandId: targets.brandId,
      displayOrder: data.displayOrder,
      isActive: data.isActive,
    },
    select: { id: true },
  })

  revalidateCollections()

  return { ok: true, data: { id: collection.id } }
}

export async function updateCollection(
  id: string,
  input: CollectionInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()

  const parsedId = idField.safeParse(id)
  if (!parsedId.success) return refuse('That collection could not be identified.')

  const parsed = collectionSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const data = parsed.data

  const existing = await prisma.collection.findUnique({
    where: { id: parsedId.data },
    select: { id: true },
  })
  if (!existing) return refuse('That collection no longer exists.')

  const targets = await resolveTargets(data.categoryId, data.brandId)
  if (!targets.ok) {
    return { ok: false, error: targets.error, fieldErrors: { [targets.field]: targets.error } }
  }

  await prisma.collection.update({
    where: { id: existing.id },
    data: {
      label: data.label,
      imageUrl: data.imageUrl ?? null,
      priceMax: data.priceMax,
      categoryId: targets.categoryId,
      brandId: targets.brandId,
      displayOrder: data.displayOrder,
      isActive: data.isActive,
    },
  })

  revalidateCollections()

  return { ok: true, data: { id: existing.id } }
}

const toggleSchema = z.object({ id: idField, isActive: z.boolean() })

export async function setCollectionActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult<{ isActive: boolean }>> {
  await requireAdmin()

  const parsed = toggleSchema.safeParse({ id, isActive })
  if (!parsed.success) return refuse('That collection could not be identified.')

  const existing = await prisma.collection.findUnique({
    where: { id: parsed.data.id },
    select: { id: true },
  })
  if (!existing) return refuse('That collection no longer exists.')

  await prisma.collection.update({
    where: { id: existing.id },
    data: { isActive: parsed.data.isActive },
  })

  revalidateCollections()

  return { ok: true, data: { isActive: parsed.data.isActive } }
}

export async function deleteCollection(id: string): Promise<ActionResult<null>> {
  await requireAdmin()

  const parsedId = idField.safeParse(id)
  if (!parsedId.success) return refuse('That collection could not be identified.')

  const collection = await prisma.collection.findUnique({
    where: { id: parsedId.data },
    select: { id: true },
  })
  if (!collection) return refuse('That collection no longer exists.')

  await prisma.collection.delete({ where: { id: collection.id } })

  revalidateCollections()

  return { ok: true, data: null }
}
