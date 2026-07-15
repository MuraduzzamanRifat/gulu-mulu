'use server'

/**
 * The category tree.
 *
 * Categories are the taxonomy the whole storefront hangs off: the header mega-menu, the homepage
 * quick-nav strip, the deal grid, every search facet. Two rules make that possible and are enforced
 * here rather than hoped for:
 *
 *  1. THE TREE IS TWO LEVELS DEEP. `getCategoryTree()` renders parents with their children and
 *     stops. A grandchild would simply never be seen by a shopper — it would exist, hold products,
 *     and be unreachable. So the depth is a constraint, not a convention.
 *  2. A CATEGORY WITH PRODUCTS CANNOT BE DELETED. `Product.categoryId` is a REQUIRED relation, so
 *     the database would refuse anyway — with a foreign-key error nobody can act on. We refuse
 *     first, and say how many products are in the way.
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
  type ActionResult,
} from '../_lib/forms'
import { slugField } from '../_lib/slug'

const categorySchema = z.object({
  name: z.string().trim().min(2, 'Give the category a name.').max(60),
  slug: slugField,
  imageUrl: optionalUrl('Enter a valid image URL, or leave it blank.'),
  /** '' from the <select> means "top level", not "a category whose id is the empty string". */
  parentId: optionalText(64),
  isFeatured: z.boolean(),
  displayOrder,
})

export type CategoryInput = z.input<typeof categorySchema>

/** Everything below revalidates the whole storefront: the category menu lives in the root layout. */
function revalidateCatalogue(slug?: string) {
  revalidatePath('/admin/categories')
  revalidatePath('/', 'layout')
  if (slug) revalidatePath(`/category/${slug}`)
}

/**
 * The parent must exist and must itself be TOP LEVEL — see rule 1. Returns the resolved id, or an
 * error the form can show against the parent field.
 */
async function resolveParent(
  parentId: string | undefined,
  selfId?: string,
): Promise<{ ok: true; parentId: string | null } | { ok: false; error: string }> {
  if (!parentId) return { ok: true, parentId: null }

  if (selfId && parentId === selfId) {
    return { ok: false, error: 'A category cannot be its own parent.' }
  }

  const parent = await prisma.category.findUnique({
    where: { id: parentId },
    select: { id: true, parentId: true, name: true },
  })
  if (!parent) return { ok: false, error: 'That parent category no longer exists.' }

  if (parent.parentId !== null) {
    return {
      ok: false,
      error: `“${parent.name}” is already a sub-category. The storefront menu is only two levels deep, so it cannot take children of its own.`,
    }
  }

  return { ok: true, parentId: parent.id }
}

/* -------------------------------------------------------------------------- */
/* Create                                                                     */
/* -------------------------------------------------------------------------- */

export async function createCategory(input: CategoryInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()

  const parsed = categorySchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const data = parsed.data

  const clash = await prisma.category.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  })
  if (clash) {
    return {
      ok: false,
      error: 'That slug is already taken.',
      fieldErrors: { slug: 'Another category already uses this slug.' },
    }
  }

  const parent = await resolveParent(data.parentId)
  if (!parent.ok) {
    return { ok: false, error: parent.error, fieldErrors: { parentId: parent.error } }
  }

  const category = await prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      imageUrl: data.imageUrl ?? null,
      parentId: parent.parentId,
      isFeatured: data.isFeatured,
      displayOrder: data.displayOrder,
    },
    select: { id: true },
  })

  revalidateCatalogue(data.slug)

  return { ok: true, data: { id: category.id } }
}

/* -------------------------------------------------------------------------- */
/* Update                                                                     */
/* -------------------------------------------------------------------------- */

export async function updateCategory(
  id: string,
  input: CategoryInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()

  const parsedId = idField.safeParse(id)
  if (!parsedId.success) return refuse('That category could not be identified.')

  const parsed = categorySchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const data = parsed.data

  const existing = await prisma.category.findUnique({
    where: { id: parsedId.data },
    select: { id: true, slug: true, _count: { select: { children: true } } },
  })
  if (!existing) return refuse('That category no longer exists.')

  const clash = await prisma.category.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  })
  if (clash && clash.id !== existing.id) {
    return {
      ok: false,
      error: 'That slug is already taken.',
      fieldErrors: { slug: 'Another category already uses this slug.' },
    }
  }

  // Rule 1, from the other direction: a category that HAS children cannot itself become a child,
  // because that would bury its children on a third level the storefront never renders.
  if (data.parentId && existing._count.children > 0) {
    const message = `This category has ${existing._count.children} sub-categor${existing._count.children === 1 ? 'y' : 'ies'} of its own, so it must stay at the top level. Move them out first.`
    return { ok: false, error: message, fieldErrors: { parentId: message } }
  }

  const parent = await resolveParent(data.parentId, existing.id)
  if (!parent.ok) {
    return { ok: false, error: parent.error, fieldErrors: { parentId: parent.error } }
  }

  await prisma.category.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      slug: data.slug,
      imageUrl: data.imageUrl ?? null,
      parentId: parent.parentId,
      isFeatured: data.isFeatured,
      displayOrder: data.displayOrder,
    },
  })

  revalidateCatalogue(data.slug)
  // The old URL has to be purged too, or a renamed slug leaves a ghost page behind.
  if (existing.slug !== data.slug) revalidatePath(`/category/${existing.slug}`)

  return { ok: true, data: { id: existing.id } }
}

/* -------------------------------------------------------------------------- */
/* Delete                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Refused while ANYTHING still points at it. Each refusal names the number in the way, because
 * "cannot delete" without a count is an error message that makes an admin guess.
 */
export async function deleteCategory(id: string): Promise<ActionResult<null>> {
  await requireAdmin()

  const parsedId = idField.safeParse(id)
  if (!parsedId.success) return refuse('That category could not be identified.')

  const category = await prisma.category.findUnique({
    where: { id: parsedId.data },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: true, children: true, collections: true } },
    },
  })
  if (!category) return refuse('That category no longer exists.')

  const { products, children, collections } = category._count

  if (products > 0) {
    return refuse(
      `“${category.name}” still holds ${products} product${products === 1 ? '' : 's'}. Move them to another category first — deleting this one would leave those listings with no category at all, and every product must have one.`,
    )
  }

  if (children > 0) {
    return refuse(
      `“${category.name}” has ${children} sub-categor${children === 1 ? 'y' : 'ies'} beneath it. Delete or re-parent them first.`,
    )
  }

  if (collections > 0) {
    return refuse(
      `${collections} “Shop Under ৳X” collection${collections === 1 ? '' : 's'} point${collections === 1 ? 's' : ''} at “${category.name}”. Re-target or delete ${collections === 1 ? 'it' : 'them'} first, or ${collections === 1 ? 'it' : 'they'} would link shoppers into an empty result.`,
    )
  }

  await prisma.category.delete({ where: { id: category.id } })

  revalidateCatalogue(category.slug)

  return { ok: true, data: null }
}
