import Link from 'next/link'
import { Package, Plus, Search } from 'lucide-react'

import {
  buttonVariants,
  Card,
  EmptyState,
  Input,
  Pagination,
  Price,
  Select,
} from '@/components/ui'
import { requireSeller } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

import { ProductStatusChip, StockChip } from '../../_components/chips'
import { PageHeader } from '../../_components/page-header'
import { Thumb } from '../../_components/thumb'
import { getSellerProducts } from '../../_lib/data'
import {
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUS_VALUES,
  toProductStatus,
} from '../../_lib/status'
import { ProductRowActions } from './product-row-actions'

export const metadata = { title: 'Products' }

interface PageProps {
  // Next 16: searchParams is a Promise.
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}

/** Keeps the current filters in the URL when paginating — the URL is the state. */
function hrefFor(params: { q?: string; status?: string; page?: number }): string {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.status) search.set('status', params.status)
  if (params.page && params.page > 1) search.set('page', String(params.page))
  const query = search.toString()
  return query ? `/seller/products?${query}` : '/seller/products'
}

export default async function SellerProductsPage({ searchParams }: PageProps) {
  const { seller } = await requireSeller()
  const params = await searchParams

  const q = params.q?.trim() ?? ''
  const status = toProductStatus(params.status)
  const page = Number(params.page) || 1

  const { products, total, totalPages, page: currentPage, counts } = await getSellerProducts(
    seller.id,
    { search: q, status, page },
  )

  const filtered = q !== '' || status !== null

  return (
    <>
      <PageHeader
        title="Products"
        description={`${counts.all} listing${counts.all === 1 ? '' : 's'} in your shop · ${counts.APPROVED} live · ${counts.PENDING} awaiting review`}
        action={
          <Link href="/seller/products/new" className={buttonVariants({ variant: 'primary' })}>
            <Plus aria-hidden="true" />
            Add product
          </Link>
        }
      />

      {/* A plain GET form: search and filter work with JavaScript switched off, and the result is
          a shareable, bookmarkable URL. */}
      <Card className="p-3">
        <form method="get" action="/seller/products" className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="q" className="sr-only">
            Search your products
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            icon={Search}
            placeholder="Search by title or SKU…"
            containerClassName="flex-1"
            autoComplete="off"
          />

          <label htmlFor="status" className="sr-only">
            Filter by status
          </label>
          <Select
            id="status"
            name="status"
            defaultValue={status ?? ''}
            containerClassName="sm:w-52"
          >
            <option value="">All statuses ({counts.all})</option>
            {PRODUCT_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {PRODUCT_STATUS_LABEL[value]} ({counts[value]})
              </option>
            ))}
          </Select>

          <div className="flex gap-2">
            <button
              type="submit"
              className={cn(buttonVariants({ variant: 'secondary' }), 'flex-1 sm:flex-none')}
            >
              Apply
            </button>
            {filtered ? (
              <Link
                href="/seller/products"
                className={cn(buttonVariants({ variant: 'ghost' }), 'flex-1 sm:flex-none')}
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="mt-4">
        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={filtered ? 'No products match that' : 'No products yet'}
            description={
              filtered
                ? 'Try a different search term, or clear the status filter.'
                : 'Add your first listing. It goes to the review queue and is live on the storefront as soon as an admin approves it.'
            }
            action={
              filtered ? (
                <Link href="/seller/products" className={buttonVariants({ variant: 'outline' })}>
                  Clear filters
                </Link>
              ) : (
                <Link
                  href="/seller/products/new"
                  className={buttonVariants({ variant: 'primary' })}
                >
                  <Plus aria-hidden="true" />
                  Add product
                </Link>
              )
            }
          />
        ) : (
          <>
            {/* Mobile: cards. */}
            <ul className="divide-y divide-line md:hidden">
              {products.map((product) => (
                <li key={product.id} className="flex gap-3 p-4">
                  <Thumb
                    src={product.images[0]?.url}
                    alt={product.images[0]?.alt ?? product.title}
                    className="size-16"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium text-ink">{product.title}</p>
                      <ProductRowActions productId={product.id} title={product.title} />
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <ProductStatusChip status={product.status} />
                      <StockChip stock={product.stock} />
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Price product={product} size="sm" />
                      <span className="shrink-0 text-xs text-ink-subtle tabular-nums">
                        {product.soldCount} sold
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: table. */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-muted">
                    <th className="px-5 py-2.5 font-medium">Product</th>
                    <th className="px-5 py-2.5 font-medium">Price</th>
                    <th className="px-5 py-2.5 font-medium">Stock</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 text-right font-medium">Sold</th>
                    <th className="px-5 py-2.5 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-surface-muted">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Thumb
                            src={product.images[0]?.url}
                            alt={product.images[0]?.alt ?? product.title}
                          />
                          <div className="min-w-0 max-w-72">
                            <p className="truncate font-medium text-ink">{product.title}</p>
                            <p className="truncate text-xs text-ink-subtle">
                              {product.category.name}
                              {product.sku ? ` · ${product.sku}` : ''}
                              {product._count.variants > 0
                                ? ` · ${product._count.variants} variant${product._count.variants === 1 ? '' : 's'}`
                                : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Price product={product} size="sm" />
                      </td>
                      <td className="px-5 py-3">
                        <StockChip stock={product.stock} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <ProductStatusChip status={product.status} />
                          <span className="text-xs text-ink-subtle">
                            {formatDate(product.updatedAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-ink tabular-nums">
                        {product.soldCount}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <ProductRowActions productId={product.id} title={product.title} />
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

      {totalPages > 1 ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            buildHref={(next) => hrefFor({ q, status: status ?? undefined, page: next })}
          />
          <p className="text-xs text-ink-subtle">
            {total} product{total === 1 ? '' : 's'} · page {currentPage} of {totalPages}
          </p>
        </div>
      ) : null}
    </>
  )
}
