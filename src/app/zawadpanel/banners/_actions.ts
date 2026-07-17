'use server'

/**
 * Homepage banners.
 *
 * The single loudest surface on the marketplace: the hero carousel is the first thing a shopper in
 * Dhaka sees. Nothing here cascades, nothing here is referenced by another table — a banner can be
 * deleted freely, which is exactly why the ACTIVE toggle exists. Hiding a campaign is reversible;
 * deleting it is not.
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { BannerPlacement } from '@/generated/prisma/client'

import {
  displayOrder,
  idField,
  invalid,
  optionalLink,
  optionalText,
  refuse,
  requiredUrl,
  type ActionResult,
} from '../_lib/forms'

const bannerSchema = z.object({
  title: z.string().trim().min(2, 'Give the banner a headline.').max(80),
  subtitle: optionalText(140),
  imageUrl: requiredUrl('A banner needs an image.'),
  linkUrl: optionalLink(),
  placement: z.enum(BannerPlacement),
  displayOrder,
  isActive: z.boolean(),
})

export type BannerInput = z.input<typeof bannerSchema>

function revalidateBanners() {
  revalidatePath('/zawadpanel/banners')
  revalidatePath('/')
}

export async function createBanner(input: BannerInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()

  const parsed = bannerSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const data = parsed.data

  const banner = await prisma.banner.create({
    data: {
      title: data.title,
      subtitle: data.subtitle ?? null,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl ?? null,
      placement: data.placement,
      displayOrder: data.displayOrder,
      isActive: data.isActive,
    },
    select: { id: true },
  })

  revalidateBanners()

  return { ok: true, data: { id: banner.id } }
}

export async function updateBanner(
  id: string,
  input: BannerInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()

  const parsedId = idField.safeParse(id)
  if (!parsedId.success) return refuse('That banner could not be identified.')

  const parsed = bannerSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const data = parsed.data

  const existing = await prisma.banner.findUnique({
    where: { id: parsedId.data },
    select: { id: true },
  })
  if (!existing) return refuse('That banner no longer exists.')

  await prisma.banner.update({
    where: { id: existing.id },
    data: {
      title: data.title,
      subtitle: data.subtitle ?? null,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl ?? null,
      placement: data.placement,
      displayOrder: data.displayOrder,
      isActive: data.isActive,
    },
  })

  revalidateBanners()

  return { ok: true, data: { id: existing.id } }
}

/**
 * The one-click lever: pull a live campaign off the homepage without losing the artwork, the copy
 * or the link. This is the button an admin actually reaches for when a promotion ends at midnight.
 */
const toggleSchema = z.object({ id: idField, isActive: z.boolean() })

export async function setBannerActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult<{ isActive: boolean }>> {
  await requireAdmin()

  const parsed = toggleSchema.safeParse({ id, isActive })
  if (!parsed.success) return refuse('That banner could not be identified.')

  const existing = await prisma.banner.findUnique({
    where: { id: parsed.data.id },
    select: { id: true },
  })
  if (!existing) return refuse('That banner no longer exists.')

  await prisma.banner.update({
    where: { id: existing.id },
    data: { isActive: parsed.data.isActive },
  })

  revalidateBanners()

  return { ok: true, data: { isActive: parsed.data.isActive } }
}

export async function deleteBanner(id: string): Promise<ActionResult<null>> {
  await requireAdmin()

  const parsedId = idField.safeParse(id)
  if (!parsedId.success) return refuse('That banner could not be identified.')

  const banner = await prisma.banner.findUnique({
    where: { id: parsedId.data },
    select: { id: true },
  })
  if (!banner) return refuse('That banner no longer exists.')

  await prisma.banner.delete({ where: { id: banner.id } })

  revalidateBanners()

  return { ok: true, data: null }
}
