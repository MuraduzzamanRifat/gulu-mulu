'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui'
// Types from Prisma, VALUES from '../_lib/enums' — a runtime import of the generated client
// would pull `node:module` into this client bundle and fail the build. See _lib/enums.ts.
import type { ProductStatus } from '@/generated/prisma/client'
import { cn } from '@/lib/utils'

import { PRODUCT_STATUS } from '../_lib/enums'

import { ConfirmDialog } from '../_components/crud'
import { setProductStatus } from './_actions'

export interface ProductModerationProps {
  productId: string
  title: string
  status: ProductStatus
  sellerName: string
  className?: string
}

/**
 * Approve / reject one listing.
 *
 * Approve is one click — clearing the queue is the whole job, and a confirm on the happy path is a
 * confirm nobody reads. Rejecting a listing that is currently LIVE is the one move that takes
 * something away from a shopper mid-browse, so that one asks first.
 */
export function ProductModeration({
  productId,
  title,
  status,
  sellerName,
  className,
}: ProductModerationProps) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [confirming, setConfirming] = React.useState(false)

  function run(next: ProductStatus, success: string) {
    startTransition(async () => {
      const result = await setProductStatus(productId, next)

      if (!result.ok) {
        toast.error(result.error)
        setConfirming(false)
        return
      }

      toast.success(success)
      setConfirming(false)
      router.refresh()
    })
  }

  // A draft has not been submitted. There is nothing here for an admin to decide yet.
  if (status === PRODUCT_STATUS.DRAFT) {
    return (
      <span className={cn('text-xs text-ink-subtle', className)}>Not submitted for review</span>
    )
  }

  const approve = () => run(PRODUCT_STATUS.APPROVED, `“${title}” is live on the storefront.`)

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {status !== PRODUCT_STATUS.APPROVED ? (
          <Button
            variant={status === PRODUCT_STATUS.PENDING ? 'primary' : 'outline'}
            size="sm"
            loading={pending && !confirming}
            onClick={approve}
          >
            <Check aria-hidden="true" />
            {status === PRODUCT_STATUS.PENDING ? 'Approve' : 'Approve after all'}
          </Button>
        ) : null}

        {status !== PRODUCT_STATUS.REJECTED ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              // Rejecting something already live pulls it off the shelf. Ask.
              if (status === PRODUCT_STATUS.APPROVED) setConfirming(true)
              else run(PRODUCT_STATUS.REJECTED, `“${title}” has been rejected.`)
            }}
            className="text-danger hover:border-danger hover:bg-danger-soft"
          >
            <X aria-hidden="true" />
            {status === PRODUCT_STATUS.APPROVED ? 'Take down' : 'Reject'}
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Take this listing down?"
        description={`“${title}” by ${sellerName}`}
        confirmLabel="Take it down"
        pending={pending}
        onConfirm={() => run(PRODUCT_STATUS.REJECTED, `“${title}” has been taken down.`)}
      >
        <p className="text-sm text-ink-muted">
          It disappears from search, its category page and its own URL immediately. Anything already
          in a shopper&rsquo;s cart stays there but can no longer be checked out, and orders already
          placed are unaffected — they still have to be fulfilled.
        </p>
      </ConfirmDialog>
    </>
  )
}
