'use client'

import { useFormStatus } from 'react-dom'
import { Loader2, LogOut } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * The submit button for the sign-out <form>. Split out purely so it can read `useFormStatus()`,
 * which only reports the status of a form *above* it in the tree.
 *
 * Sign-out is a round trip to the server (destroy the session, revalidate the whole layout,
 * redirect). On a BD 3G connection that is not instant, and a button that does nothing visible
 * when tapped gets tapped again. Disabling while pending also means the action cannot be fired
 * twice, and the spinner replaces the icon rather than sitting next to it so the row never
 * changes width.
 */
export function SignOutButton({ className, role }: { className?: string; role?: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      role={role}
      disabled={pending}
      className={cn(className, 'disabled:cursor-default disabled:opacity-60')}
    >
      {pending ? (
        <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <LogOut aria-hidden="true" />
      )}
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
