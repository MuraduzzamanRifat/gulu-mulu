'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button, Card, Input, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'

import { ConfirmDialog, Field, FormAlert, Toggle } from '../_components/crud'
import type { AdminPage } from '../_lib/data'
import { type FieldErrors } from '../_lib/forms'
import { slugify } from '../_lib/slug'
import { createPage, deletePage, updatePage, type PageInput } from './_actions'
import { CONTENT_MAX } from './_constants'

export interface PageEditorProps {
  /** Absent = a brand-new page. */
  page?: AdminPage
}

interface Draft {
  slug: string
  title: string
  titleBn: string
  content: string
  isPublished: boolean
}

const STARTER = `## Overview

Write the policy here in **Markdown**.

- Bullet points work
- So do [links](/products/search)

### Questions

Contact support on 16xxx.
`

/**
 * The policy-page editor.
 *
 * A full route rather than a dialog, because Markdown needs room — a 20,000-character return policy
 * typed into a modal is a return policy nobody proof-reads. The character count is live and turns
 * amber as the limit approaches, so the first an admin hears of the ceiling is not a rejected save
 * after twenty minutes of writing.
 */
export function PageEditor({ page }: PageEditorProps) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [deleting, setDeleting] = React.useState(false)

  const [draft, setDraft] = React.useState<Draft>(() => ({
    slug: page?.slug ?? '',
    title: page?.title ?? '',
    titleBn: page?.titleBn ?? '',
    content: page?.content ?? STARTER,
    isPublished: page?.isPublished ?? false,
  }))

  // An existing slug is a live URL that is linked from the footer and printed on invoices. It is
  // never re-derived from the title behind the admin's back.
  const [slugTouched, setSlugTouched] = React.useState(page !== undefined)
  const [error, setError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const characters = draft.content.length
  const words = draft.content.trim() === '' ? 0 : draft.content.trim().split(/\s+/).length
  const nearLimit = characters > CONTENT_MAX * 0.9
  const overLimit = characters > CONTENT_MAX

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    const input: PageInput = {
      slug: draft.slug,
      title: draft.title,
      titleBn: draft.titleBn,
      content: draft.content,
      isPublished: draft.isPublished,
    }

    startTransition(async () => {
      const result = page ? await updatePage(page.id, input) : await createPage(input)

      if (!result.ok) {
        setError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
        return
      }

      if (page) {
        toast.success(`“${draft.title}” saved.`)
        router.refresh()
      } else {
        toast.success(`“${draft.title}” created.`)
        // Land on the page's own editor, so the admin can keep writing rather than hunting for it
        // again in the list. `replace`, so Back does not offer them the empty create form.
        router.replace(`/admin/pages/${result.data.id}`)
      }
    })
  }

  function confirmDelete() {
    if (!page) return

    startTransition(async () => {
      const result = await deletePage(page.id)

      if (!result.ok) {
        toast.error(result.error)
        setDeleting(false)
        return
      }

      toast.success(`“${page.title}” deleted.`)
      router.replace('/admin/pages')
    })
  }

  return (
    <>
      <Link
        href="/admin/pages"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All pages
      </Link>

      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="space-y-4">
          {error ? <FormAlert message={error} /> : null}

          <Card className="space-y-4 p-4 sm:p-5">
            <Field id="page-title" label="Title" required>
              <Input
                id="page-title"
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                    slug: slugTouched ? current.slug : slugify(event.target.value),
                  }))
                }
                error={fieldErrors.title}
                placeholder="Return Policy"
                autoComplete="off"
              />
            </Field>

            <Field id="page-titleBn" label="Title (Bangla)" hint="Optional.">
              <Input
                id="page-titleBn"
                value={draft.titleBn}
                onChange={(event) => set('titleBn', event.target.value)}
                error={fieldErrors.titleBn}
                placeholder="রিটার্ন নীতি"
                autoComplete="off"
              />
            </Field>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <label htmlFor="page-content" className="text-sm font-medium text-ink">
                Content
                <span className="ml-0.5 text-danger" aria-hidden="true">
                  *
                </span>
              </label>

              {/* Live count. `aria-live=polite` so a screen-reader user hears it settle, rather than
                  every keystroke. */}
              <p
                aria-live="polite"
                className={cn(
                  'text-xs tabular-nums',
                  overLimit
                    ? 'font-semibold text-danger'
                    : nearLimit
                      ? 'font-medium text-accent-700'
                      : 'text-ink-subtle',
                )}
              >
                {characters.toLocaleString('en-US')} / {CONTENT_MAX.toLocaleString('en-US')}{' '}
                characters · {words.toLocaleString('en-US')} word{words === 1 ? '' : 's'}
              </p>
            </div>

            <Textarea
              id="page-content"
              value={draft.content}
              onChange={(event) => set('content', event.target.value)}
              error={fieldErrors.content}
              rows={22}
              spellCheck
              className="min-h-[28rem] font-mono text-sm leading-relaxed"
              placeholder="## Overview&#10;&#10;Write the policy in Markdown…"
            />

            <p className="mt-2 text-xs text-ink-subtle">
              Markdown. <span className="font-mono">## Heading</span>,{' '}
              <span className="font-mono">**bold**</span>,{' '}
              <span className="font-mono">- bullet</span>,{' '}
              <span className="font-mono">[text](/link)</span>.
            </p>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <Card className="space-y-4 p-4 sm:p-5">
            <Field
              id="page-slug"
              label="URL slug"
              required
              hint={
                page
                  ? 'Changing this breaks every link already pointing at the old address — including the footer and anything printed on an invoice.'
                  : 'This is the page’s permanent address.'
              }
            >
              <Input
                id="page-slug"
                value={draft.slug}
                onChange={(event) => {
                  setSlugTouched(true)
                  set('slug', event.target.value)
                }}
                error={fieldErrors.slug}
                placeholder="return-policy"
                autoComplete="off"
                className="font-mono"
              />
            </Field>

            {draft.slug ? (
              <a
                href={`/pages/${draft.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs text-brand-600 hover:underline"
              >
                /pages/{draft.slug}
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            ) : null}

            <Toggle
              id="page-published"
              label="Published"
              hint="Unpublished pages stay editable but are not served to shoppers."
              checked={draft.isPublished}
              onChange={(checked) => set('isPublished', checked)}
            />

            <Button type="submit" variant="primary" fullWidth loading={pending}>
              <Save aria-hidden="true" />
              {page ? 'Save changes' : 'Create page'}
            </Button>

            {page ? (
              <>
                <p className="text-center text-xs text-ink-subtle">
                  Last saved{' '}
                  {new Date(page.updatedAt).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>

                <Button
                  variant="ghost"
                  fullWidth
                  disabled={pending}
                  onClick={() => setDeleting(true)}
                  className="text-danger hover:bg-danger-soft"
                >
                  <Trash2 aria-hidden="true" />
                  Delete this page
                </Button>
              </>
            ) : null}
          </Card>
        </aside>
      </form>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete “${page?.title ?? 'this page'}”?`}
        confirmLabel="Delete page"
        pending={pending}
        onConfirm={confirmDelete}
      >
        <p className="text-sm text-ink-muted">
          <span className="font-mono">/pages/{page?.slug}</span> will start returning a 404,
          including from the footer and anywhere the link has been printed. If you only want it out
          of sight,{' '}
          <span className="font-medium text-ink">unpublish it instead</span> — the content is kept
          and it comes back with one click.
        </p>
      </ConfirmDialog>
    </>
  )
}
