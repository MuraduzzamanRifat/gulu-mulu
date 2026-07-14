import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, Lock, PenLine } from 'lucide-react'

import { BuyBox } from '@/components/pdp/buy-box'
import { DeliveryInfo } from '@/components/pdp/delivery-info'
import { ProductGallery } from '@/components/pdp/product-gallery'
import { ProductJsonLd } from '@/components/pdp/product-json-ld'
import { ProductTabs } from '@/components/pdp/product-tabs'
import { ReviewForm } from '@/components/pdp/review-form'
import { ReviewList } from '@/components/pdp/review-list'
import { SellerCard } from '@/components/pdp/seller-card'
import { Specifications } from '@/components/pdp/specifications'
import { ProductRail, SectionHeading } from '@/components/product'
import { Stars } from '@/components/ui'
import { getCurrentUser } from '@/lib/auth'
import { discountPercent, effectivePrice, formatBDT, primaryImage } from '@/lib/format'
import { getProductBySlug, getRelatedProducts } from '@/lib/queries'
import { cn } from '@/lib/utils'

import { addProductToCart, submitReview } from './_actions'
import { getRatingBreakdown, getReviewEligibility, getWishlistedIds } from './_data'

/**
 * /product/[slug] — the highest-intent page on the marketplace.
 *
 * `getProductBySlug()` carries the storefront gate (APPROVED product, APPROVED seller), so a
 * rejected listing or a suspended shop 404s here even if the URL is known. That is why the miss is
 * `notFound()` and not "product unavailable": as far as the storefront is concerned, it does not
 * exist.
 *
 * Composition: one Server Component page, three client islands (gallery, buy box, tab strip). The
 * reviews, spec table and description are rendered on the server and handed to the tab strip as
 * children, so the biggest block on the page costs no JavaScript at all.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/** A meta description wants ~155 chars, cut on a word — not mid-syllable. */
function summarize(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean

  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug) // React-cached: the page body reuses this query

  if (!product) {
    return { title: 'Product not found', robots: { index: false, follow: false } }
  }

  const description = summarize(product.description)
  const image = primaryImage(product.images)
  const url = `/product/${product.slug}`
  const price = formatBDT(effectivePrice(product))

  return {
    title: product.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title: `${product.title} — ${price}`,
      description,
      url,
      siteName: 'Gulu Mulu',
      locale: 'en_BD',
      images: [{ url: image, width: 800, height: 1000, alt: product.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.title} — ${price}`,
      description,
      images: [image],
    },
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const user = await getCurrentUser()

  const [breakdown, eligibility, related] = await Promise.all([
    getRatingBreakdown(product.id),
    getReviewEligibility(product.id, user?.id ?? null),
    getRelatedProducts(product),
  ])

  // One wishlist query covers the hero heart AND every heart in the related rail.
  const wishlistedIds = await getWishlistedIds(
    [product.id, ...related.map((item) => item.id)],
    user?.id ?? null,
  )

  const paid = effectivePrice(product)
  const percentOff = discountPercent(product)
  const inStock = product.stock > 0

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
      <ProductJsonLd
        name={product.title}
        description={product.description}
        url={`${SITE_URL}/product/${product.slug}`}
        images={product.images.map((image) => image.url)}
        sku={product.sku}
        brandName={product.brand?.name ?? null}
        sellerName={product.seller.businessName}
        categoryName={product.category.name}
        price={paid}
        inStock={inStock}
        rating={breakdown.average}
        reviewCount={breakdown.total}
      />

      <nav aria-label="Breadcrumb" className="py-3 sm:py-4">
        <ol className="flex items-center gap-1 overflow-x-auto text-xs text-ink-muted scrollbar-none sm:text-sm">
          <li className="shrink-0">
            <Link href="/" className="transition-colors hover:text-brand-600">
              Home
            </Link>
          </li>

          <ChevronRight className="size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />

          <li className="shrink-0">
            <Link
              href={`/category/${product.category.slug}`}
              className="transition-colors hover:text-brand-600"
            >
              {product.category.name}
            </Link>
          </li>

          <ChevronRight className="size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />

          <li className="min-w-0">
            <span aria-current="page" className="block truncate font-medium text-ink">
              {product.title}
            </span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10 xl:gap-14">
        {/* The gallery holds its place while the buy column scrolls past it on a tall screen. */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <ProductGallery
            images={product.images.map((image) => ({ url: image.url, alt: image.alt }))}
            title={product.title}
            discountPercent={percentOff}
            outOfStock={!inStock}
          />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            {product.brand ? (
              <Link
                href={`/search?brand=${product.brand.slug}`}
                className={cn(
                  'inline-block text-xs font-semibold tracking-wide text-brand-600 uppercase',
                  'transition-colors hover:text-brand-700',
                  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                )}
              >
                {product.brand.name}
              </Link>
            ) : null}

            <h1 className="mt-1 text-xl leading-snug font-bold tracking-tight text-balance text-ink sm:text-2xl lg:text-3xl">
              {product.title}
            </h1>

            {product.titleBn ? (
              <p className="mt-1 text-sm text-ink-muted" lang="bn">
                {product.titleBn}
              </p>
            ) : null}

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Stars
                value={breakdown.average}
                count={breakdown.total}
                size="md"
                showValue={breakdown.total > 0}
              />

              {breakdown.total > 0 ? (
                <span aria-hidden="true" className="text-ink-subtle">
                  ·
                </span>
              ) : null}

              <span className="text-xs text-ink-muted sm:text-sm">
                {product.soldCount > 0
                  ? `${product.soldCount.toLocaleString('en-US')} sold`
                  : 'New arrival'}
              </span>
            </div>
          </div>

          <BuyBox
            product={{
              id: product.id,
              title: product.title,
              price: product.price,
              discountPrice: product.discountPrice,
              stock: product.stock,
              variants: product.variants.map((variant) => ({
                id: variant.id,
                size: variant.size,
                color: variant.color,
                price: variant.price,
                stock: variant.stock,
              })),
            }}
            wishlisted={wishlistedIds.has(product.id)}
            addToCartAction={addProductToCart}
            className="border-t border-line pt-6"
          />

          <SellerCard seller={product.seller} />

          <DeliveryInfo />
        </div>
      </div>

      <section className="mt-10 sm:mt-14">
        <ProductTabs
          reviewCount={breakdown.total}
          description={
            <div className="max-w-3xl">
              <p className="text-sm leading-relaxed whitespace-pre-line text-ink-muted sm:text-base">
                {product.description}
              </p>
            </div>
          }
          specifications={<Specifications product={product} className="max-w-3xl" />}
          reviews={
            <ReviewList
              reviews={product.reviews}
              summary={breakdown}
              formSlot={
                eligibility.canReview ? (
                  <ReviewForm
                    productId={product.id}
                    productTitle={product.title}
                    submitAction={submitReview}
                  />
                ) : (
                  <ReviewNote
                    signedIn={user != null}
                    hasReviewed={eligibility.hasReviewed}
                    hasPurchased={eligibility.hasPurchased}
                  />
                )
              }
            />
          }
        />
      </section>

      {related.length > 0 ? (
        <section className="mt-12 sm:mt-16">
          <SectionHeading
            title="You may also like"
            subtitle={`More from ${product.category.name}`}
            href={`/category/${product.category.slug}`}
          />
          <ProductRail products={related} wishlistedIds={[...wishlistedIds]} />
        </section>
      ) : null}
    </div>
  )
}

/**
 * Why the shopper cannot write a review. Every branch is honest about the reason — "only verified
 * buyers" is the rule that makes the other reviews on this page worth reading.
 */
function ReviewNote({
  signedIn,
  hasReviewed,
  hasPurchased,
}: {
  signedIn: boolean
  hasReviewed: boolean
  hasPurchased: boolean
}) {
  const { icon: Icon, body } = hasReviewed
    ? {
        icon: PenLine,
        body: 'You have already reviewed this product. Thank you — it helps other shoppers.',
      }
    : hasPurchased
      ? {
          icon: Lock,
          body: 'Your order is on its way. You can review this product once it has been delivered.',
        }
      : {
          icon: Lock,
          body: 'Only verified buyers can review. Once you have received this product from an order, the review form appears here.',
        }

  return (
    <div className="flex items-start gap-3 rounded-card border border-dashed border-line bg-surface-muted p-4">
      <Icon className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />

      <p className="text-sm text-ink-muted">
        {body}
        {!signedIn ? (
          <>
            {' '}
            <Link
              href="/login"
              className="font-semibold text-brand-600 underline-offset-2 transition-colors hover:text-brand-700 hover:underline"
            >
              Sign in
            </Link>{' '}
            to check your orders.
          </>
        ) : null}
      </p>
    </div>
  )
}
