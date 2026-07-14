import { redirect } from 'next/navigation'
import { BadgeCheck, Banknote, TrendingUp } from 'lucide-react'

import { Card } from '@/components/ui'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SellerStatus } from '@/generated/prisma/client'

import { RegisterForm } from './register-form'

export const metadata = { title: 'Become a seller' }

const PITCH = [
  {
    icon: TrendingUp,
    title: 'Reach the whole country',
    body: 'Your listings sit beside every other shop on the marketplace — search, category pages, deals, the lot.',
  },
  {
    icon: Banknote,
    title: 'Weekly payouts',
    body: 'Delivered orders settle every week to your bank account or bKash. Commission is shown on every line.',
  },
  {
    icon: BadgeCheck,
    title: 'We handle delivery',
    body: 'Cash on delivery, courier pickup and returns are ours. You pack the parcel; we move it.',
  },
] as const

/**
 * `requireUser()` — NOT `requireSeller()`. requireSeller sends a user with no shop straight here,
 * so calling it on this page would be an infinite redirect. Anyone signed in may apply.
 */
export default async function SellerRegisterPage() {
  const user = await requireUser()

  // Already applied? There is nothing to fill in — send them where they actually belong.
  const seller = await prisma.seller.findUnique({
    where: { userId: user.id },
    select: { status: true },
  })
  if (seller) {
    redirect(seller.status === SellerStatus.APPROVED ? '/seller' : '/seller/pending')
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Sell on Gulu Mulu
        </h1>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">
          Tell us about your business. We verify every shop before it goes live — trade licence and
          NID — which is exactly why shoppers trust the ones that are.
        </p>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {PITCH.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="p-4">
            <Icon className="size-5 text-brand-500" aria-hidden="true" />
            <h2 className="mt-2.5 text-sm font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{body}</p>
          </Card>
        ))}
      </div>

      <RegisterForm />
    </>
  )
}
