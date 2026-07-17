import { notFound } from 'next/navigation'

import { requireAdmin } from '@/lib/auth'

import { getAdminPage } from '../../_lib/data'
import { PageEditor } from '../page-editor'

interface PageProps {
  // Next 16: params is a Promise.
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const page = await getAdminPage(id)
  return { title: page ? page.title : 'Page' }
}

export default async function EditCmsPage({ params }: PageProps) {
  await requireAdmin()

  const { id } = await params
  const page = await getAdminPage(id)
  if (!page) notFound()

  return <PageEditor page={page} />
}
