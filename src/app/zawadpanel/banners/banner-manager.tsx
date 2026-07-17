'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Images, Link2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button, Card, EmptyState, Input, Select } from '@/components/ui'
// Types from Prisma, VALUES from '../_lib/enums' — a runtime import of the generated client
// would pull `node:module` into this client bundle and fail the build. See _lib/enums.ts.
import type { BannerPlacement } from '@/generated/prisma/client'
import { cn } from '@/lib/utils'

import { BANNER_PLACEMENT } from '../_lib/enums'

import { ActiveChip } from '../_components/chips'
import { ConfirmDialog, DialogForm, Field, RowButtons, Toggle } from '../_components/crud'
import { Thumb } from '../_components/thumb'
import type { AdminBanner } from '../_lib/data'
import { toNumberOr, type FieldErrors } from '../_lib/forms'
import {
  BANNER_PLACEMENT_HINT,
  BANNER_PLACEMENT_LABEL,
  BANNER_PLACEMENT_VALUES,
} from '../_lib/status'
import {
  createBanner,
  deleteBanner,
  setBannerActive,
  updateBanner,
  type BannerInput,
} from './_actions'

export interface BannerManagerProps {
  banners: AdminBanner[]
}

interface Draft {
  title: string
  subtitle: string
  imageUrl: string
  linkUrl: string
  placement: BannerPlacement
  displayOrder: string
  isActive: boolean
}

const EMPTY: Draft = {
  title: '',
  subtitle: '',
  imageUrl: '',
  linkUrl: '',
  placement: BANNER_PLACEMENT.HERO,
  displayOrder: '0',
  isActive: true,
}

function draftOf(banner: AdminBanner): Draft {
  return {
    title: banner.title,
    subtitle: banner.subtitle ?? '',
    imageUrl: banner.imageUrl,
    linkUrl: banner.linkUrl ?? '',
    placement: banner.placement,
    displayOrder: String(banner.displayOrder),
    isActive: banner.isActive,
  }
}

function toInput(draft: Draft): BannerInput {
  return {
    title: draft.title,
    subtitle: draft.subtitle,
    imageUrl: draft.imageUrl,
    linkUrl: draft.linkUrl,
    placement: draft.placement,
    displayOrder: toNumberOr(draft.displayOrder, 0),
    isActive: draft.isActive,
  }
}

/**
 * Banners, grouped by where they land on the homepage.
 *
 * Grouped rather than listed flat because "display order 2" means nothing on its own — it only
 * means something relative to the other banners in the SAME slot. Seeing the hero carousel as a
 * carousel is the whole point.
 */
export function BannerManager({ banners }: BannerManagerProps) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  const [editing, setEditing] = React.useState<AdminBanner | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [deleting, setDeleting] = React.useState<AdminBanner | null>(null)

  const [draft, setDraft] = React.useState<Draft>(EMPTY)
  const [error, setError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})

  const open = creating || editing !== null
  const live = banners.filter((banner) => banner.isActive).length

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function openCreate(placement: BannerPlacement = BANNER_PLACEMENT.HERO) {
    setDraft({ ...EMPTY, placement })
    setError(null)
    setFieldErrors({})
    setEditing(null)
    setCreating(true)
  }

  function openEdit(banner: AdminBanner) {
    setDraft(draftOf(banner))
    setError(null)
    setFieldErrors({})
    setCreating(false)
    setEditing(banner)
  }

  function close() {
    setCreating(false)
    setEditing(null)
  }

  function submit() {
    setError(null)
    setFieldErrors({})

    startTransition(async () => {
      const input = toInput(draft)
      const result = editing ? await updateBanner(editing.id, input) : await createBanner(input)

      if (!result.ok) {
        setError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
        return
      }

      toast.success(editing ? `“${draft.title}” updated.` : `“${draft.title}” created.`)
      close()
      router.refresh()
    })
  }

  function toggle(banner: AdminBanner) {
    startTransition(async () => {
      const result = await setBannerActive(banner.id, !banner.isActive)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(
        result.data.isActive
          ? `“${banner.title}” is live on the homepage.`
          : `“${banner.title}” is hidden.`,
      )
      router.refresh()
    })
  }

  function confirmDelete() {
    if (!deleting) return
    const target = deleting

    startTransition(async () => {
      const result = await deleteBanner(target.id)

      if (!result.ok) {
        toast.error(result.error)
        setDeleting(null)
        return
      }

      toast.success(`“${target.title}” deleted.`)
      setDeleting(null)
      router.refresh()
    })
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {banners.length} banner{banners.length === 1 ? '' : 's'} · {live} live
        </p>
        <Button variant="primary" onClick={() => openCreate()}>
          <Plus aria-hidden="true" />
          New banner
        </Button>
      </div>

      {banners.length === 0 ? (
        <Card>
          <EmptyState
            icon={Images}
            title="No banners yet"
            description="The hero carousel is the first thing a shopper sees. Give it something to say."
            action={
              <Button variant="primary" onClick={() => openCreate()}>
                <Plus aria-hidden="true" />
                New banner
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {BANNER_PLACEMENT_VALUES.map((placement) => {
            const group = banners.filter((banner) => banner.placement === placement)

            return (
              <section key={placement} aria-label={BANNER_PLACEMENT_LABEL[placement]}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-ink">
                      {BANNER_PLACEMENT_LABEL[placement]}
                    </h2>
                    <p className="text-xs text-ink-muted">{BANNER_PLACEMENT_HINT[placement]}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openCreate(placement)}
                    className={cn(
                      'inline-flex shrink-0 cursor-pointer items-center rounded-lg px-2 py-2 text-xs font-semibold text-brand-600',
                      'transition-colors hover:bg-brand-50 hover:text-brand-700',
                      'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                    )}
                  >
                    + Add to this slot
                  </button>
                </div>

                <Card>
                  {group.length === 0 ? (
                    <p className="p-4 text-sm text-ink-subtle">
                      Nothing in this slot. The homepage simply skips it.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {group.map((banner) => (
                        <li
                          key={banner.id}
                          className={cn(
                            'flex flex-col gap-3 p-4 sm:flex-row sm:items-center',
                            !banner.isActive && 'bg-surface-muted',
                          )}
                        >
                          <Thumb
                            src={banner.imageUrl}
                            alt=""
                            wide
                            className={cn('w-full sm:w-28', !banner.isActive && 'opacity-50')}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-sm font-semibold text-ink">
                                {banner.title}
                              </p>
                              <ActiveChip active={banner.isActive} />
                            </div>

                            {banner.subtitle ? (
                              <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">
                                {banner.subtitle}
                              </p>
                            ) : null}

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-subtle">
                              {banner.linkUrl ? (
                                <span className="inline-flex min-w-0 items-center gap-1">
                                  <Link2 className="size-3 shrink-0" aria-hidden="true" />
                                  <span className="truncate font-mono">{banner.linkUrl}</span>
                                </span>
                              ) : (
                                <span>No link — decorative only</span>
                              )}
                              <span className="tabular-nums">order {banner.displayOrder}</span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggle(banner)}
                              disabled={pending}
                              aria-label={
                                banner.isActive
                                  ? `Hide ${banner.title} from the homepage`
                                  : `Show ${banner.title} on the homepage`
                              }
                              className={cn(
                                'inline-flex size-11 cursor-pointer items-center justify-center rounded-lg transition-colors',
                                'disabled:pointer-events-none disabled:opacity-50',
                                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                                banner.isActive
                                  ? 'text-success hover:bg-success-soft'
                                  : 'text-ink-subtle hover:bg-surface-sunken hover:text-ink',
                              )}
                            >
                              {banner.isActive ? (
                                <Eye className="size-4" aria-hidden="true" />
                              ) : (
                                <EyeOff className="size-4" aria-hidden="true" />
                              )}
                            </button>

                            <RowButtons
                              label={banner.title}
                              onEdit={() => openEdit(banner)}
                              onDelete={() => setDeleting(banner)}
                              disabled={pending}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </section>
            )
          })}
        </div>
      )}

      <DialogForm
        open={open}
        onOpenChange={(next) => (next ? undefined : close())}
        title={editing ? `Edit “${editing.title}”` : 'New banner'}
        description="Shown on the homepage. Hidden banners keep their artwork and can be brought back with one click."
        error={error}
        pending={pending}
        submitLabel={editing ? 'Save changes' : 'Create banner'}
        onSubmit={submit}
      >
        {/* Preview first: a banner is a picture, and an admin is judging the picture. */}
        {draft.imageUrl ? (
          <div className="overflow-hidden rounded-lg border border-line">
            <Thumb src={draft.imageUrl} alt="" wide className="aspect-[16/9] w-full rounded-none border-0" />
          </div>
        ) : null}

        <Field id="banner-title" label="Headline" required>
          <Input
            id="banner-title"
            value={draft.title}
            onChange={(event) => set('title', event.target.value)}
            error={fieldErrors.title}
            placeholder="Eid Collection — up to 60% off"
            autoComplete="off"
          />
        </Field>

        <Field id="banner-subtitle" label="Subtitle" hint="One line under the headline. Optional.">
          <Input
            id="banner-subtitle"
            value={draft.subtitle}
            onChange={(event) => set('subtitle', event.target.value)}
            error={fieldErrors.subtitle}
            placeholder="Free delivery inside Dhaka on orders over ৳999"
            autoComplete="off"
          />
        </Field>

        <Field id="banner-image" label="Image URL" required>
          <Input
            id="banner-image"
            type="url"
            value={draft.imageUrl}
            onChange={(event) => set('imageUrl', event.target.value)}
            error={fieldErrors.imageUrl}
            placeholder="https://images.unsplash.com/…"
            autoComplete="off"
          />
        </Field>

        <Field
          id="banner-link"
          label="Link"
          hint="Where a tap goes — e.g. /products/search?categories=womens-fashion. Leave blank for a banner that is not clickable."
        >
          <Input
            id="banner-link"
            value={draft.linkUrl}
            onChange={(event) => set('linkUrl', event.target.value)}
            error={fieldErrors.linkUrl}
            placeholder="/products/search?priceMax=999"
            autoComplete="off"
            className="font-mono"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="banner-placement"
            label="Placement"
            required
            hint={BANNER_PLACEMENT_HINT[draft.placement]}
          >
            <Select
              id="banner-placement"
              value={draft.placement}
              onChange={(event) => set('placement', event.target.value as BannerPlacement)}
              error={fieldErrors.placement}
            >
              {BANNER_PLACEMENT_VALUES.map((value) => (
                <option key={value} value={value}>
                  {BANNER_PLACEMENT_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field id="banner-order" label="Display order" hint="Lower numbers come first.">
            <Input
              id="banner-order"
              type="number"
              inputMode="numeric"
              min={0}
              value={draft.displayOrder}
              onChange={(event) => set('displayOrder', event.target.value)}
              error={fieldErrors.displayOrder}
              className="tabular-nums"
            />
          </Field>
        </div>

        <Toggle
          id="banner-active"
          label="Live on the homepage"
          hint="Turn this off to pull the campaign without deleting it."
          checked={draft.isActive}
          onChange={(checked) => set('isActive', checked)}
        />
      </DialogForm>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => setDeleting(next ? deleting : null)}
        title={`Delete “${deleting?.title ?? 'this banner'}”?`}
        confirmLabel="Delete banner"
        pending={pending}
        onConfirm={confirmDelete}
      >
        <p className="text-sm text-ink-muted">
          The artwork, copy and link go with it, and this cannot be undone. If the campaign is just
          over, <span className="font-medium text-ink">hide it instead</span> — it keeps everything
          and comes back with one click.
        </p>
      </ConfirmDialog>
    </>
  )
}
