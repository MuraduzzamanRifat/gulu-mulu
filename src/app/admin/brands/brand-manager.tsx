'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Tag } from 'lucide-react'
import { toast } from 'sonner'

import { Button, Card, EmptyState, Input } from '@/components/ui'

import { FeaturedChip } from '../_components/chips'
import { ConfirmDialog, DialogForm, Field, RowButtons, Toggle } from '../_components/crud'
import { Thumb } from '../_components/thumb'
import type { AdminBrand } from '../_lib/data'
import { toNumberOr, type FieldErrors } from '../_lib/forms'
import { slugify } from '../_lib/slug'
import { createBrand, deleteBrand, updateBrand, type BrandInput } from './_actions'

export interface BrandManagerProps {
  brands: AdminBrand[]
}

interface Draft {
  name: string
  slug: string
  logoUrl: string
  isFeatured: boolean
  displayOrder: string
}

const EMPTY: Draft = { name: '', slug: '', logoUrl: '', isFeatured: false, displayOrder: '0' }

function draftOf(brand: AdminBrand): Draft {
  return {
    name: brand.name,
    slug: brand.slug,
    logoUrl: brand.logoUrl ?? '',
    isFeatured: brand.isFeatured,
    displayOrder: String(brand.displayOrder),
  }
}

function toInput(draft: Draft): BrandInput {
  return {
    name: draft.name,
    slug: draft.slug,
    logoUrl: draft.logoUrl,
    isFeatured: draft.isFeatured,
    displayOrder: toNumberOr(draft.displayOrder, 0),
  }
}

export function BrandManager({ brands }: BrandManagerProps) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  const [editing, setEditing] = React.useState<AdminBrand | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [deleting, setDeleting] = React.useState<AdminBrand | null>(null)

  const [draft, setDraft] = React.useState<Draft>(EMPTY)
  const [slugTouched, setSlugTouched] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})

  const open = creating || editing !== null
  const featured = brands.filter((brand) => brand.isFeatured).length

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function openCreate() {
    setDraft(EMPTY)
    setSlugTouched(false)
    setError(null)
    setFieldErrors({})
    setEditing(null)
    setCreating(true)
  }

  function openEdit(brand: AdminBrand) {
    setDraft(draftOf(brand))
    setSlugTouched(true) // an existing slug is a live URL — never re-derive it
    setError(null)
    setFieldErrors({})
    setCreating(false)
    setEditing(brand)
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
      const result = editing ? await updateBrand(editing.id, input) : await createBrand(input)

      if (!result.ok) {
        setError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
        return
      }

      toast.success(editing ? `${draft.name} updated.` : `${draft.name} added.`)
      close()
      router.refresh()
    })
  }

  function confirmDelete() {
    if (!deleting) return
    const target = deleting

    startTransition(async () => {
      const result = await deleteBrand(target.id)

      if (!result.ok) {
        toast.error(result.error)
        setDeleting(null)
        return
      }

      toast.success(`${target.name} deleted.`)
      setDeleting(null)
      router.refresh()
    })
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {brands.length} brand{brands.length === 1 ? '' : 's'} · {featured} in the homepage strip
        </p>
        <Button variant="primary" onClick={openCreate}>
          <Plus aria-hidden="true" />
          New brand
        </Button>
      </div>

      <Card>
        {brands.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No brands yet"
            description="Brands power the homepage strip, the brand pages and the brand facet on search. Sellers pick from this list — they cannot invent their own."
            action={
              <Button variant="primary" onClick={openCreate}>
                <Plus aria-hidden="true" />
                New brand
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {brands.map((brand) => (
              <li key={brand.id} className="flex items-center gap-3 p-4">
                <Thumb src={brand.logoUrl} alt="" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-ink">{brand.name}</p>
                    <FeaturedChip featured={brand.isFeatured} />
                  </div>

                  <p className="mt-0.5 truncate font-mono text-xs text-ink-subtle">/{brand.slug}</p>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-ink-muted">
                    <span className="tabular-nums">
                      {brand._count.products} product{brand._count.products === 1 ? '' : 's'}
                    </span>
                    <span className="tabular-nums">order {brand.displayOrder}</span>
                  </div>
                </div>

                <RowButtons
                  label={brand.name}
                  onEdit={() => openEdit(brand)}
                  onDelete={() => setDeleting(brand)}
                  disabled={pending}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <DialogForm
        open={open}
        onOpenChange={(next) => (next ? undefined : close())}
        title={editing ? `Edit ${editing.name}` : 'New brand'}
        description={
          editing
            ? 'Changing the slug changes the brand’s public URL.'
            : 'Sellers will be able to file their products under this brand.'
        }
        error={error}
        pending={pending}
        submitLabel={editing ? 'Save changes' : 'Create brand'}
        onSubmit={submit}
      >
        <Field id="brand-name" label="Name" required>
          <Input
            id="brand-name"
            value={draft.name}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                name: event.target.value,
                slug: slugTouched ? current.slug : slugify(event.target.value),
              }))
            }
            error={fieldErrors.name}
            placeholder="Aarong"
            autoComplete="off"
          />
        </Field>

        <Field
          id="brand-slug"
          label="Slug"
          required
          hint={draft.slug ? `/brand/${draft.slug}` : 'The public URL for this brand.'}
        >
          <Input
            id="brand-slug"
            value={draft.slug}
            onChange={(event) => {
              setSlugTouched(true)
              set('slug', event.target.value)
            }}
            error={fieldErrors.slug}
            placeholder="aarong"
            autoComplete="off"
            className="font-mono"
          />
        </Field>

        <Field id="brand-logo" label="Logo URL" hint="Square works best — it is shown in a circle.">
          <Input
            id="brand-logo"
            type="url"
            value={draft.logoUrl}
            onChange={(event) => set('logoUrl', event.target.value)}
            error={fieldErrors.logoUrl}
            placeholder="https://images.unsplash.com/…"
            autoComplete="off"
          />
        </Field>

        <Field id="brand-order" label="Display order" hint="Lower numbers come first.">
          <Input
            id="brand-order"
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
          id="brand-featured"
          label="Feature on the homepage"
          hint="Puts the logo in the scrolling brand strip."
          checked={draft.isFeatured}
          onChange={(checked) => set('isFeatured', checked)}
        />
      </DialogForm>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => setDeleting(next ? deleting : null)}
        title={`Delete ${deleting?.name ?? 'this brand'}?`}
        confirmLabel="Delete brand"
        pending={pending}
        onConfirm={confirmDelete}
      >
        <p className="text-sm text-ink-muted">
          {deleting && deleting._count.products > 0 ? (
            <>
              This will be <span className="font-semibold text-danger">refused</span>:{' '}
              {deleting._count.products} product
              {deleting._count.products === 1 ? '' : 's'} still carr
              {deleting._count.products === 1 ? 'ies' : 'y'} this brand, and deleting it would strip
              the brand from {deleting._count.products === 1 ? 'that listing' : 'all of them'}{' '}
              without a word.
            </>
          ) : (
            <>
              It disappears from the homepage strip and the search facets. A brand with products
              cannot be deleted, so this is safe to try.
            </>
          )}
        </p>
      </ConfirmDialog>
    </>
  )
}
