'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CornerDownRight, FolderTree, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button, Card, EmptyState, Input, Select } from '@/components/ui'
import { cn } from '@/lib/utils'

import { FeaturedChip } from '../_components/chips'
import { ConfirmDialog, DialogForm, Field, RowButtons, Toggle } from '../_components/crud'
import { Thumb } from '../_components/thumb'
import type { AdminCategory } from '../_lib/data'
import type { FieldErrors } from '../_lib/forms'
import { toNumberOr } from '../_lib/forms'
import { slugify } from '../_lib/slug'
import { createCategory, deleteCategory, updateCategory, type CategoryInput } from './_actions'

export interface CategoryManagerProps {
  categories: AdminCategory[]
}

interface Draft {
  name: string
  nameBn: string
  slug: string
  imageUrl: string
  parentId: string
  isFeatured: boolean
  displayOrder: string
}

const EMPTY: Draft = {
  name: '',
  nameBn: '',
  slug: '',
  imageUrl: '',
  parentId: '',
  isFeatured: false,
  displayOrder: '0',
}

function draftOf(category: AdminCategory): Draft {
  return {
    name: category.name,
    nameBn: category.nameBn ?? '',
    slug: category.slug,
    imageUrl: category.imageUrl ?? '',
    parentId: category.parentId ?? '',
    isFeatured: category.isFeatured,
    displayOrder: String(category.displayOrder),
  }
}

function toInput(draft: Draft): CategoryInput {
  return {
    name: draft.name,
    nameBn: draft.nameBn,
    slug: draft.slug,
    imageUrl: draft.imageUrl,
    parentId: draft.parentId,
    isFeatured: draft.isFeatured,
    displayOrder: toNumberOr(draft.displayOrder, 0),
  }
}

/**
 * The category tree, edited in place.
 *
 * The tree is TWO levels — that is not a simplification, it is what the storefront's mega-menu
 * actually renders, and a third level would create categories that hold products and can never be
 * reached. The parent picker therefore only ever offers top-level categories, and is disabled
 * outright for a category that already has children of its own.
 */
export function CategoryManager({ categories }: CategoryManagerProps) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  const [editing, setEditing] = React.useState<AdminCategory | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [deleting, setDeleting] = React.useState<AdminCategory | null>(null)

  const [draft, setDraft] = React.useState<Draft>(EMPTY)
  const [slugTouched, setSlugTouched] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})

  const open = creating || editing !== null

  // Top-level categories are both the rows we render first AND the only legal parents.
  const roots = categories.filter((category) => category.parentId === null)
  const childrenOf = (parentId: string) =>
    categories.filter((category) => category.parentId === parentId)

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

  function openEdit(category: AdminCategory) {
    setDraft(draftOf(category))
    // An existing slug is a live URL. Never re-derive it behind the admin's back.
    setSlugTouched(true)
    setError(null)
    setFieldErrors({})
    setCreating(false)
    setEditing(category)
  }

  function close() {
    setCreating(false)
    setEditing(null)
  }

  function onNameChange(value: string) {
    setDraft((current) => ({
      ...current,
      name: value,
      slug: slugTouched ? current.slug : slugify(value),
    }))
  }

  function submit() {
    setError(null)
    setFieldErrors({})

    startTransition(async () => {
      const input = toInput(draft)
      const result = editing
        ? await updateCategory(editing.id, input)
        : await createCategory(input)

      if (!result.ok) {
        setError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
        return
      }

      toast.success(editing ? `“${draft.name}” updated.` : `“${draft.name}” created.`)
      close()
      router.refresh()
    })
  }

  function confirmDelete() {
    if (!deleting) return
    const target = deleting

    startTransition(async () => {
      const result = await deleteCategory(target.id)

      if (!result.ok) {
        // A refusal ("still holds 12 products") is the whole point of the confirm. It is information,
        // not a crash — keep the dialog open so the admin can read it and act.
        toast.error(result.error)
        setDeleting(null)
        return
      }

      toast.success(`“${target.name}” deleted.`)
      setDeleting(null)
      router.refresh()
    })
  }

  // A category with children of its own must stay at the top level (see the doc comment).
  const lockedToTopLevel = editing !== null && editing._count.children > 0

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {categories.length} categor{categories.length === 1 ? 'y' : 'ies'} · {roots.length} top
          level
        </p>
        <Button variant="primary" onClick={openCreate}>
          <Plus aria-hidden="true" />
          New category
        </Button>
      </div>

      <Card>
        {categories.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title="No categories yet"
            description="Categories are the spine of the storefront — the menu, the homepage strip and every search facet are built from them. Start with a top-level one."
            action={
              <Button variant="primary" onClick={openCreate}>
                <Plus aria-hidden="true" />
                New category
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {roots.map((root) => {
              const children = childrenOf(root.id)

              return (
                <li key={root.id}>
                  <CategoryRow
                    category={root}
                    onEdit={() => openEdit(root)}
                    onDelete={() => setDeleting(root)}
                    disabled={pending}
                  />

                  {children.length > 0 ? (
                    <ul className="border-t border-line bg-surface-muted">
                      {children.map((child) => (
                        <li key={child.id} className="border-b border-line last:border-b-0">
                          <CategoryRow
                            category={child}
                            nested
                            onEdit={() => openEdit(child)}
                            onDelete={() => setDeleting(child)}
                            disabled={pending}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <DialogForm
        open={open}
        onOpenChange={(next) => (next ? undefined : close())}
        title={editing ? `Edit ${editing.name}` : 'New category'}
        description={
          editing
            ? 'Changing the slug changes its public URL — any link already shared will stop working.'
            : 'Two levels only: a category is either top level, or a child of one.'
        }
        error={error}
        pending={pending}
        submitLabel={editing ? 'Save changes' : 'Create category'}
        onSubmit={submit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cat-name" label="Name" required>
            <Input
              id="cat-name"
              value={draft.name}
              onChange={(event) => onNameChange(event.target.value)}
              error={fieldErrors.name}
              placeholder="Women’s Fashion"
              autoComplete="off"
            />
          </Field>

          <Field id="cat-nameBn" label="Name (Bangla)" hint="Optional — shown to Bangla shoppers.">
            <Input
              id="cat-nameBn"
              value={draft.nameBn}
              onChange={(event) => set('nameBn', event.target.value)}
              error={fieldErrors.nameBn}
              placeholder="নারীদের ফ্যাশন"
              autoComplete="off"
            />
          </Field>
        </div>

        <Field
          id="cat-slug"
          label="Slug"
          required
          hint={draft.slug ? `/category/${draft.slug}` : 'The public URL for this category.'}
        >
          <Input
            id="cat-slug"
            value={draft.slug}
            onChange={(event) => {
              setSlugTouched(true)
              set('slug', event.target.value)
            }}
            error={fieldErrors.slug}
            placeholder="womens-fashion"
            autoComplete="off"
            className="font-mono"
          />
        </Field>

        <Field
          id="cat-parent"
          label="Parent"
          hint={
            lockedToTopLevel
              ? 'This category has sub-categories of its own, so it must stay at the top level.'
              : 'Leave as “Top level” to make it a main menu heading.'
          }
        >
          <Select
            id="cat-parent"
            value={draft.parentId}
            disabled={lockedToTopLevel}
            onChange={(event) => set('parentId', event.target.value)}
            error={fieldErrors.parentId}
          >
            <option value="">Top level</option>
            {roots
              .filter((parent) => parent.id !== editing?.id)
              .map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
          </Select>
        </Field>

        <Field
          id="cat-image"
          label="Image URL"
          hint="Used by the homepage quick-nav circle and the deal grid."
        >
          <Input
            id="cat-image"
            type="url"
            value={draft.imageUrl}
            onChange={(event) => set('imageUrl', event.target.value)}
            error={fieldErrors.imageUrl}
            placeholder="https://images.unsplash.com/…"
            autoComplete="off"
          />
        </Field>

        <Field
          id="cat-order"
          label="Display order"
          hint="Lower numbers come first. Ties fall back to alphabetical."
        >
          <Input
            id="cat-order"
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
          id="cat-featured"
          label="Feature on the homepage"
          hint="Puts it in the circular quick-nav strip at the top of the homepage."
          checked={draft.isFeatured}
          onChange={(checked) => set('isFeatured', checked)}
        />
      </DialogForm>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(next) => setDeleting(next ? deleting : null)}
        title={`Delete ${deleting?.name ?? 'this category'}?`}
        confirmLabel="Delete category"
        pending={pending}
        onConfirm={confirmDelete}
      >
        <p className="text-sm text-ink-muted">
          {deleting && deleting._count.products > 0 ? (
            <>
              This will be <span className="font-semibold text-danger">refused</span>:{' '}
              {deleting.name} still holds {deleting._count.products} product
              {deleting._count.products === 1 ? '' : 's'}, and every product must have a category.
              Move them somewhere else first.
            </>
          ) : (
            <>
              It disappears from the menu, the homepage strip and every search facet. Nothing that
              holds products can be deleted, so this is safe to try.
            </>
          )}
        </p>
      </ConfirmDialog>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Row                                                                        */
/* -------------------------------------------------------------------------- */

function CategoryRow({
  category,
  nested = false,
  onEdit,
  onDelete,
  disabled,
}: {
  category: AdminCategory
  nested?: boolean
  onEdit: () => void
  onDelete: () => void
  disabled: boolean
}) {
  return (
    <div className={cn('flex items-center gap-3 p-4', nested && 'pl-6 sm:pl-10')}>
      {nested ? (
        <CornerDownRight
          className="size-4 shrink-0 text-ink-subtle sm:-ml-6"
          aria-hidden="true"
        />
      ) : null}

      <Thumb src={category.imageUrl} alt="" className={nested ? 'size-10' : 'size-12'} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p
            className={cn(
              'truncate text-ink',
              nested ? 'text-sm font-medium' : 'text-sm font-semibold',
            )}
          >
            {category.name}
          </p>
          <FeaturedChip featured={category.isFeatured} />
        </div>

        <p className="mt-0.5 truncate font-mono text-xs text-ink-subtle">/{category.slug}</p>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-muted">
          <span className="tabular-nums">
            {category._count.products} product{category._count.products === 1 ? '' : 's'}
          </span>
          {category._count.children > 0 ? (
            <span className="tabular-nums">
              {category._count.children} sub-categor
              {category._count.children === 1 ? 'y' : 'ies'}
            </span>
          ) : null}
          <span className="tabular-nums">order {category.displayOrder}</span>
        </div>
      </div>

      <RowButtons label={category.name} onEdit={onEdit} onDelete={onDelete} disabled={disabled} />
    </div>
  )
}
