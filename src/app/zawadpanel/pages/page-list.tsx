'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, FileText, Pencil } from 'lucide-react'
import { toast } from 'sonner'

import { Badge, Card, EmptyState } from '@/components/ui'
import { cn } from '@/lib/utils'

import type { AdminPage } from '../_lib/data'
import { setPagePublished } from './_actions'

export interface PageListProps {
  pages: AdminPage[]
}

/** "Last saved 3 Jul, 14:02" */
function savedAt(date: Date | string): string {
  return new Date(date).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** A rough sense of length without opening the page. */
function excerptOf(content: string): string {
  const plain = content
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/[*_`>#-]/g, '') // the rest of the Markdown furniture
    .replace(/\s+/g, ' ')
    .trim()

  return plain.length > 120 ? `${plain.slice(0, 120)}…` : plain
}

export function PageList({ pages }: PageListProps) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  function togglePublished(page: AdminPage) {
    startTransition(async () => {
      const result = await setPagePublished(page.id, !page.isPublished)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(
        result.data.isPublished ? `“${page.title}” is live.` : `“${page.title}” is unpublished.`,
      )
      router.refresh()
    })
  }

  if (pages.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={FileText}
          title="No policy pages yet"
          description="Return Policy, Refund Policy, Seller Policy, Terms. These are the pages a marketplace is judged on when something goes wrong — and they are in the database precisely so changing one does not need a deploy."
          action={
            <Link
              href="/zawadpanel/pages/new"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-600"
            >
              Write the first page
            </Link>
          }
        />
      </Card>
    )
  }

  return (
    <Card>
      <ul className="divide-y divide-line">
        {pages.map((page) => (
          <li
            key={page.id}
            className={cn('flex items-start gap-3 p-4', !page.isPublished && 'bg-surface-muted')}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/zawadpanel/pages/${page.id}`}
                  className="truncate text-sm font-semibold text-ink transition-colors hover:text-brand-600"
                >
                  {page.title}
                </Link>
                <Badge variant={page.isPublished ? 'success' : 'neutral'}>
                  {page.isPublished ? 'Published' : 'Draft'}
                </Badge>
              </div>

              <p className="mt-0.5 truncate font-mono text-xs text-ink-subtle">
                /pages/{page.slug}
              </p>

              <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{excerptOf(page.content)}</p>

              <p className="mt-1 text-xs text-ink-subtle tabular-nums">
                {page.content.length.toLocaleString('en-US')} characters · saved{' '}
                {savedAt(page.updatedAt)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => togglePublished(page)}
                disabled={pending}
                aria-label={
                  page.isPublished ? `Unpublish ${page.title}` : `Publish ${page.title}`
                }
                className={cn(
                  'inline-flex size-11 cursor-pointer items-center justify-center rounded-lg transition-colors',
                  'disabled:pointer-events-none disabled:opacity-50',
                  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                  page.isPublished
                    ? 'text-success hover:bg-success-soft'
                    : 'text-ink-subtle hover:bg-surface-sunken hover:text-ink',
                )}
              >
                {page.isPublished ? (
                  <Eye className="size-4" aria-hidden="true" />
                ) : (
                  <EyeOff className="size-4" aria-hidden="true" />
                )}
              </button>

              <Link
                href={`/zawadpanel/pages/${page.id}`}
                aria-label={`Edit ${page.title}`}
                className="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
