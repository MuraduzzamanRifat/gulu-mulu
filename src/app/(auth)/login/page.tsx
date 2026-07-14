import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth'

import { safeNextPath } from '../_lib/next-path'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign in',
  description:
    'Sign in to Gulu Mulu with your Bangladeshi mobile number. No password — we text you a ' +
    'six-digit code.',
  robots: { index: false, follow: false },
}

/**
 * /login — the only door into the app.
 *
 * `searchParams` is a Promise in Next 16. `?next=` is set by src/proxy.ts on every gated
 * redirect; sanitising it HERE as well as in the Server Action is deliberate belt-and-braces —
 * the page uses it to seed the form, the action re-checks whatever comes back.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const { next } = await searchParams
  const destination = safeNextPath(next)

  // Already signed in? Don't make them log in twice — send them straight where they were headed.
  const user = await getCurrentUser()
  if (user) redirect(destination)

  return <LoginForm next={destination} />
}
