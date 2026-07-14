'use client'

import * as React from 'react'
import { CheckCircle2, Lock, Mail, Phone, UserRound } from 'lucide-react'

import { Button, Input, Label } from '@/components/ui'

import {
  EMPTY_PROFILE_STATE,
  updateProfileAction,
  type ProfileFormState,
} from './_actions'

export interface ProfileFormProps {
  name: string | null
  email: string | null
  /** The login identity. Rendered, never submitted. */
  phone: string
}

/**
 * Edit name and email.
 *
 * The phone field is `disabled` AND has no `name`, so it is not merely un-editable in the UI — it
 * is not part of the form data at all, and the Server Action's schema wouldn't accept it if it
 * were. Defence in depth for the one field that IS the account.
 */
export function ProfileForm({ name, email, phone }: ProfileFormProps) {
  const [state, formAction, pending] = React.useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    EMPTY_PROFILE_STATE,
  )

  const errors = state.fieldErrors ?? {}

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.status === 'success' && state.message ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-success/40 bg-success-soft p-3 text-sm text-success"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {state.message}
        </p>
      ) : null}

      <div>
        <Label htmlFor="profile-phone">Mobile number</Label>
        <Input
          id="profile-phone"
          type="tel"
          value={phone}
          icon={Phone}
          disabled
          readOnly
          trailing={<Lock className="size-4" aria-hidden="true" />}
          className="tabular-nums"
        />
        {/* ink-muted, not ink-subtle: subtle is ~2.9:1 on white and this is field instruction. */}
        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
          This is how you sign in, so it can&rsquo;t be changed here. Contact support if you&rsquo;ve
          switched numbers.
        </p>
      </div>

      <div>
        <Label htmlFor="profile-name">Full name</Label>
        <Input
          id="profile-name"
          name="name"
          maxLength={60}
          defaultValue={name ?? ''}
          placeholder="Your name"
          icon={UserRound}
          autoComplete="name"
          disabled={pending}
          error={errors.name}
        />
        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
          We use this to greet you and to prefill the recipient on new addresses.
        </p>
      </div>

      <div>
        <Label htmlFor="profile-email">Email</Label>
        <Input
          id="profile-email"
          name="email"
          type="email"
          maxLength={120}
          defaultValue={email ?? ''}
          placeholder="you@example.com"
          icon={Mail}
          autoComplete="email"
          disabled={pending}
          error={errors.email}
        />
        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
          Optional. Order receipts go here when you add one. Leave it blank to remove it.
        </p>
      </div>

      <div className="flex border-t border-line pt-5">
        <Button type="submit" size="lg" loading={pending} fullWidth className="sm:w-auto sm:min-w-44">
          Save changes
        </Button>
      </div>
    </form>
  )
}
