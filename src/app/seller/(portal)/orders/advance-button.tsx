'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui'
import type { OrderStatus } from '@/generated/prisma/client'

import { ADVANCE_LABEL, nextOrderStatus, ORDER_STATUS_LABEL } from '../../_lib/status'
import { advanceOrderItem } from './_actions'

export interface AdvanceButtonProps {
  orderItemId: string
  status: OrderStatus
}

/**
 * Moves one line up the fulfilment ladder. The button never says which status to jump to — it sends
 * the line id and the status it currently believes, and the SERVER decides what comes next.
 */
export function AdvanceButton({ orderItemId, status }: AdvanceButtonProps) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  const next = nextOrderStatus(status)

  if (!next) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-subtle">
        {status === 'DELIVERED' ? (
          <>
            <Check className="size-3.5 text-success" aria-hidden="true" />
            Fulfilled
          </>
        ) : (
          ORDER_STATUS_LABEL[status]
        )}
      </span>
    )
  }

  function advance() {
    startTransition(async () => {
      const result = await advanceOrderItem({ orderItemId, expected: status })

      if (!result.ok) {
        toast.error(result.error)
        router.refresh()
        return
      }

      toast.success(`Line marked ${ORDER_STATUS_LABEL[result.data.status].toLowerCase()}.`)
      router.refresh()
    })
  }

  return (
    <Button variant="outline" size="sm" loading={pending} onClick={advance}>
      {ADVANCE_LABEL[status]}
      <ArrowRight aria-hidden="true" />
    </Button>
  )
}
