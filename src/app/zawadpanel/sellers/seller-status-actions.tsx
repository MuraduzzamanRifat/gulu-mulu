'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Check, RotateCcw, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui'
// Types from Prisma, VALUES from '../_lib/enums' — a runtime import of the generated client
// would pull `node:module` into this client bundle and fail the build. See _lib/enums.ts.
import type { SellerStatus } from '@/generated/prisma/client'
import { cn } from '@/lib/utils'

import { SELLER_STATUS } from '../_lib/enums'

import { ConfirmDialog } from '../_components/crud'
import { setSellerStatus } from './_actions'

export interface SellerStatusActionsProps {
  sellerId: string
  businessName: string
  status: SellerStatus
  productCount: number
  className?: string
}

/**
 * Approve / reject / suspend / reinstate, showing only the moves that are legal from where the shop
 * currently stands (the server enforces the same graph — this just stops the admin reaching for a
 * button that was always going to be refused).
 *
 * Everything that takes a shop OFF the storefront is behind a confirm that says, in Taka and in
 * listings, what is about to disappear. Approving is one click: the whole job is clearing that
 * queue, and a confirm on the happy path is a confirm nobody reads.
 */
export function SellerStatusActions({
  sellerId,
  businessName,
  status,
  productCount,
  className,
}: SellerStatusActionsProps) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [confirming, setConfirming] = React.useState<SellerStatus | null>(null)

  function run(next: SellerStatus, success: string) {
    startTransition(async () => {
      const result = await setSellerStatus(sellerId, next)

      if (!result.ok) {
        toast.error(result.error)
        setConfirming(null)
        return
      }

      toast.success(success)
      setConfirming(null)
      router.refresh()
    })
  }

  const listings =
    productCount === 0
      ? 'They have no listings yet.'
      : `Their ${productCount} listing${productCount === 1 ? '' : 's'} will disappear from the storefront immediately — search, category pages and direct links alike.`

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {status === SELLER_STATUS.PENDING ? (
          <>
            <Button
              variant="primary"
              size="sm"
              loading={pending && confirming === null}
              onClick={() => run(SELLER_STATUS.APPROVED, `${businessName} is now selling.`)}
            >
              <Check aria-hidden="true" />
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setConfirming(SELLER_STATUS.REJECTED)}
              className="text-danger hover:border-danger hover:bg-danger-soft"
            >
              <X aria-hidden="true" />
              Reject
            </Button>
          </>
        ) : null}

        {status === SELLER_STATUS.APPROVED ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setConfirming(SELLER_STATUS.SUSPENDED)}
            className="text-danger hover:border-danger hover:bg-danger-soft"
          >
            <Ban aria-hidden="true" />
            Suspend
          </Button>
        ) : null}

        {status === SELLER_STATUS.SUSPENDED ? (
          <>
            <Button
              variant="primary"
              size="sm"
              loading={pending && confirming === null}
              onClick={() => run(SELLER_STATUS.APPROVED, `${businessName} is selling again.`)}
            >
              <RotateCcw aria-hidden="true" />
              Reinstate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setConfirming(SELLER_STATUS.REJECTED)}
              className="text-danger hover:bg-danger-soft"
            >
              Reject permanently
            </Button>
          </>
        ) : null}

        {status === SELLER_STATUS.REJECTED ? (
          <Button
            variant="outline"
            size="sm"
            loading={pending && confirming === null}
            onClick={() => run(SELLER_STATUS.APPROVED, `${businessName} has been approved.`)}
          >
            <Check aria-hidden="true" />
            Approve after all
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirming === SELLER_STATUS.REJECTED}
        onOpenChange={(open) => setConfirming(open ? SELLER_STATUS.REJECTED : null)}
        title={`Reject ${businessName}?`}
        description="They will not be able to sell on Gulu Mulu."
        confirmLabel="Reject this shop"
        pending={pending}
        onConfirm={() => run(SELLER_STATUS.REJECTED, `${businessName} has been rejected.`)}
      >
        <p className="text-sm text-ink-muted">
          {listings} You can approve them later if they come back with better documents — rejection
          is not permanent, but it does end their access today.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirming === SELLER_STATUS.SUSPENDED}
        onOpenChange={(open) => setConfirming(open ? SELLER_STATUS.SUSPENDED : null)}
        title={`Suspend ${businessName}?`}
        description="A suspension is reversible — use it while you investigate."
        confirmLabel="Suspend this shop"
        pending={pending}
        onConfirm={() => run(SELLER_STATUS.SUSPENDED, `${businessName} has been suspended.`)}
      >
        <p className="text-sm text-ink-muted">
          {listings} Orders they have already taken are unaffected and still have to be fulfilled —
          suspending a shop does not cancel its customers&rsquo; parcels.
        </p>
      </ConfirmDialog>
    </>
  )
}
