import { requireAdmin } from '@/lib/auth'

import { PageHeader } from '../_components/page-header'
import { getAdminCollections, getPickerOptions } from '../_lib/data'
import { CollectionManager } from './collection-manager'

export const metadata = { title: 'Collections' }

export default async function AdminCollectionsPage() {
  await requireAdmin()

  const [collections, { categories, brands }] = await Promise.all([
    getAdminCollections(),
    getPickerOptions(),
  ])

  return (
    <>
      <PageHeader
        title="Shop-under collections"
        description="The highest-intent cards on the homepage. A shopper who taps one is not browsing a category — they are browsing a budget."
      />

      <CollectionManager collections={collections} categories={categories} brands={brands} />
    </>
  )
}
