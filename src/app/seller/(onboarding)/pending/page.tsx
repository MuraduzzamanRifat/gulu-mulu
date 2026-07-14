import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Ban,
  CircleAlert,
  Clock,
  FileText,
  Headset,
  IdCard,
  Landmark,
  Smartphone,
  Store,
} from 'lucide-react'

import { buttonVariants, Card } from '@/components/ui'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/format'
import { SellerStatus } from '@/generated/prisma/client'
import { cn } from '@/lib/utils'

import { SellerStatusChip } from '../../_components/chips'

export const metadata = { title: 'Application status' }

/** The one thing the seller wants to know, said plainly, per status. */
const COPY: Record<
  Exclude<SellerStatus, 'APPROVED'>,
  {
    icon: React.ComponentType<{ className?: string }>
    tone: string
    heading: string
    body: string
  }
> = {
  PENDING: {
    icon: Clock,
    tone: 'bg-warning-soft text-accent-700',
    heading: 'Your application is under review',
    body: 'Our verification team is checking your trade licence and NID against the details you gave us. This usually takes one working day. We will call the number on your account the moment your shop is live — there is nothing else for you to do.',
  },
  REJECTED: {
    icon: CircleAlert,
    tone: 'bg-danger-soft text-danger',
    heading: 'We could not approve this application',
    body: 'Your documents did not pass verification. That is usually a trade licence number that does not match the business name, an expired licence, or an NID we could not read. Our team can tell you exactly which — call support and we will reopen the application.',
  },
  SUSPENDED: {
    icon: Ban,
    tone: 'bg-danger-soft text-danger',
    heading: 'Your shop is suspended',
    body: 'Your listings are hidden from the storefront and no new orders can be placed. Earnings you have already made are safe and will still be paid out. Suspension follows a policy breach — usually repeated cancellations or a product that broke the Product Policy. Support can walk you through it.',
  },
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | null
}) {
  if (!value) return null

  return (
    <div className="flex items-start gap-3 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs text-ink-muted">{label}</dt>
        <dd className="mt-0.5 text-sm break-words text-ink">{value}</dd>
      </div>
    </div>
  )
}

/**
 * `requireUser()`, not `requireSeller()` — requireSeller redirects an unapproved shop HERE, so
 * calling it on this page would loop forever. An APPROVED shop is bounced on to the real portal.
 */
export default async function SellerPendingPage() {
  const user = await requireUser()

  const seller = await prisma.seller.findUnique({ where: { userId: user.id } })
  if (!seller) redirect('/seller/register')
  if (seller.status === SellerStatus.APPROVED) redirect('/seller')

  const copy = COPY[seller.status as Exclude<SellerStatus, 'APPROVED'>]
  const Icon = copy.icon

  return (
    <>
      <Card className="p-5 sm:p-8">
        <div className={cn('grid size-12 place-items-center rounded-xl', copy.tone)}>
          <Icon className="size-6" aria-hidden="true" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{copy.heading}</h1>
          <SellerStatusChip status={seller.status} />
        </div>

        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">{copy.body}</p>

        <p className="mt-4 text-xs text-ink-subtle">
          Submitted {formatDate(seller.createdAt)}
          {seller.updatedAt.getTime() !== seller.createdAt.getTime()
            ? ` · last updated ${formatDate(seller.updatedAt)}`
            : ''}
        </p>

        {seller.status === SellerStatus.PENDING ? (
          <ol className="mt-6 space-y-3 border-t border-line pt-6">
            {[
              { done: true, label: 'Application submitted' },
              { done: false, label: 'Documents verified by our team' },
              { done: false, label: 'Shop goes live — list your first product' },
            ].map((step, index) => (
              <li key={step.label} className="flex items-center gap-3">
                <span
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                    step.done ? 'bg-success text-white' : 'bg-surface-sunken text-ink-subtle',
                  )}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span
                  className={cn('text-sm', step.done ? 'font-medium text-ink' : 'text-ink-muted')}
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row">
          <a
            href="tel:+8809610000000"
            className={cn(buttonVariants({ variant: 'primary' }), 'sm:w-auto')}
          >
            <Headset aria-hidden="true" />
            Call seller support
          </a>
          <Link
            href="/pages/seller-policy"
            className={cn(buttonVariants({ variant: 'outline' }), 'sm:w-auto')}
          >
            Read the Seller Policy
          </Link>
        </div>
      </Card>

      {/* What we hold on file. A seller under review should never have to guess what they sent. */}
      <Card className="mt-4">
        <div className="border-b border-line p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink">What you submitted</h2>
          <p className="mt-0.5 text-xs text-ink-subtle">
            Something wrong here? Call support — we can amend it while the application is open.
          </p>
        </div>

        <dl className="divide-y divide-line px-4 sm:px-5">
          <Detail icon={Store} label="Shop name" value={seller.businessName} />
          <Detail icon={Store} label="Shop link" value={`gulumulu.com.bd/shop/${seller.slug}`} />
          <Detail icon={FileText} label="What you sell" value={seller.description} />
          <Detail icon={FileText} label="Trade licence" value={seller.tradeLicenseNo} />
          <Detail icon={FileText} label="Licence document" value={seller.tradeLicenseUrl} />
          <Detail icon={IdCard} label="NID number" value={seller.nidNumber} />
          <Detail icon={IdCard} label="NID document" value={seller.nidUrl} />
          <Detail icon={Smartphone} label="bKash payout" value={seller.bkashNumber} />
          <Detail
            icon={Landmark}
            label="Bank payout"
            value={
              seller.bankAccountNumber
                ? [seller.bankName, seller.bankAccountName, seller.bankAccountNumber]
                    .filter(Boolean)
                    .join(' · ')
                : null
            }
          />
        </dl>
      </Card>
    </>
  )
}
