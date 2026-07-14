import { requireAdmin } from '@/lib/auth'

import { PageHeader } from '../_components/page-header'
import { getAdminBrands } from '../_lib/data'
import { BrandManager } from './brand-manager'

export const metadata = { title: 'Brands' }

export default async function AdminBrandsPage() {
  await requireAdmin()

  const brands = await getAdminBrands()

  return (
    <>
      <PageHeader
        title="Brands"
        description="Sellers file their products under these — they cannot invent their own, which is what keeps the brand facet on search worth using."
      />

      <BrandManager brands={brands} />
    </>
  )
}
