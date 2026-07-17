import { requireAdmin } from '@/lib/auth'

import { PageEditor } from '../page-editor'

export const metadata = { title: 'New page' }

export default async function NewCmsPage() {
  await requireAdmin()

  return <PageEditor />
}
