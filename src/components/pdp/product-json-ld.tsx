/**
 * Product JSON-LD.
 *
 * This is the payload Google turns into a rich result — the price, the stars and the "In stock"
 * chip under the blue link. It is also what an LLM answer engine reads when it is asked "where can
 * I buy X in Bangladesh", so it is not decoration: it is the page's machine-readable body.
 *
 * Two rules it obeys:
 *  - The numbers are the SAME ones the page renders (`effectivePrice`, the real review rows). A
 *    structured price that disagrees with the visible price gets the rich result pulled.
 *  - `aggregateRating` is emitted only when reviews actually exist. Google rejects — and can
 *    penalise — a rating block with a count of zero.
 */

export interface ProductJsonLdInput {
  name: string
  description: string
  url: string
  images: string[]
  sku: string | null
  brandName: string | null
  categoryName: string
  /** Whole Taka the customer actually pays. */
  price: number
  inStock: boolean
  rating: number
  reviewCount: number
}

export function ProductJsonLd({
  name,
  description,
  url,
  images,
  sku,
  brandName,
  categoryName,
  price,
  inStock,
  rating,
  reviewCount,
}: ProductJsonLdInput) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    ...(images.length > 0 ? { image: images } : {}),
    ...(sku ? { sku } : {}),
    category: categoryName,
    brand: {
      '@type': 'Brand',
      name: brandName ?? 'Gulu Mulu',
    },
    offers: {
      '@type': 'Offer',
      url,
      price,
      priceCurrency: 'BDT',
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'Gulu Mulu',
      },
    },
    ...(reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: rating,
            reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  }

  return (
    <script
      type="application/ld+json"
      // Escaping `<` closes off the one XSS vector in a JSON-LD block: a product description
      // containing "</script>" would otherwise break out of the tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  )
}
