import type { Metadata } from 'next'

import { Reveal } from '@/components/motion/reveal'
import { AppDownloadBanner } from '@/components/home/app-download-banner'
import { BrandStrip } from '@/components/home/brand-strip'
import { CategoryRail } from '@/components/home/category-rail'
import { DealCategoryGrid } from '@/components/home/deal-category-grid'
import { FeaturedProducts } from '@/components/home/featured-products'
import { HeroCarousel } from '@/components/home/hero-carousel'
import { SecondaryBanners } from '@/components/home/secondary-banners'
import { ShopUnderGrid } from '@/components/home/shop-under-grid'
import { UspBar } from '@/components/home/usp-bar'
import {
  getCollections,
  getDealCategories,
  getFeaturedBrands,
  getFeaturedCategories,
  getFeaturedProducts,
  getHeroBanners,
  getSecondaryBanners,
} from '@/lib/queries'

export const metadata: Metadata = {
  // `absolute` — the root layout's "%s | Gulu Mulu" template would otherwise say it twice.
  title: { absolute: 'Gulu Mulu — Online Shopping in Bangladesh' },
  description:
    'Shop fashion, beauty, home and more from hundreds of verified Bangladeshi sellers. Cash on delivery in all 64 districts, 48-hour delivery inside Dhaka, and easy returns.',
}

/**
 * The storefront homepage.
 *
 * Every section is a Server Component fed by `@/lib/queries`; the only JavaScript that reaches the
 * browser is the hero carousel, the dismissible app strip and the wishlist hearts. The seven reads
 * are independent, so they go out together — sequential `await`s here would stack seven round trips
 * into the critical path of the most-visited page in the app.
 */
export default async function HomePage() {
  const [heroBanners, secondaryBanners, categories, brands, collections, deals, featured] =
    await Promise.all([
      getHeroBanners(),
      getSecondaryBanners(),
      getFeaturedCategories(),
      getFeaturedBrands(),
      getCollections(),
      getDealCategories(),
      getFeaturedProducts(10),
    ])

  return (
    <div className="pb-10">
      <h1 className="sr-only">
        Gulu Mulu — online shopping in Bangladesh from verified local sellers
      </h1>

      {/* Full-bleed: the hero and the app strip run edge to edge; everything below is contained. */}
      <HeroCarousel banners={heroBanners} />
      <AppDownloadBanner />

      {/* Each section rises and fades in as it enters the viewport — reads as content arriving
          from depth. Reveal collapses to instant for prefers-reduced-motion (global MotionConfig). */}
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col gap-10 py-8 sm:gap-12 sm:py-10">
          <Reveal>
            <CategoryRail categories={categories} />
          </Reveal>
          <Reveal>
            <SecondaryBanners banners={secondaryBanners} />
          </Reveal>
          <Reveal>
            <UspBar />
          </Reveal>
          <Reveal>
            <BrandStrip brands={brands} />
          </Reveal>
          <Reveal>
            <ShopUnderGrid collections={collections} />
          </Reveal>
          <Reveal>
            <DealCategoryGrid deals={deals} />
          </Reveal>
          <Reveal>
            <FeaturedProducts products={featured} />
          </Reveal>
        </div>
      </div>
    </div>
  )
}
