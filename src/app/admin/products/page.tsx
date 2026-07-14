import Link from 'next/link'
import { ExternalLink, Package, Search, Store, X } from 'lucide-react'

import { buttonVariants, Card, EmptyState, Input, Pagination, Price, Select } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ProductStatus } from '@/generated/prisma/client'

import { ProductStatusChip, SellerStatusChip, StockChip } from '../_components/chips'
import { PageHeader } from '../_components/page-header'
import { Thumb } from '../_components/thumb'
import { getAdminProducts, getSellerName } from '../_lib/data'
import { PRODUCT_STATUS_LABEL, PRODUCT_STATUS_VALUES, toProductStatus } from '../_lib/status'
import { ProductModeration } from './product-moderation'

export const metadata = { title: 'Products' }

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string; sellerId?: string; page?: string }>
}

interface HrefParams {
  status?: string
  q?: string
  sellerId?: string
  page?: number
}

function hrefFor(params: HrefParams): string {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.status) search.set('status', params.status)
  if (params.sellerId) search.set('sellerId', params.sellerId)
  if (params.page && params.page > 1) search.set('page', String(params.page))
  const query = search.toString()
  return query ? `/admin/products?${query}` : '/admin/products'
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  await requireAdmin()

  const params = await searchParams
  const status = toProductStatus(params.status)
  const q = params.q?.trim() ?? ''
  const sellerId = params.sellerId?.trim() || null
  const page = Number(params.page) || 1

  const [{ products, total, totalPages, page: currentPage, counts }, shopName] = await Promise.all([
    getAdminProducts({ status, q, sellerId, page }),
    sellerId ? getSellerName(sellerId) : Promise.resolve(null),
  ])

  const filtered = q !== '' || status !== null || sellerId !== null

  return (
    <>
      <PageHeader
        title="Products"
        description={`${counts.all} listing${counts.all === 1 ? '' : 's'} across every shop · ${counts.APPROVED} live · ${counts.PENDING} awaiting review`}
      />

      <Card className="p-3">
        <form method="get" action="/admin/products" className="flex flex-col gap-2 sm:flex-row">
          {/* The shop filter rides along in a hidden field, so searching inside one shop does not
              silently drop you back into the whole catalogue. */}
          {sellerId ? <input type="hidden" name="sellerId" value={sellerId} /> : null}

          <label htmlFor="q" className="sr-only">
            Search listings
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            icon={Search}
            placeholder="Search by title, SKU or shop…"
            containerClassName="flex-1"
            autoComplete="off"
          />

          <label htmlFor="status" className="sr-only">
            Filter by status
          </label>
          <Select id="status" name="status" defaultValue={status ?? ''} containerClassName="sm:w-56">
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
                href="/admin/products"
                className={cn(buttonVariants({ variant: 'ghost' }), 'flex-1 sm:flex-none')}
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>

        {sellerId ? (
          <div className="mt-2 flex items-center gap-2 border-t border-line pt-2">
            <Store className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
            <span className="min-w-0 truncate text-sm text-ink-muted">
              Showing only <span className="font-medium text-ink">{shopName ?? 'one shop'}</span>
            </span>
            <Link
              href={hrefFor({ status: status ?? undefined, q })}
              className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              <X className="size-3.5" aria-hidden="true" />
              Every shop
            </Link>
          </div>
        ) : null}
      </Card>

      <Card className="mt-4">
        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={filtered ? 'No listings match that' : 'No listings yet'}
            description={
              filtered
                ? 'Try a different search term, or clear the filters.'
                : 'Every product a seller submits lands here for review before it can reach the storefront.'
            }
            action={
              filtered ? (
                <Link href="/admin/products" className={buttonVariants({ variant: 'outline' })}>
                  Clear filters
                </Link>
              ) : null
            }
          />
        ) : (
          <>
            {/* Mobile: cards. */}
            <ul className="divide-y divide-line lg:hidden">
              {products.map((product) => (
                <li key={product.id} className="p-4">
                  <div className="flex gap-3">
                    <Thumb
                      src={product.images[0]?.url}
                      alt={product.images[0]?.alt ?? product.title}
                      className="size-16"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-ink">{product.title}</p>

                      <Link
                        href={hrefFor({ sellerId: product.seller.id })}
                        className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-xs font-medium text-brand-600 hover:underline"
                      >
                        <Store className="size-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{product.seller.businessName}</span>
                      </Link>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <ProductStatusChip status={product.status} />
                        <StockChip stock={product.stock} />
                      </div>

                      <div className="mt-2">
                        <Price product={product} size="sm" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-ink-subtle">
                      {product.category.name} · {formatDate(product.createdAt)}
                    </span>
                    <ProductModeration
                      productId={product.id}
                      title={product.title}
                      status={product.status}
                      sellerName={product.seller.businessName}
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
                    <th className="px-5 py-2.5 font-medium">Listing</th>
                    <th className="px-5 py-2.5 font-medium">Seller</th>
                    <th className="px-5 py-2.5 font-medium">Price</th>
                    <th className="px-5 py-2.5 font-medium">Stock</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 text-right font-medium">
                      <span className="sr-only">Moderation</span>
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
                          <div className="min-w-0 max-w-64">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate font-medium text-ink">{product.title}</p>
                              {product.status === ProductStatus.APPROVED ? (
                                <Link
                                  href={`/product/${product.slug}`}
                                  target="_blank"
                                  aria-label={`Open ${product.title} on the storefront`}
                                  className="shrink-0 text-ink-subtle transition-colors hover:text-brand-600"
                                >
                                  <ExternalLink className="size-3.5" aria-hidden="true" />
                                </Link>
                              ) : null}
                            </div>
                            <p className="truncate text-xs text-ink-subtle">
                              {product.category.name}
                              {product.brand ? ` · ${product.brand.name}` : ''}
                              {product.sku ? ` · ${product.sku}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <Link
                          href={hrefFor({ sellerId: product.seller.id })}
                          className="block max-w-40 truncate font-medium text-brand-600 hover:underline"
                        >
                          {product.seller.businessName}
                        </Link>
                        <div className="mt-1">
                          {/* A live listing under a suspended shop is invisible to shoppers
                              regardless of its own status. Say so, or the queue lies. */}
                          <SellerStatusChip status={product.seller.status} />
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <Price product={product} size="sm" />
                      </td>

                      <td className="px-5 py-3">
                        <StockChip stock={product.stock} />
                      </td>

                      <td className="px-5 py-3">
                        <ProductStatusChip status={product.status} />
                        <p className="mt-1 text-xs text-ink-subtle">
                          {formatDate(product.createdAt)}
                        </p>
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <ProductModeration
                            productId={product.id}
                            title={product.title}
                            status={product.status}
                            sellerName={product.seller.businessName}
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

      {totalPages > 1 ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            buildHref={(next) =>
              hrefFor({
                status: status ?? undefined,
                q,
                sellerId: sellerId ?? undefined,
                page: next,
              })
            }
          />
          <p className="text-xs text-ink-subtle">
            {total} listing{total === 1 ? '' : 's'} · page {currentPage} of {totalPages}
          </p>
        </div>
      ) : null}
    </>
  )
}
