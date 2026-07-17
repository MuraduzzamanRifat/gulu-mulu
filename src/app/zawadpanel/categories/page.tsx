import { requireAdmin } from '@/lib/auth'

import { PageHeader } from '../_components/page-header'
import { getAdminCategories } from '../_lib/data'
import { CategoryManager } from './category-manager'

export const metadata = { title: 'Categories' }

export default async function AdminCategoriesPage() {
  await requireAdmin()

  const categories = await getAdminCategories()

  return (
    <>
      <PageHeader
        title="Categories"
        description="The spine of the storefront: the header menu, the homepage quick-nav strip and every search facet are built from this tree."
      />

      <CategoryManager categories={categories} />
    </>
  )
}
