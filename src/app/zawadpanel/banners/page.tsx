import { requireAdmin } from '@/lib/auth'

import { PageHeader } from '../_components/page-header'
import { getAdminBanners } from '../_lib/data'
import { BannerManager } from './banner-manager'

export const metadata = { title: 'Banners' }

export default async function AdminBannersPage() {
  await requireAdmin()

  const banners = await getAdminBanners()

  return (
    <>
      <PageHeader
        title="Banners"
        description="The homepage’s loudest surface. Hide a campaign when it ends — deleting it throws the artwork away."
      />

      <BannerManager banners={banners} />
    </>
  )
}
