import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { requireSeller } from '@/lib/auth'

import { ProductStatusChip } from '../../../../_components/chips'
import { PageHeader } from '../../../../_components/page-header'
import { getProductFormOptions, getSellerProduct } from '../../../../_lib/data'
import { ProductForm } from '../../product-form'

export const metadata = { title: 'Edit product' }

interface PageProps {
  // Next 16: params is a Promise.
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: PageProps) {
  const { seller } = await requireSeller()
  const { id } = await params

  // Scoped by sellerId: another shop's product id is indistinguishable from a product that does
  // not exist. That is the read half of the IDOR guard — the write half re-checks in _actions.ts.
  const [product, options] = await Promise.all([
    getSellerProduct(seller.id, id),
    getProductFormOptions(),
  ])

  if (!product) notFound()

  return (
    <>
      <Link
        href="/seller/products"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to products
      </Link>

      <PageHeader
        title="Edit product"
        description={product.title}
        action={<ProductStatusChip status={product.status} />}
      />

      <ProductForm categories={options.categories} brands={options.brands} product={product} />
    </>
  )
}
