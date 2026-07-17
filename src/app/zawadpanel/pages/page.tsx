import Link from 'next/link'
import { Plus } from 'lucide-react'

import { buttonVariants } from '@/components/ui'
import { requireAdmin } from '@/lib/auth'

import { PageHeader } from '../_components/page-header'
import { getAdminPages } from '../_lib/data'
import { PageList } from './page-list'

export const metadata = { title: 'CMS pages' }

export default async function AdminPagesPage() {
  await requireAdmin()

  const pages = await getAdminPages()
  const published = pages.filter((page) => page.isPublished).length

  return (
    <>
      <PageHeader
        title="CMS pages"
        description={
          pages.length === 0
            ? 'The policy pages the footer links to. Markdown, editable without a deploy.'
            : `${pages.length} page${pages.length === 1 ? '' : 's'} · ${published} published. Markdown, editable without a deploy.`
        }
        action={
          <Link href="/zawadpanel/pages/new" className={buttonVariants({ variant: 'primary' })}>
            <Plus aria-hidden="true" />
            New page
          </Link>
        }
      />

      <PageList pages={pages} />
    </>
  )
}
