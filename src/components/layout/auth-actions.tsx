'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { destroySession } from '@/lib/auth'

/**
 * Sign out. Bound to the <form> inside the header account dropdown, so it works
 * with JavaScript disabled too.
 *
 * revalidatePath('/', 'layout') clears every cached segment below the root — otherwise
 * the signed-in header could be served from the client router cache after the redirect.
 */
export async function signOutAction(): Promise<void> {
  await destroySession()
  revalidatePath('/', 'layout')
  redirect('/')
}
