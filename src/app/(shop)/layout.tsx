import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'
import { getCartCount, getCategoryTree } from '@/components/layout/shell-data'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { getCurrentUser } from '@/lib/auth'

/**
 * The storefront shell. Everything the shopper sees — home, category, product,
 * cart, checkout — renders inside this header/footer sandwich.
 *
 * The three reads run in parallel: the category tree and the cart count don't
 * depend on each other, and `getCurrentUser()` is React-cached, so the `await`
 * inside `getCartCount()` reuses the same query.
 */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [categories, cartCount, user] = await Promise.all([
    getCategoryTree(),
    getCartCount(),
    getCurrentUser(),
  ])

  return (
    // pb-16 keeps the footer clear of the fixed mobile tab bar; on md+ there is no bar.
    <div className="flex min-h-dvh flex-col pb-16 md:pb-0">
      <SiteHeader categories={categories} cartCount={cartCount} user={user} />

      <main className="flex-1">{children}</main>

      <SiteFooter />

      <MobileBottomNav />
    </div>
  )
}
