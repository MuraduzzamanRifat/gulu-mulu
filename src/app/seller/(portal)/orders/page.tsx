import Link from 'next/link'
import { MapPin, Phone, ReceiptText } from 'lucide-react'

import { buttonVariants, Card, EmptyState, Pagination } from '@/components/ui'
import { requireSeller } from '@/lib/auth'
import { formatBDT, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

import { OrderStatusChip } from '../../_components/chips'
import { PageHeader } from '../../_components/page-header'
import { Thumb } from '../../_components/thumb'
import { getSellerOrders, type SellerOrderGroup } from '../../_lib/data'
import { ORDER_STATUS_LABEL, ORDER_STATUS_VALUES, toOrderStatus } from '../../_lib/status'
import { AdvanceButton } from './advance-button'

export const metadata = { title: 'Orders' }

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>
}

function hrefFor(status: string | null, page?: number): string {
  const search = new URLSearchParams()
  if (status) search.set('status', status)
  if (page && page > 1) search.set('page', String(page))
  const query = search.toString()
  return query ? `/seller/orders?${query}` : '/seller/orders'
}

function OrderCard({ group }: { group: SellerOrderGroup }) {
  return (
    <Card>
      {/* Order head — the customer, and what THIS seller is owed for their slice of the basket. */}
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="text-sm font-bold text-ink">{group.orderNumber}</h2>
            <span className="text-xs text-ink-subtle">{formatDate(group.placedAt)}</span>
            <span className="text-xs text-ink-subtle">·</span>
            <span className="text-xs font-medium text-ink-muted">
              {group.paymentMethod} · {group.paymentStatus.toLowerCase()}
            </span>
          </div>

          <p className="mt-2 text-sm font-medium text-ink">{group.customerName}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
            <Phone className="size-3.5 shrink-0" aria-hidden="true" />
            <a href={`tel:${group.customerPhone}`} className="hover:text-brand-600">
              {group.customerPhone}
            </a>
          </p>
          <p className="mt-0.5 flex items-start gap-1.5 text-xs text-ink-muted">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2">{group.shipTo}</span>
          </p>
        </div>

        {/* The take-rate, in the open. A seller should never have to work out what they were paid. */}
        <dl className="shrink-0 rounded-card bg-surface-muted p-3 text-xs sm:min-w-52">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-muted">Your goods</dt>
            <dd className="font-medium text-ink tabular-nums">{formatBDT(group.gross)}</dd>
          </div>
          <div className="mt-1 flex items-center justify-between gap-4">
            <dt className="text-ink-muted">Commission</dt>
            <dd className="font-medium text-danger tabular-nums">
              −{formatBDT(group.commission)}
            </dd>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-4 border-t border-line pt-1.5">
            <dt className="font-semibold text-ink">You earn</dt>
            <dd className="text-sm font-bold text-ink tabular-nums">{formatBDT(group.earning)}</dd>
          </div>
        </dl>
      </div>

      {/* Only THIS seller's lines. Another shop's items in the same basket are never loaded. */}
      <ul className="divide-y divide-line">
        {group.items.map((item) => (
          <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
            <Thumb src={item.imageSnapshot} alt={item.titleSnapshot} className="size-14" />

            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium text-ink">{item.titleSnapshot}</p>
              <p className="mt-0.5 text-xs text-ink-subtle">
                {item.variantLabel ? `${item.variantLabel} · ` : ''}
                {formatBDT(item.unitPrice)} × {item.quantity} = {formatBDT(item.lineTotal)}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                <span className="tabular-nums">{Math.round(item.commissionRate * 100)}%</span>{' '}
                commission (−
                <span className="tabular-nums">{formatBDT(item.commissionAmount)}</span>) ·{' '}
                <span className="font-semibold text-ink tabular-nums">
                  {formatBDT(item.sellerEarning)}
                </span>{' '}
                to you
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
              <OrderStatusChip status={item.status} />
              <AdvanceButton orderItemId={item.id} status={item.status} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default async function SellerOrdersPage({ searchParams }: PageProps) {
  const { seller } = await requireSeller()
  const params = await searchParams

  const status = toOrderStatus(params.status)
  const page = Number(params.page) || 1

  const { groups, total, totalPages, page: currentPage } = await getSellerOrders(seller.id, {
    status,
    page,
  })

  return (
    <>
      <PageHeader
        title="Orders"
        description="Only your lines. A basket can hold several shops — you see, and fulfil, exactly your own."
      />

      {/* Status filter — links, not a form, so each filter is its own shareable URL. */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none lg:-mx-8 lg:px-8">
        <Link
          href={hrefFor(null)}
          className={cn(
            'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            status === null
              ? 'border-ink bg-ink text-white'
              : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
          )}
        >
          All
        </Link>

        {ORDER_STATUS_VALUES.map((value) => (
          <Link
            key={value}
            href={hrefFor(value)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              status === value
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
            )}
          >
            {ORDER_STATUS_LABEL[value]}
          </Link>
        ))}
      </div>

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={ReceiptText}
            title={status ? `No ${ORDER_STATUS_LABEL[status].toLowerCase()} lines` : 'No orders yet'}
            description={
              status
                ? 'Nothing in your shop is at this stage right now.'
                : 'Your orders will appear here the moment a shopper buys one of your products — with the commission and your net earning already worked out.'
            }
            action={
              status ? (
                <Link href="/seller/orders" className={buttonVariants({ variant: 'outline' })}>
                  Show all orders
                </Link>
              ) : (
                <Link
                  href="/seller/products/new"
                  className={buttonVariants({ variant: 'primary' })}
                >
                  Add a product
                </Link>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <OrderCard key={group.orderId} group={group} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            buildHref={(next) => hrefFor(status, next)}
          />
          <p className="text-xs text-ink-subtle">
            {total} order{total === 1 ? '' : 's'} · page {currentPage} of {totalPages}
          </p>
        </div>
      ) : null}
    </>
  )
}
