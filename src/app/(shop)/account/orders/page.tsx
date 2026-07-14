import type { Metadata } from 'next'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'

import { Button, EmptyState } from '@/components/ui'
import { requireUser } from '@/lib/auth'

import { getUserOrders } from '../_queries'
import { OrderCard } from '../order-card'

export const metadata: Metadata = {
  title: 'My orders',
}

export default async function AccountOrdersPage() {
  const user = await requireUser()
  const orders = await getUserOrders(user.id)

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">My orders</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {orders.length > 0
            ? `${orders.length} order${orders.length === 1 ? '' : 's'}, newest first.`
            : 'Every order you place will be listed here.'}
        </p>
      </header>

      {orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <div className="rounded-card border border-line bg-surface">
          <EmptyState
            icon={ShoppingBag}
            title="You haven’t ordered anything yet"
            description="Browse the marketplace, add something you like to your cart, and pay cash on delivery — no card needed."
            action={
              <Link href="/">
                <Button size="lg">Start shopping</Button>
              </Link>
            }
          />
        </div>
      )}
    </div>
  )
}
