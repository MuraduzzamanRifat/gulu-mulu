'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Banknote, Undo2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button, Card } from '@/components/ui'
// Types from Prisma, VALUES from '../_lib/enums' — a runtime import of the generated client
// would pull `node:module` into this client bundle and fail the build. See _lib/enums.ts.
import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/generated/prisma/client'
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from '../_lib/enums'
import { formatBDT } from '@/lib/format'

import { ConfirmDialog } from '../_components/crud'
import { OrderStatusChip, PaymentStatusChip } from '../_components/chips'
import {
  isDestructiveTransition,
  ORDER_ACTION_LABEL,
  ORDER_STATUS_LABEL,
  ORDER_TRANSITIONS,
  PAYMENT_ACTION_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_TRANSITIONS,
} from '../_lib/status'
import { advanceOrderStatus, setPaymentStatus } from './_actions'

export interface OrderStatusPanelProps {
  orderId: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  total: number
  itemCount: number
}

/**
 * The order's two levers: where it is, and whether it has been paid for.
 *
 * They are separate on purpose, because they genuinely are separate — a COD parcel can be delivered
 * and unpaid (the rider came back empty-handed), and a card order can be paid and never shipped.
 * Only the moves the server will actually accept are ever rendered, so the console can't offer a
 * button whose only outcome is a red toast.
 */
export function OrderStatusPanel({
  orderId,
  orderNumber,
  status,
  paymentStatus,
  paymentMethod,
  total,
  itemCount,
}: OrderStatusPanelProps) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [confirming, setConfirming] = React.useState<OrderStatus | null>(null)

  const nextStatuses = ORDER_TRANSITIONS[status]
  const nextPayments = PAYMENT_TRANSITIONS[paymentStatus]

  function move(next: OrderStatus) {
    startTransition(async () => {
      const result = await advanceOrderStatus(orderId, next)

      if (!result.ok) {
        toast.error(result.error)
        setConfirming(null)
        return
      }

      const parts = [`${orderNumber} is now ${ORDER_STATUS_LABEL[result.data.status].toLowerCase()}.`]
      if (result.data.restocked) parts.push('Stock has gone back on the shelf.')
      if (result.data.paymentStatus === PAYMENT_STATUS.PAID) {
        parts.push(`${formatBDT(total)} collected on delivery.`)
      }

      toast.success(parts.join(' '))
      setConfirming(null)
      router.refresh()
    })
  }

  function pay(next: PaymentStatus) {
    startTransition(async () => {
      const result = await setPaymentStatus(orderId, next)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(`Payment marked ${PAYMENT_STATUS_WORD[result.data.paymentStatus]}.`)
      router.refresh()
    })
  }

  return (
    <>
      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Fulfilment</h2>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-ink-muted">Currently</span>
          <OrderStatusChip status={status} />
        </div>

        {nextStatuses.length === 0 ? (
          <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2.5 text-xs text-ink-muted">
            This order is finished. {ORDER_STATUS_LABEL[status]} is a terminal state — stock has
            already been returned to the shelf, and reopening it could sell inventory twice.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {nextStatuses.map((next) => {
              const destructive = isDestructiveTransition(next)
              return (
                <Button
                  key={next}
                  variant={destructive ? 'outline' : 'primary'}
                  size="md"
                  disabled={pending}
                  loading={pending && confirming === null && !destructive}
                  onClick={() => (destructive ? setConfirming(next) : move(next))}
                  className={
                    destructive ? 'text-danger hover:border-danger hover:bg-danger-soft' : undefined
                  }
                >
                  {destructive ? (
                    <Undo2 aria-hidden="true" />
                  ) : (
                    <ArrowRight aria-hidden="true" />
                  )}
                  {ORDER_ACTION_LABEL[next]}
                </Button>
              )
            })}
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Payment</h2>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <PaymentStatusChip status={paymentStatus} />
          <span className="text-xs text-ink-muted">
            {PAYMENT_METHOD_LABEL[paymentMethod]} · {formatBDT(total)}
          </span>
        </div>

        {paymentMethod === PAYMENT_METHOD.COD && paymentStatus === PAYMENT_STATUS.PENDING ? (
          <p className="mt-3 rounded-lg bg-info-soft px-3 py-2.5 text-xs text-info">
            Cash on delivery settles itself: marking this order <strong>delivered</strong> records
            the {formatBDT(total)} as collected. You only need the buttons below if something went
            wrong.
          </p>
        ) : null}

        {paymentStatus === PAYMENT_STATUS.PAID && status === ORDER_STATUS.CANCELLED ? (
          <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2.5 text-xs text-danger">
            This order was cancelled but the customer has already paid {formatBDT(total)}. Send the
            money back, then mark it refunded — cancelling does not move a single Taka on its own.
          </p>
        ) : null}

        {nextPayments.length === 0 ? (
          <p className="mt-3 text-xs text-ink-subtle">
            Refunded is final. There is nothing further to record against this payment.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {nextPayments.map((next) => (
              <Button
                key={next}
                variant={next === PAYMENT_STATUS.PAID ? 'secondary' : 'outline'}
                size="sm"
                disabled={pending}
                onClick={() => pay(next)}
              >
                <Banknote aria-hidden="true" />
                {PAYMENT_ACTION_LABEL[next]}
              </Button>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => setConfirming(open ? confirming : null)}
        title={
          confirming === ORDER_STATUS.CANCELLED ? `Cancel ${orderNumber}?` : `Return ${orderNumber}?`
        }
        description={`${itemCount} line${itemCount === 1 ? '' : 's'} · ${formatBDT(total)}`}
        confirmLabel={
          confirming === ORDER_STATUS.CANCELLED ? 'Cancel this order' : 'Mark as returned'
        }
        pending={pending}
        onConfirm={() => {
          if (confirming) move(confirming)
        }}
      >
        <div className="space-y-2 text-sm text-ink-muted">
          <p>
            Every item goes back into stock and the sold count is wound back —{' '}
            {confirming === ORDER_STATUS.CANCELLED
              ? 'as though the order had never been placed'
              : 'the goods have come back to the warehouse'}
            .
          </p>
          {confirming === ORDER_STATUS.CANCELLED ? (
            <p>Any coupon the customer spent on this order is handed back to them, unused.</p>
          ) : null}
          <p>
            This cannot be undone. {ORDER_STATUS_LABEL[confirming ?? ORDER_STATUS.CANCELLED]} is
            terminal, because reopening the order would have to re-take stock that may have been
            sold to somebody else in the meantime.
          </p>
          {paymentStatus === PAYMENT_STATUS.PAID ? (
            <p className="font-medium text-danger">
              The customer has already paid {formatBDT(total)}. No money moves on its own — refund
              them, then mark the payment refunded.
            </p>
          ) : null}
        </div>
      </ConfirmDialog>
    </>
  )
}

/** Lower-case, for use mid-sentence in a toast. */
const PAYMENT_STATUS_WORD: Record<PaymentStatus, string> = {
  PENDING: 'unpaid',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
}
