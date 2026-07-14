import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { requireSeller } from '@/lib/auth'

import { PageHeader } from '../../../_components/page-header'
import { getProductFormOptions } from '../../../_lib/data'
import { ProductForm } from '../product-form'

export const metadata = { title: 'New product' }

export default async function NewProductPage() {
  // Gate first: the form options are a public-ish read, but a non-seller has no business here.
  await requireSeller()

  const { categories, brands } = await getProductFormOptions()

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
        title="Add a product"
        description="Everything a shopper needs to decide. You can edit any of it later."
      />

      <ProductForm categories={categories} brands={brands} />
    </>
  )
}
