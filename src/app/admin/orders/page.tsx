import Link from 'next/link'
import { ChevronRight, ReceiptText, Search, Store } from 'lucide-react'

import { buttonVariants, Card, EmptyState, Input, Pagination, Select } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { formatBDT, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

import { OrderStatusChip, PaymentStatusChip } from '../_components/chips'
import { PageHeader } from '../_components/page-header'
import { getAdminOrders, type AdminOrderRow } from '../_lib/data'
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_VALUES,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VALUES,
  toOrderStatus,
  toPaymentStatus,
} from '../_lib/status'

export const metadata = { title: 'Orders' }

interface PageProps {
  searchParams: Promise<{ status?: string; payment?: string; q?: string; page?: string }>
}

interface HrefParams {
  status?: string
  payment?: string
  q?: string
  page?: number
}

function hrefFor(params: HrefParams): string {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.status) search.set('status', params.status)
  if (params.payment) search.set('payment', params.payment)
  if (params.page && params.page > 1) search.set('page', String(params.page))
  const query = search.toString()
  return query ? `/admin/orders?${query}` : '/admin/orders'
}

/** A single basket can be an obligation to three different businesses. That number is the story. */
function sellerCount(order: AdminOrderRow): number {
  return new Set(order.items.map((item) => item.sellerId)).size
}

function unitCount(order: AdminOrderRow): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  await requireAdmin()

  const params = await searchParams
  const status = toOrderStatus(params.status)
  const paymentStatus = toPaymentStatus(params.payment)
  const q = params.q?.trim() ?? ''
  const page = Number(params.page) || 1

  const { orders, total, totalPages, page: currentPage, filteredValue } = await getAdminOrders({
    status,
    paymentStatus,
    q,
    page,
  })

  const filtered = q !== '' || status !== null || paymentStatus !== null

  return (
    <>
      <PageHeader
        title="Orders"
        description={
          filtered
            ? `${total} order${total === 1 ? '' : 's'} match · ${formatBDT(filteredValue)} in value`
            : `${total} order${total === 1 ? '' : 's'} placed · ${formatBDT(filteredValue)} gross`
        }
      />

      <Card className="p-3">
        <form
          method="get"
          action="/admin/orders"
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_12rem_12rem_auto]"
        >
          <label htmlFor="q" className="sr-only">
            Search orders
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            icon={Search}
            placeholder="Order number, name or phone…"
            autoComplete="off"
          />

          <label htmlFor="status" className="sr-only">
            Filter by order status
          </label>
          <Select id="status" name="status" defaultValue={status ?? ''}>
            <option value="">Any status</option>
            {ORDER_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {ORDER_STATUS_LABEL[value]}
              </option>
            ))}
          </Select>

          <label htmlFor="payment" className="sr-only">
            Filter by payment status
          </label>
          <Select id="payment" name="payment" defaultValue={paymentStatus ?? ''}>
            <option value="">Any payment</option>
            {PAYMENT_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {PAYMENT_STATUS_LABEL[value]}
              </option>
            ))}
          </Select>

          <div className="flex gap-2">
            <button
              type="submit"
              className={cn(buttonVariants({ variant: 'secondary' }), 'flex-1 lg:flex-none')}
            >
              Apply
            </button>
            {filtered ? (
              <Link
                href="/admin/orders"
                className={cn(buttonVariants({ variant: 'ghost' }), 'flex-1 lg:flex-none')}
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="mt-4">
        {orders.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title={filtered ? 'No orders match that' : 'No orders yet'}
            description={
              filtered
                ? 'Try a different order number, or widen the status filters.'
                : 'Every checkout on the storefront lands here, with its commission split already frozen onto each line.'
            }
            action={
              filtered ? (
                <Link href="/admin/orders" className={buttonVariants({ variant: 'outline' })}>
                  Clear filters
                </Link>
              ) : null
            }
          />
        ) : (
          <>
            {/* Mobile: cards. */}
            <ul className="divide-y divide-line lg:hidden">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-mono text-sm font-semibold text-ink">
                          {order.orderNumber}
                        </p>
                        <span className="shrink-0 text-sm font-bold text-ink tabular-nums">
                          {formatBDT(order.total)}
                        </span>
                      </div>

                      <p className="mt-0.5 truncate text-xs text-ink-muted tabular-nums">
                        {order.shipFullName} · {order.shipPhone}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <OrderStatusChip status={order.status} />
                        <PaymentStatusChip status={order.paymentStatus} />
                      </div>

                      <p className="mt-1.5 text-xs text-ink-subtle">
                        {sellerCount(order)} seller{sellerCount(order) === 1 ? '' : 's'} ·{' '}
                        {unitCount(order)} item{unitCount(order) === 1 ? '' : 's'} ·{' '}
                        {formatDate(order.placedAt)}
                      </p>
                    </div>

                    <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>

            {/* Desktop: table. */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-muted">
                    <th className="px-5 py-2.5 font-medium">Order</th>
                    <th className="px-5 py-2.5 font-medium">Customer</th>
                    <th className="px-5 py-2.5 font-medium">Ship to</th>
                    <th className="px-5 py-2.5 text-right font-medium">Sellers</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 font-medium">Payment</th>
                    <th className="px-5 py-2.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-surface-muted">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-subtle">
                          {formatDate(order.placedAt)}
                        </p>
                      </td>

                      <td className="px-5 py-3">
                        <p className="max-w-40 truncate font-medium text-ink">
                          {order.user.name ?? order.shipFullName}
                        </p>
                        <p className="text-xs text-ink-subtle tabular-nums">{order.shipPhone}</p>
                      </td>

                      <td className="px-5 py-3">
                        <p className="max-w-40 truncate text-ink-muted">
                          {order.shipArea}, {order.shipDistrict}
                        </p>
                        <p className="text-xs text-ink-subtle">
                          {formatBDT(order.deliveryFee)} delivery
                        </p>
                      </td>

                      <td className="px-5 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-ink-muted tabular-nums">
                          <Store className="size-3.5" aria-hidden="true" />
                          {sellerCount(order)}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        <OrderStatusChip status={order.status} />
                      </td>

                      <td className="px-5 py-3">
                        <PaymentStatusChip status={order.paymentStatus} />
                        <p className="mt-1 text-xs text-ink-subtle">
                          {PAYMENT_METHOD_LABEL[order.paymentMethod]}
                        </p>
                      </td>

                      <td className="px-5 py-3 text-right font-semibold text-ink tabular-nums">
                        {formatBDT(order.total)}
                        {order.discount > 0 ? (
                          <p className="text-xs font-normal text-success">
                            −{formatBDT(order.discount)}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {totalPages > 1 ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            buildHref={(next) =>
              hrefFor({
                status: status ?? undefined,
                payment: paymentStatus ?? undefined,
                q,
                page: next,
              })
            }
          />
          <p className="text-xs text-ink-subtle">
            {total} order{total === 1 ? '' : 's'} · page {currentPage} of {totalPages}
          </p>
        </div>
      ) : null}
    </>
  )
}
