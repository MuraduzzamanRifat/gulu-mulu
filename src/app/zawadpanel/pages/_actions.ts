'use server'

/**
 * CMS policy pages — Return Policy, Refund Policy, Seller Policy, Terms.
 *
 * These are the pages a marketplace is judged on when something goes wrong, and they are in the
 * database rather than hardcoded for one reason: they change, and they must not need a deploy to
 * change. The content is Markdown; the storefront renders it.
 *
 * `slug` is the page's whole identity — `/return-policy` is printed on invoices and linked from the
 * footer, and changing it breaks every one of those links. The editor says so; this refuses to let
 * two pages claim the same one.
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'

import { idField, invalid, optionalText, refuse, type ActionResult } from '../_lib/forms'
import { slugField } from '../_lib/slug'

import { CONTENT_MAX } from './_constants'

const pageSchema = z.object({
  slug: slugField,
  title: z.string().trim().min(2, 'Give the page a title.').max(120),
  content: z
    .string()
    .trim()
    .min(20, 'A policy page needs actual content — at least 20 characters.')
    .max(CONTENT_MAX, `Keep the page under ${CONTENT_MAX.toLocaleString('en-US')} characters.`),
  isPublished: z.boolean(),
})

export type PageInput = z.input<typeof pageSchema>

function revalidatePolicy(slug: string) {
  revalidatePath('/zawadpanel/pages')
  // The storefront serves these at /pages/[slug] (and indexes them at /pages) — NOT at the root.
  revalidatePath('/pages')
  revalidatePath(`/pages/${slug}`)
  // The footer links them and lives in the root layout, so a new or renamed page has to reach every
  // route, not just its own.
  revalidatePath('/', 'layout')
}

export async function createPage(input: PageInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()

  const parsed = pageSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const data = parsed.data

  const clash = await prisma.page.findUnique({ where: { slug: data.slug }, select: { id: true } })
  if (clash) {
    return {
      ok: false,
      error: 'That slug is already taken.',
      fieldErrors: { slug: 'Another page already lives at this URL.' },
    }
  }

  const page = await prisma.page.create({
    data: {
      slug: data.slug,
      title: data.title,
      content: data.content,
      isPublished: data.isPublished,
    },
    select: { id: true },
  })

  revalidatePolicy(data.slug)

  return { ok: true, data: { id: page.id } }
}

export async function updatePage(
  id: string,
  input: PageInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()

  const parsedId = idField.safeParse(id)
  if (!parsedId.success) return refuse('That page could not be identified.')

  const parsed = pageSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const data = parsed.data

  const existing = await prisma.page.findUnique({
    where: { id: parsedId.data },
    select: { id: true, slug: true },
  })
  if (!existing) return refuse('That page no longer exists.')

  const clash = await prisma.page.findUnique({ where: { slug: data.slug }, select: { id: true } })
  if (clash && clash.id !== existing.id) {
    return {
      ok: false,
      error: 'That slug is already taken.',
      fieldErrors: { slug: 'Another page already lives at this URL.' },
    }
  }

  await prisma.page.update({
    where: { id: existing.id },
    data: {
      slug: data.slug,
      title: data.title,
      content: data.content,
      isPublished: data.isPublished,
    },
  })

  revalidatePolicy(data.slug)
  // The old URL has to be purged too, or the renamed page keeps serving from its previous address.
  if (existing.slug !== data.slug) revalidatePath(`/pages/${existing.slug}`)

  return { ok: true, data: { id: existing.id } }
}

const publishSchema = z.object({ id: idField, isPublished: z.boolean() })

export async function setPagePublished(
  id: string,
  isPublished: boolean,
): Promise<ActionResult<{ isPublished: boolean }>> {
  await requireAdmin()

  const parsed = publishSchema.safeParse({ id, isPublished })
  if (!parsed.success) return refuse('That page could not be identified.')

  const existing = await prisma.page.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, slug: true },
  })
  if (!existing) return refuse('That page no longer exists.')

  await prisma.page.update({
    where: { id: existing.id },
    data: { isPublished: parsed.data.isPublished },
  })

  revalidatePolicy(existing.slug)

  return { ok: true, data: { isPublished: parsed.data.isPublished } }
}

export async function deletePage(id: string): Promise<ActionResult<null>> {
  await requireAdmin()

  const parsedId = idField.safeParse(id)
  if (!parsedId.success) return refuse('That page could not be identified.')

  const page = await prisma.page.findUnique({
    where: { id: parsedId.data },
    select: { id: true, slug: true },
  })
  if (!page) return refuse('That page no longer exists.')

  await prisma.page.delete({ where: { id: page.id } })

  revalidatePolicy(page.slug)

  return { ok: true, data: null }
}
