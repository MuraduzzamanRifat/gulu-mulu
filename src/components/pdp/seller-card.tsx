import Image from 'next/image'
import { BadgeCheck, Store } from 'lucide-react'

import { Badge, Stars } from '@/components/ui'
import type { Seller } from '@/generated/prisma/client'
import { SellerStatus } from '@/generated/prisma/client'
import { cn } from '@/lib/utils'

/**
 * "Sold by …" — the multi-vendor disclosure.
 *
 * On a marketplace the shopper is buying from a third party, and pretending otherwise is how trust
 * dies on the first bad delivery. So the shop is named, rated and described right under the buy
 * button, not buried in the footer of the page.
 *
 * There is deliberately no "Visit store" link: `/seller/*` is the seller CENTRE (the proxy bounces
 * signed-out visitors there straight to /login), so linking a shopper into it would be a trap. When
 * a public shop route lands, this card is the one place that needs a link added.
 */

export type SellerCardSeller = Pick<
  Seller,
  'id' | 'businessName' | 'slug' | 'logoUrl' | 'description' | 'rating' | 'reviewCount' | 'status' | 'createdAt'
>

export interface SellerCardProps {
  seller: SellerCardSeller
  className?: string
}

/** "DF" from "Dhaka Fashion House" — the fallback when a shop has uploaded no logo. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

export function SellerCard({ seller, className }: SellerCardProps) {
  const verified = seller.status === SellerStatus.APPROVED

  return (
    <section
      aria-label="Seller information"
      className={cn('rounded-card border border-line bg-surface p-4 sm:p-5', className)}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-line bg-surface-sunken sm:size-16">
          {seller.logoUrl ? (
            <Image
              src={seller.logoUrl}
              alt={`${seller.businessName} logo`}
              fill
              sizes="64px"
              quality={75}
              className="object-cover"
            />
          ) : (
            <span className="grid size-full place-items-center text-base font-bold text-ink-muted">
              {initialsOf(seller.businessName)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-xs font-medium text-ink-muted">
            <Store className="size-3.5 shrink-0" aria-hidden="true" />
            Sold by
          </p>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-base font-semibold tracking-tight text-ink">
              {seller.businessName}
            </h3>

            {verified ? (
              <Badge variant="success" size="sm">
                <BadgeCheck aria-hidden="true" />
                Verified
              </Badge>
            ) : null}
          </div>

          {seller.reviewCount > 0 ? (
            <Stars
              value={seller.rating}
              count={seller.reviewCount}
              size="sm"
              showValue
              className="mt-1.5"
            />
          ) : (
            <p className="mt-1.5 text-xs text-ink-muted">New seller — no ratings yet</p>
          )}
        </div>
      </div>

      {seller.description ? (
        <div className="mt-4 border-t border-line pt-4">
          <h4 className="text-sm font-semibold text-ink">About this seller</h4>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">{seller.description}</p>
        </div>
      ) : null}

      <p className="mt-3 text-xs text-ink-muted">
        Selling on Gulu Mulu since{' '}
        {seller.createdAt.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
      </p>
    </section>
  )
}
