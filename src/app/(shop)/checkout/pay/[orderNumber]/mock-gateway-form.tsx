'use client'

import * as React from 'react'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

import { Button } from '@/components/ui'

import { settleMockPayment } from './_actions'

export interface MockGatewayFormProps {
  orderNumber: string
}

/**
 * The two buttons that stand in for a real card form.
 *
 * Co-located with its Server Action rather than living in components/checkout, because the action
 * sits behind a `[orderNumber]` dynamic segment and a module specifier containing `[` and `]` is
 * asking a bundler for trouble. `./_actions` has neither.
 *
 * Both buttons call the same action, which redirects to the order page either way — a failed
 * payment is not an error, it is an OUTCOME, and the customer must still land somewhere that tells
 * them what happened and lets them retry.
 */
export function MockGatewayForm({ orderNumber }: MockGatewayFormProps) {
  const [pending, setPending] = React.useState<'success' | 'failure' | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [, startTransition] = React.useTransition()

  function settle(outcome: 'success' | 'failure') {
    setPending(outcome)
    setError(null)

    startTransition(async () => {
      const result = await settleMockPayment({ orderNumber, outcome })

      // Only ever reached on failure — the happy path redirects and never comes back.
      if (result && !result.ok) {
        setError(result.error)
        setPending(null)
      }
    })
  }

  return (
    <div className="space-y-3">
      <Button
        size="lg"
        fullWidth
        loading={pending === 'success'}
        disabled={pending !== null}
        onClick={() => settle('success')}
        className="bg-success hover:bg-success/90 active:bg-success/80"
      >
        <CheckCircle2 aria-hidden="true" />
        Simulate successful payment
      </Button>

      <Button
        size="lg"
        fullWidth
        variant="outline"
        loading={pending === 'failure'}
        disabled={pending !== null}
        onClick={() => settle('failure')}
        className="border-danger text-danger hover:border-danger hover:bg-danger-soft"
      >
        <XCircle aria-hidden="true" />
        Simulate failed payment
      </Button>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}
