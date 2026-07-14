import { Banknote, Landmark, Smartphone, TrendingUp, Wallet } from 'lucide-react'

import { Card, EmptyState } from '@/components/ui'
import { requireSeller } from '@/lib/auth'
import { formatBDT, formatDate } from '@/lib/format'

import { PayoutStatusChip } from '../../_components/chips'
import { PageHeader } from '../../_components/page-header'
import { StatCard } from '../../_components/stat-card'
import { getPayoutBalance, getSellerPayouts } from '../../_lib/data'

export const metadata = { title: 'Payouts' }

export default async function SellerPayoutsPage() {
  const { seller } = await requireSeller()

  const [balance, payouts] = await Promise.all([
    getPayoutBalance(seller.id),
    getSellerPayouts(seller.id),
  ])

  const hasBankDetails = Boolean(seller.bankAccountNumber)
  const hasBkash = Boolean(seller.bkashNumber)

  return (
    <>
      <PageHeader
        title="Payouts"
        description="What you have earned, what has been sent, and what is still on its way."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Unpaid balance"
          value={formatBDT(balance.unpaid)}
          hint="Delivered, not yet in a payout"
          icon={Wallet}
          tone="brand"
        />
        <StatCard
          label="Lifetime earnings"
          value={formatBDT(balance.earned)}
          hint="Your cut of every delivered line"
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Paid out"
          value={formatBDT(balance.paid)}
          hint="Settled to your account"
          icon={Banknote}
          tone="info"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="border-b border-line p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-ink">Payout history</h2>
            <p className="mt-0.5 text-xs text-ink-subtle">
              Payouts run weekly, closing Thursday midnight. Every line that reached the customer in
              the period is settled together.
            </p>
          </div>

          {payouts.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No payouts yet"
              description={
                balance.unpaid > 0
                  ? `You have ${formatBDT(balance.unpaid)} waiting. It is settled in the next weekly cycle.`
                  : 'Once your first order is delivered, your earnings are settled in the following weekly cycle.'
              }
            />
          ) : (
            <>
              {/* Mobile: cards. */}
              <ul className="divide-y divide-line md:hidden">
                {payouts.map((payout) => (
                  <li key={payout.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-bold text-ink tabular-nums">
                          {formatBDT(payout.amount)}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {formatDate(payout.periodStart)} → {formatDate(payout.periodEnd)}
                        </p>
                      </div>
                      <PayoutStatusChip status={payout.status} />
                    </div>

                    <p className="mt-2 text-xs text-ink-subtle">
                      {payout.paidAt
                        ? `Paid ${formatDate(payout.paidAt)}`
                        : 'Not yet sent'}
                      {payout.reference ? ` · Ref ${payout.reference}` : ''}
                    </p>
                  </li>
                ))}
              </ul>

              {/* Desktop: table. */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-ink-muted">
                      <th className="px-5 py-2.5 font-medium">Period</th>
                      <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                      <th className="px-5 py-2.5 font-medium">Status</th>
                      <th className="px-5 py-2.5 font-medium">Paid</th>
                      <th className="px-5 py-2.5 font-medium">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="hover:bg-surface-muted">
                        <td className="px-5 py-3 text-ink">
                          {formatDate(payout.periodStart)} → {formatDate(payout.periodEnd)}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-ink tabular-nums">
                          {formatBDT(payout.amount)}
                        </td>
                        <td className="px-5 py-3">
                          <PayoutStatusChip status={payout.status} />
                        </td>
                        <td className="px-5 py-3 text-ink-muted">
                          {payout.paidAt ? formatDate(payout.paidAt) : '—'}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-ink-muted">
                          {payout.reference ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="border-b border-line p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-ink">Where the money goes</h2>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              {hasBkash ? (
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <Smartphone className="size-4.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">bKash</p>
                    <p className="text-xs text-ink-muted tabular-nums">{seller.bkashNumber}</p>
                  </div>
                </div>
              ) : null}

              {hasBankDetails ? (
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-info-soft text-info">
                    <Landmark className="size-4.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {seller.bankName ?? 'Bank account'}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {seller.bankAccountName ?? '—'}
                    </p>
                    <p className="truncate text-xs text-ink-muted tabular-nums">
                      {seller.bankAccountNumber}
                    </p>
                  </div>
                </div>
              ) : null}

              {!hasBkash && !hasBankDetails ? (
                <p className="text-sm text-ink-muted">
                  No payout method on file. Contact support to add a bank account or bKash number —
                  earnings accrue either way, but nothing can be sent until there is somewhere to
                  send it.
                </p>
              ) : null}
            </div>
          </Card>

          <Card className="bg-surface-muted p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-ink">How the balance is worked out</h2>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              A line pays out once it is <span className="font-semibold text-ink">delivered</span> —
              not when it is ordered. Your unpaid balance is every delivered line’s net earning, less
              everything already covered by a payout above (including one that is scheduled but not
              yet sent, so no Taka is ever counted twice).
            </p>
            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Delivered earnings</dt>
                <dd className="font-medium text-ink tabular-nums">{formatBDT(balance.earned)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Covered by payouts</dt>
                <dd className="font-medium text-ink tabular-nums">
                  −{formatBDT(balance.allocated)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-1.5">
                <dt className="font-semibold text-ink">Unpaid balance</dt>
                <dd className="font-bold text-ink tabular-nums">{formatBDT(balance.unpaid)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  )
}
