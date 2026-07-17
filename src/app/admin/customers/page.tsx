import Link from 'next/link'
import { Search, UserRound } from 'lucide-react'

import { buttonVariants, Card, EmptyState, Input, Pagination } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { formatBDT, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

import { PageHeader } from '../_components/page-header'
import { getAdminCustomers } from '../_lib/customers'

export const metadata = { title: 'Customers' }

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>
}

function hrefFor(params: { q?: string; page?: number }): string {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.page && params.page > 1) search.set('page', String(params.page))
  const query = search.toString()
  return query ? `/admin/customers?${query}` : '/admin/customers'
}

/** First initial for the avatar chip — a real photo isn't in the model, and a broken img is worse. */
function initial(name: string | null, phone: string): string {
  return (name?.trim()?.[0] ?? phone.replace(/\D/g, '').slice(-2, -1) ?? '#').toUpperCase()
}

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  await requireAdmin()

  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const page = Number(params.page) || 1

  const { customers, total, totalPages, page: currentPage } = await getAdminCustomers({ q, page })
  const filtered = q !== ''

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${total} shopper${total === 1 ? '' : 's'} with the CUSTOMER role`}
      />

      <Card className="p-3">
        <form method="get" action="/admin/customers" className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="q" className="sr-only">
            Search customers
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            icon={Search}
            placeholder="Search by name, phone or email…"
            containerClassName="flex-1"
            autoComplete="off"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className={cn(buttonVariants({ variant: 'secondary' }), 'flex-1 sm:flex-none')}
            >
              Search
            </button>
            {filtered ? (
              <Link
                href="/admin/customers"
                className={cn(buttonVariants({ variant: 'ghost' }), 'flex-1 sm:flex-none')}
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="mt-4">
        {customers.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title={filtered ? 'No customers match that' : 'No customers yet'}
            description={
              filtered
                ? 'Try a different name, phone number or email.'
                : 'Every shopper who signs in with their phone number appears here.'
            }
            action={
              filtered ? (
                <Link href="/admin/customers" className={buttonVariants({ variant: 'outline' })}>
                  Clear search
                </Link>
              ) : null
            }
          />
        ) : (
          <>
            {/* Mobile: cards. */}
            <ul className="divide-y divide-line lg:hidden">
              {customers.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/customers/${c.id}`}
                    className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-muted"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-600">
                      {initial(c.name, c.phone)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{c.name ?? 'Unnamed shopper'}</p>
                      <p className="truncate text-xs text-ink-muted tabular-nums">{c.phone}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-ink tabular-nums">
                        {formatBDT(c.totalSpent)}
                      </p>
                      <p className="text-xs text-ink-subtle">
                        {c.orderCount} order{c.orderCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Desktop: table. */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-muted">
                    <th className="px-5 py-2.5 font-medium">Customer</th>
                    <th className="px-5 py-2.5 font-medium">Contact</th>
                    <th className="px-5 py-2.5 text-right font-medium">Orders</th>
                    <th className="px-5 py-2.5 text-right font-medium">Reviews</th>
                    <th className="px-5 py-2.5 text-right font-medium">Spent</th>
                    <th className="px-5 py-2.5 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-muted">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="flex items-center gap-3 font-medium text-brand-600 hover:underline"
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                            {initial(c.name, c.phone)}
                          </span>
                          <span className="max-w-48 truncate">{c.name ?? 'Unnamed shopper'}</span>
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-ink tabular-nums">{c.phone}</p>
                        {c.email ? (
                          <p className="max-w-48 truncate text-xs text-ink-subtle">{c.email}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-right text-ink tabular-nums">{c.orderCount}</td>
                      <td className="px-5 py-3 text-right text-ink-muted tabular-nums">
                        {c.reviewCount}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-ink tabular-nums">
                        {formatBDT(c.totalSpent)}
                      </td>
                      <td className="px-5 py-3 text-ink-subtle">{formatDate(c.createdAt)}</td>
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
            buildHref={(next) => hrefFor({ q, page: next })}
          />
          <p className="text-xs text-ink-subtle">
            {total} customer{total === 1 ? '' : 's'} · page {currentPage} of {totalPages}
          </p>
        </div>
      ) : null}
    </>
  )
}
