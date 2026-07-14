'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button, Dialog } from '@/components/ui'

import { deleteProduct } from './_actions'

export interface ProductRowActionsProps {
  productId: string
  title: string
}

/**
 * Edit + delete for one row. Delete is behind a <Dialog> confirm — the action itself refuses to
 * delete anything that has ever been ordered, but a listing with 200 views and no sales is still
 * an hour of someone's work, and one stray tap should not vaporise it.
 */
export function ProductRowActions({ productId, title }: ProductRowActionsProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteProduct(productId)

      if (!result.ok) {
        toast.error(result.error)
        setOpen(false)
        return
      }

      toast.success('Product deleted.')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Link
          href={`/seller/products/${productId}/edit`}
          aria-label={`Edit ${title}`}
          className="inline-flex size-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Link>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Delete ${title}`}
          className="inline-flex size-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-danger"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        size="sm"
        title="Delete this product?"
        description={`“${title}” will be removed from your shop. This cannot be undone.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Keep it
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={pending}>
              Delete product
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          A product that has already been ordered cannot be deleted — that would tear a hole in a
          customer’s order history. Set its stock to 0 instead to take it out of circulation.
        </p>
      </Dialog>
    </>
  )
}
