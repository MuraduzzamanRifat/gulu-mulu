'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui'
import { cn } from '@/lib/utils'

import { deleteAddressAction, setDefaultAddressAction } from './_actions'

export interface AddressCardActionsProps {
  addressId: string
  label: string
  isDefault: boolean
}

/**
 * Edit / set-default / delete for one saved address.
 *
 * Delete asks first. An address is a minute of typing on a phone keyboard, and a mis-tap on a
 * 375px screen is not consent — but a full modal for one destructive button is heavier than the
 * decision deserves, so the button turns into its own inline confirm.
 */
export function AddressCardActions({ addressId, label, isDefault }: AddressCardActionsProps) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [confirming, setConfirming] = React.useState(false)

  function makeDefault() {
    startTransition(async () => {
      const result = await setDefaultAddressAction({ addressId })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(`${label} is now your default address`)
      router.refresh()
    })
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteAddressAction({ addressId })

      if (!result.ok) {
        toast.error(result.error)
        setConfirming(false)
        return
      }

      toast.success('Address deleted')
      router.refresh()
    })
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm font-medium text-ink">Delete this address?</p>

        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Keep it
        </Button>

        <Button variant="danger" size="sm" loading={pending} onClick={remove}>
          Delete
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isDefault ? (
        <Button
          variant="ghost"
          size="sm"
          loading={pending}
          onClick={makeDefault}
          className="text-brand-600 hover:bg-brand-50"
        >
          <CheckCircle2 aria-hidden="true" />
          Set as default
        </Button>
      ) : null}

      <Link
        href={`/account/addresses/${addressId}/edit`}
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'ml-auto text-ink-muted')}
      >
        <Pencil aria-hidden="true" />
        Edit
      </Link>

      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => setConfirming(true)}
        className="text-ink-muted hover:bg-danger-soft hover:text-danger"
        aria-label={`Delete address ${label}`}
      >
        <Trash2 aria-hidden="true" />
        Delete
      </Button>
    </div>
  )
}
