'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Eye, EyeOff, Plus, Ticket } from 'lucide-react'
import { toast } from 'sonner'

import { Button, Card, EmptyState, Input, Select } from '@/components/ui'
import { formatBDT, PLACEHOLDER_IMAGE } from '@/lib/format'
import { cn } from '@/lib/utils'

import { ConfirmDialog, DialogForm, Field, RowButtons, Toggle } from '../_components/crud'
import type { AdminCollection } from '../_lib/data'
import { toNumber, toNumberOr, type FieldErrors } from '../_lib/forms'
import {
  createCollection,
  deleteCollection,
  setCollectionActive,
  updateCollection,
  type CollectionInput,
} from './_actions'

interface PickerOption {
  id: string
  name: string
  slug: string
}

export interface CollectionManagerProps {
  collections: AdminCollection[]
  categories: PickerOption[]
  brands: PickerOption[]
}

interface Draft {
  label: string
  labelBn: string
  imageUrl: string
  priceMax: string
  categoryId: string
  brandId: string
  displayOrder: string
  isActive: boolean
}

const EMPTY: Draft = {
  label: '',
  labelBn: '',
  imageUrl: '',
  priceMax: '999',
  categoryId: '',
  brandId: '',
  displayOrder: '0',
  isActive: true,
}

function draftOf(collection: AdminCollection): Draft {
  return {
    label: collection.label,
    labelBn: collection.labelBn ?? '',
    imageUrl: collection.imageUrl ?? '',
    priceMax: String(collection.priceMax),
    categoryId: collection.categoryId ?? '',
    brandId: collection.brandId ?? '',
    displayOrder: String(collection.displayOrder),
    isActive: collection.isActive,
  }
}

function toInput(draft: Draft): CollectionInput {
  return {
    label: draft.label,
    labelBn: draft.labelBn,
    imageUrl: draft.imageUrl,
    // Deliberately NOT `?? 0`: an empty budget is not a free-for-all collection, it is a mistake,
    // and Zod must be the one to say so.
    priceMax: toNumber(draft.priceMax) as number,
    categoryId: draft.categoryId,
    brandId: draft.brandId,
    displayOrder: toNumberOr(draft.displayOrder, 0),
    isActive: draft.isActive,
  }
}

/**
 * The storefront link this collection will actually produce.
 *
 * Kept byte-identical to `collectionHref()` in components/home/shop-under-grid.tsx — if the two ever
 * disagree, the admin is merchandising against a URL that does not exist. Showing it live is what
 * turns "priceMax 999, category beauty" from a pair of form fields into something an admin can read
 * and believe.
 */
function previewHref(priceMax: string, category?: PickerOption, brand?: PickerOption): string {
  const ceiling = toNumber(priceMax)
  const params = new URLSearchParams({ priceMax: String(ceiling ?? 0) })

  if (category) params.set('categories', category.slug)
  else if (brand) params.set('brands', brand.slug)

  return `/products/search?${params.toString()}`
}

export function CollectionManager({ collections, categories, brands }: CollectionManagerProps) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  const [editing, setEditing] = React.useState<AdminCollection | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [deleting, setDeleting] = React.useState<AdminCollection | null>(null)

  const [draft, setDraft] = React.useState<Draft>(EMPTY)
  const [error, setError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})

  const open = creating || editing !== null
  const live = collections.filter((collection) => collection.isActive).length

  const draftCategory = categories.find((category) => category.id === draft.categoryId)
  const draftBrand = brands.find((brand) => brand.id === draft.brandId)

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function openCreate() {
    setDraft(EMPTY)
    setError(null)
    setFieldErrors({})
    setEditing(null)
    setCreating(true)
  }

  function openEdit(collection: AdminCollection) {
    setDraft(draftOf(collection))
    setError(null)
    setFieldErrors({})
    setCreating(false)
    setEditing(collection)
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
      const result = editing
        ? await updateCollection(editing.id, input)
        : await createCollection(input)

      if (!result.ok) {
        setError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
        return
      }

      toast.success(editing ? `“${draft.label}” updated.` : `“${draft.label}” created.`)
      close()
      router.refresh()
    })
  }

  function toggle(collection: AdminCollection) {
    startTransition(async () => {
      const result = await setCollectionActive(collection.id, !collection.isActive)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(
        result.data.isActive
          ? `“${collection.label}” is live on the homepage.`
          : `“${collection.label}” is hidden.`,
      )
      router.refresh()
    })
  }

  function confirmDelete() {
    if (!deleting) return
    const target = deleting

    startTransition(async () => {
      const result = await deleteCollection(target.id)

      if (!result.ok) {
        toast.error(result.error)
        setDeleting(null)
        return
      }

      toast.success(`“${target.label}” deleted.`)
      setDeleting(null)
      router.refresh()
    })
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {collections.length} collection{collections.length === 1 ? '' : 's'} · {live} live
        </p>
        <Button variant="primary" onClick={openCreate}>
          <Plus aria-hidden="true" />
          New collection
        </Button>
      </div>

      {collections.length === 0 ? (
        <Card>
          <EmptyState
            icon={Ticket}
            title="No collections yet"
            description="“Beauty under ৳999” is the highest-intent card on the homepage — a shopper who taps it is not browsing a category, they are browsing a budget."
            action={
              <Button variant="primary" onClick={openCreate}>
                <Plus aria-hidden="true" />
                New collection
              </Button>
            }
          />
        </Card>
      ) : (
        // The grid mirrors the homepage's own, so what an admin arranges here is what a shopper sees.
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => {
            const scope = collection.category?.name ?? collection.brand?.name
            const href = previewHref(
              String(collection.priceMax),
              collection.category ?? undefined,
              collection.brand ?? undefined,
            )

            return (
              <Card
                key={collection.id}
                className={cn('overflow-hidden', !collection.isActive && 'opacity-60')}
              >
                <div className="relative aspect-[4/3] w-full bg-surface-sunken">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={collection.imageUrl ?? PLACEHOLDER_IMAGE}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="size-full object-cover"
                  />

                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-transparent"
                  />

                  <span className="absolute top-2 left-2 inline-flex items-center rounded-full bg-accent-500 px-2 py-0.5 text-[0.625rem] font-bold tracking-wide text-ink uppercase">
                    Under {formatBDT(collection.priceMax)}
                  </span>

                  {!collection.isActive ? (
                    <span className="absolute top-2 right-2 inline-flex items-center rounded-full bg-slate-900/90 px-2 py-0.5 text-[0.625rem] font-bold tracking-wide text-white uppercase">
                      Hidden
                    </span>
                  ) : null}

                  <div className="absolute inset-x-0 bottom-0 p-3">
                    {scope ? (
                      <p className="truncate text-[0.625rem] font-medium tracking-wide text-white/70 uppercase">
                        {scope}
                      </p>
                    ) : (
                      <p className="text-[0.625rem] font-medium tracking-wide text-white/70 uppercase">
                        Whole catalogue
                      </p>
                    )}
                    <p className="line-clamp-2 text-sm font-bold text-white">{collection.label}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-w-0 flex-1 items-center gap-1 truncate font-mono text-xs text-ink-muted transition-colors hover:text-brand-600 hover:underline"
                  >
                    <span className="truncate">{href}</span>
                    <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                  </a>

                  <button
                    type="button"
                    onClick={() => toggle(collection)}
                    disabled={pending}
                    aria-label={
                      collection.isActive
                        ? `Hide ${collection.label}`
                        : `Show ${collection.label} on the homepage`
                    }
                    className={cn(
                      'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors',
                      'disabled:pointer-events-none disabled:opacity-50',
                      'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                      collection.isActive
                        ? 'text-success hover:bg-success-soft'
                        : 'text-ink-subtle hover:bg-surface-sunken hover:text-ink',
                    )}
                  >
                    {collection.isActive ? (
                      <Eye className="size-4" aria-hidden="true" />
                    ) : (
                      <EyeOff className="size-4" aria-hidden="true" />
                    )}
                  </button>

                  <RowButtons
                    label={collection.label}
                    onEdit={() => openEdit(collection)}
                    onDelete={() => setDeleting(collection)}
                    disabled={pending}
                  />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <DialogForm
        open={open}
        onOpenChange={(next) => (next ? undefined : close())}
        title={editing ? `Edit “${editing.label}”` : 'New collection'}
        description="A budget, not a category. The card links straight into a pre-filtered search."
        error={error}
        pending={pending}
        submitLabel={editing ? 'Save changes' : 'Create collection'}
        onSubmit={submit}
      >
        <Field id="col-label" label="Label" required hint="What the card says. Lead with the number.">
          <Input
            id="col-label"
            value={draft.label}
            onChange={(event) => set('label', event.target.value)}
            error={fieldErrors.label}
            placeholder="Beauty essentials under ৳999"
            autoComplete="off"
          />
        </Field>

        <Field id="col-labelBn" label="Label (Bangla)" hint="Optional.">
          <Input
            id="col-labelBn"
            value={draft.labelBn}
            onChange={(event) => set('labelBn', event.target.value)}
            error={fieldErrors.labelBn}
            placeholder="৯৯৯ টাকার নিচে বিউটি"
            autoComplete="off"
          />
        </Field>

        <Field
          id="col-priceMax"
          label="Budget ceiling"
          required
          hint="The number the whole card is built on. Shoppers filter on what they actually pay, discounts included."
        >
          <Input
            id="col-priceMax"
            type="number"
            inputMode="numeric"
            min={1}
            value={draft.priceMax}
            onChange={(event) => set('priceMax', event.target.value)}
            error={fieldErrors.priceMax}
            trailing={<span className="text-xs font-medium">৳</span>}
            className="tabular-nums"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="col-category"
            label="Narrow to a category"
            hint="Optional. A category OR a brand — not both."
          >
            <Select
              id="col-category"
              value={draft.categoryId}
              disabled={draft.brandId !== ''}
              onChange={(event) => set('categoryId', event.target.value)}
              error={fieldErrors.categoryId}
            >
              <option value="">Whole catalogue</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            id="col-brand"
            label="…or to a brand"
            hint={draft.categoryId ? 'Clear the category to pick a brand instead.' : 'Optional.'}
          >
            <Select
              id="col-brand"
              value={draft.brandId}
              disabled={draft.categoryId !== ''}
              onChange={(event) => set('brandId', event.target.value)}
              error={fieldErrors.brandId}
            >
              <option value="">Any brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* The URL this will actually produce. An admin who can read the link can trust the card. */}
        <div className="rounded-lg bg-surface-muted p-3">
          <p className="text-xs font-medium text-ink-muted">Shoppers will land on</p>
          <p className="mt-1 truncate font-mono text-xs text-ink">
            {previewHref(draft.priceMax, draftCategory, draftBrand)}
          </p>
        </div>

        <Field id="col-image" label="Image URL" hint="The card artwork. Landscape or square both work.">
          <Input
            id="col-image"
            type="url"
            value={draft.imageUrl}
            onChange={(event) => set('imageUrl', event.target.value)}
            error={fieldErrors.imageUrl}
            placeholder="https://images.unsplash.com/…"
            autoComplete="off"
          />
        </Field>

        <Field id="col-order" label="Display order" hint="Lower numbers come first on the homepage.">
          <Input
            id="col-order"
            type="number"
            inputMode="numeric"
            min={0}
            value={draft.displayOrder}
            onChange={(event) => set('displayOrder', event.target.value)}
            error={fieldErrors.displayOrder}
            className="tabular-nums"
          />
        </Field>

        <Toggle
          id="col-active"
          label="Live on the homepage"
          checked={draft.isActive}
          onChange={(checked) => set('isActive', checked)}
        />
      </DialogForm>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => setDeleting(next ? deleting : null)}
        title={`Delete “${deleting?.label ?? 'this collection'}”?`}
        confirmLabel="Delete collection"
        pending={pending}
        onConfirm={confirmDelete}
      >
        <p className="text-sm text-ink-muted">
          It disappears from the homepage. No products are affected — a collection is only a
          saved search. If you just want it off the page for now,{' '}
          <span className="font-medium text-ink">hide it instead</span>.
        </p>
      </ConfirmDialog>
    </>
  )
}
