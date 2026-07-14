import Link from 'next/link'
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  IdCard,
  Package,
  Search,
  Store,
  Users,
} from 'lucide-react'

import { buttonVariants, Card, EmptyState, Input, Select } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { formatBDT, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SellerStatus } from '@/generated/prisma/client'

import { SellerStatusChip } from '../_components/chips'
import { PageHeader } from '../_components/page-header'
import { Thumb } from '../_components/thumb'
import { getAdminSellers, type AdminSellerRow } from '../_lib/data'
import { formatRate } from '../_lib/rate'
import { SELLER_STATUS_LABEL, SELLER_STATUS_VALUES, toSellerStatus } from '../_lib/status'
import { CommissionDial } from './commission-dial'
import { SellerStatusActions } from './seller-status-actions'

export const metadata = { title: 'Sellers' }

interface PageProps {
  // Next 16: searchParams is a Promise.
  searchParams: Promise<{ status?: string; q?: string }>
}

/* -------------------------------------------------------------------------- */
/* Verification documents                                                     */
/* -------------------------------------------------------------------------- */

function DocumentTile({
  icon: Icon,
  label,
  number,
  url,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  number: string | null
  url: string | null
}) {
  const missing = !number && !url

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3',
        missing ? 'border-amber-300 bg-amber-50' : 'border-line bg-surface',
      )}
    >
      <div
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-lg',
          missing ? 'bg-amber-400 text-slate-950' : 'bg-surface-sunken text-ink-muted',
        )}
      >
        {missing ? (
          <AlertTriangle className="size-4" aria-hidden="true" />
        ) : (
          <Icon className="size-4" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink-muted">{label}</p>

        {missing ? (
          <p className="mt-0.5 text-sm font-medium text-amber-800">Not submitted</p>
        ) : (
          <>
            <p className="mt-0.5 truncate font-mono text-sm font-semibold text-ink">
              {number ?? 'No number given'}
            </p>

            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
              >
                View scan
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            ) : (
              <p className="mt-1 text-xs text-ink-subtle">No scan uploaded</p>
            )}
          </>
        )}
      </div>

      {url ? <Thumb src={url} alt={`${label} scan`} className="size-14" /> : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* The review queue                                                           */
/* -------------------------------------------------------------------------- */

/**
 * A shop awaiting review, with everything needed to make the call ON THE CARD.
 *
 * An approval queue that makes you click into a detail page to see the trade licence is an approval
 * queue that gets rubber-stamped. BD marketplaces are required to verify a trade licence and an
 * NID, so both are here, legible, before either button is in reach.
 */
function ReviewCard({ seller }: { seller: AdminSellerRow }) {
  return (
    <Card className="border-amber-300 bg-amber-50/40">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Thumb src={seller.logoUrl} alt="" className="size-12" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-ink">{seller.businessName}</h3>
              <SellerStatusChip status={seller.status} />
            </div>

            <p className="mt-0.5 text-sm text-ink-muted">
              {seller.user.name ?? 'Unnamed owner'} ·{' '}
              <span className="tabular-nums">{seller.user.phone}</span>
              {seller.user.email ? ` · ${seller.user.email}` : ''}
            </p>

            <p className="mt-0.5 text-xs text-ink-subtle">
              Applied {formatDate(seller.createdAt)} · /{seller.slug}
            </p>
          </div>
        </div>

        {seller.description ? (
          <p className="line-clamp-3 text-sm text-ink-muted">{seller.description}</p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <DocumentTile
            icon={FileText}
            label="Trade licence"
            number={seller.tradeLicenseNo}
            url={seller.tradeLicenseUrl}
          />
          <DocumentTile
            icon={IdCard}
            label="National ID (NID)"
            number={seller.nidNumber}
            url={seller.nidUrl}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-amber-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-ink-muted">Commission</span>
            <CommissionDial
              sellerId={seller.id}
              businessName={seller.businessName}
              rate={seller.commissionRate}
            />
            <span className="text-xs text-ink-subtle">Set it before you approve.</span>
          </div>

          <SellerStatusActions
            sellerId={seller.id}
            businessName={seller.businessName}
            status={seller.status}
            productCount={seller._count.products}
          />
        </div>
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function AdminSellersPage({ searchParams }: PageProps) {
  await requireAdmin()

  const params = await searchParams
  const status = toSellerStatus(params.status)
  const q = params.q?.trim() ?? ''

  const { sellers, counts } = await getAdminSellers()

  // The set is small (one row per business on the marketplace) and already in memory, so the search
  // is done here rather than as a second round trip. `contains` on SQLite would be case-insensitive
  // for ASCII anyway — `toLowerCase()` matches that behaviour, and also handles the Bengali shop
  // names that a LIKE would not fold.
  const term = q.toLowerCase()
  const matches = (seller: AdminSellerRow) =>
    term === '' ||
    seller.businessName.toLowerCase().includes(term) ||
    seller.slug.includes(term) ||
    seller.user.phone.includes(term) ||
    (seller.user.name?.toLowerCase().includes(term) ?? false)

  const visible = sellers.filter(matches)

  // PENDING surfaces FIRST, and in its own richer treatment — the queue is the job.
  const queue = visible.filter((seller) => seller.status === SellerStatus.PENDING)
  const rest = visible.filter((seller) => seller.status !== SellerStatus.PENDING)

  const showQueue = queue.length > 0 && (status === null || status === SellerStatus.PENDING)
  const showTable = status !== SellerStatus.PENDING
  const rows = status === null ? rest : rest.filter((seller) => seller.status === status)

  const filtered = q !== '' || status !== null

  return (
    <>
      <PageHeader
        title="Sellers"
        description={`${counts.all} shop${counts.all === 1 ? '' : 's'} · ${counts.APPROVED} approved · ${counts.PENDING} awaiting review · ${counts.SUSPENDED} suspended`}
      />

      {/* A plain GET form: filtering works with JavaScript off, and the result is a shareable URL —
          which is what makes the dashboard's "3 sellers waiting" card able to link straight here. */}
      <Card className="p-3">
        <form method="get" action="/admin/sellers" className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="q" className="sr-only">
            Search shops
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            icon={Search}
            placeholder="Search by shop, owner or phone…"
            containerClassName="flex-1"
            autoComplete="off"
          />

          <label htmlFor="status" className="sr-only">
            Filter by status
          </label>
          <Select id="status" name="status" defaultValue={status ?? ''} containerClassName="sm:w-56">
            <option value="">All statuses ({counts.all})</option>
            {SELLER_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {SELLER_STATUS_LABEL[value]} ({counts[value]})
              </option>
            ))}
          </Select>

          <div className="flex gap-2">
            <button
              type="submit"
              className={cn(
                buttonVariants({ variant: 'secondary' }),
                'flex-1 cursor-pointer sm:flex-none',
              )}
            >
              Apply
            </button>
            {filtered ? (
              <Link
                href="/admin/sellers"
                className={cn(buttonVariants({ variant: 'ghost' }), 'flex-1 sm:flex-none')}
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      {showQueue ? (
        <section aria-label="Awaiting review" className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-ink">Awaiting review</h2>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[0.6875rem] font-bold text-slate-950 tabular-nums">
              {queue.length}
            </span>
          </div>

          <div className="space-y-3">
            {queue.map((seller) => (
              <ReviewCard key={seller.id} seller={seller} />
            ))}
          </div>
        </section>
      ) : null}

      {showTable ? (
        <section aria-label="All shops" className={showQueue ? 'mt-8' : 'mt-6'}>
          {showQueue ? (
            <h2 className="mb-3 text-base font-semibold tracking-tight text-ink">
              {status ? SELLER_STATUS_LABEL[status] : 'Reviewed shops'}
            </h2>
          ) : null}

          <Card>
            {rows.length === 0 ? (
              <EmptyState
                icon={Users}
                title={filtered ? 'No shops match that' : 'No shops yet'}
                description={
                  filtered
                    ? 'Try a different search term, or clear the status filter.'
                    : 'Sellers appear here the moment they submit their shop for review.'
                }
                action={
                  filtered ? (
                    <Link href="/admin/sellers" className={buttonVariants({ variant: 'outline' })}>
                      Clear filters
                    </Link>
                  ) : null
                }
              />
            ) : (
              <>
                {/* Mobile: cards. */}
                <ul className="divide-y divide-line lg:hidden">
                  {rows.map((seller) => (
                    <li key={seller.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <Thumb src={seller.logoUrl} alt="" />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-sm font-semibold text-ink">
                              {seller.businessName}
                            </p>
                            <SellerStatusChip status={seller.status} />
                          </div>
                          <p className="mt-0.5 truncate text-xs text-ink-muted tabular-nums">
                            {seller.user.name ?? 'Unnamed owner'} · {seller.user.phone}
                          </p>
                        </div>
                      </div>

                      <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-surface-muted p-2.5 text-center">
                        <div>
                          <dt className="text-[0.6875rem] text-ink-muted">Listings</dt>
                          <dd className="text-sm font-semibold text-ink tabular-nums">
                            {seller._count.products}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[0.6875rem] text-ink-muted">Sold</dt>
                          <dd className="text-sm font-semibold text-ink tabular-nums">
                            {formatBDT(seller.grossSales)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[0.6875rem] text-ink-muted">Commission</dt>
                          <dd className="text-sm font-semibold text-brand-600 tabular-nums">
                            {formatBDT(seller.commissionEarned)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <CommissionDial
                          sellerId={seller.id}
                          businessName={seller.businessName}
                          rate={seller.commissionRate}
                        />
                        <SellerStatusActions
                          sellerId={seller.id}
                          businessName={seller.businessName}
                          status={seller.status}
                          productCount={seller._count.products}
                        />
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Desktop: table. */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs text-ink-muted">
                        <th className="px-5 py-2.5 font-medium">Shop</th>
                        <th className="px-5 py-2.5 font-medium">Owner</th>
                        <th className="px-5 py-2.5 text-right font-medium">Listings</th>
                        <th className="px-5 py-2.5 text-right font-medium">Sold (delivered)</th>
                        <th className="px-5 py-2.5 text-right font-medium">Commission earned</th>
                        <th className="px-5 py-2.5 font-medium">Rate</th>
                        <th className="px-5 py-2.5 font-medium">Status</th>
                        <th className="px-5 py-2.5 text-right font-medium">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {rows.map((seller) => (
                        <tr key={seller.id} className="hover:bg-surface-muted">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <Thumb src={seller.logoUrl} alt="" className="size-10" />
                              <div className="min-w-0 max-w-48">
                                <p className="truncate font-medium text-ink">
                                  {seller.businessName}
                                </p>
                                <p className="truncate text-xs text-ink-subtle">
                                  Joined {formatDate(seller.createdAt)}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3">
                            <p className="max-w-40 truncate text-ink">
                              {seller.user.name ?? 'Unnamed'}
                            </p>
                            <p className="text-xs text-ink-subtle tabular-nums">
                              {seller.user.phone}
                            </p>
                          </td>

                          <td className="px-5 py-3 text-right">
                            <Link
                              href={`/admin/products?sellerId=${seller.id}`}
                              className="inline-flex items-center gap-1 font-medium text-brand-600 tabular-nums hover:underline"
                            >
                              <Package className="size-3.5" aria-hidden="true" />
                              {seller._count.products}
                            </Link>
                          </td>

                          <td className="px-5 py-3 text-right text-ink tabular-nums">
                            {formatBDT(seller.grossSales)}
                          </td>

                          <td className="px-5 py-3 text-right font-semibold text-brand-600 tabular-nums">
                            {formatBDT(seller.commissionEarned)}
                            <p className="text-xs font-normal text-ink-subtle">
                              at {formatRate(seller.commissionRate)} today
                            </p>
                          </td>

                          <td className="px-5 py-3">
                            <CommissionDial
                              sellerId={seller.id}
                              businessName={seller.businessName}
                              rate={seller.commissionRate}
                            />
                          </td>

                          <td className="px-5 py-3">
                            <SellerStatusChip status={seller.status} />
                          </td>

                          <td className="px-5 py-3">
                            <div className="flex justify-end">
                              <SellerStatusActions
                                sellerId={seller.id}
                                businessName={seller.businessName}
                                status={seller.status}
                                productCount={seller._count.products}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </section>
      ) : null}

      {/* When the queue is filtered to PENDING and is empty, the page would otherwise be blank. */}
      {!showQueue && !showTable ? (
        <Card className="mt-6">
          <EmptyState
            icon={Store}
            title="Nothing waiting for review"
            description="Every shop that has applied has had an answer. New applications will appear here."
            action={
              <Link href="/admin/sellers" className={buttonVariants({ variant: 'outline' })}>
                See all shops
              </Link>
            }
          />
        </Card>
      ) : null}
    </>
  )
}
