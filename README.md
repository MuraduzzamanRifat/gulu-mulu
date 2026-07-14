# Gulu Mulu

**Live: https://gm-jade.vercel.app**

A multi-vendor e-commerce marketplace for Bangladesh — third-party sellers list products,
Gulu Mulu runs the storefront, checkout and delivery, and takes a commission per line item.

Modelled on the [Govaly](https://govaly.com.bd) / Daraz category of BD marketplace: mobile-first,
Cash-on-Delivery-first, phone-OTP login, and budget-anchored merchandising ("Shop Under ৳999").

> **Read [HANDOVER.md](HANDOVER.md) first.** It covers the two open decisions (production login,
> credential rotation) and what is deliberately still stubbed.

## Stack

| Layer    | Choice                                            |
| -------- | ------------------------------------------------- |
| Framework| Next.js 16 (App Router, Turbopack), React 19      |
| Language | TypeScript 5.9 (strict)                           |
| Styling  | Tailwind CSS 4 (CSS-first `@theme`, no JS config) |
| ORM      | Prisma 7 (driver adapters)                        |
| Database | SQLite locally · Postgres-portable schema         |
| Auth     | Hand-rolled phone-OTP + `jose` JWT session cookie |
| Payments | COD live · SSLCommerz/bKash/Nagad stubbed         |

## Quick start

```bash
pnpm install          # runs `prisma generate` via postinstall
cp .env.example .env  # then edit AUTH_SECRET
pnpm db:push          # create the SQLite database
pnpm db:seed          # load demo catalogue, sellers, orders
pnpm dev              # http://localhost:3000
```

No Docker and no Postgres install needed — local dev runs on a SQLite file.

### Demo logins

Login is phone + OTP. **In dev no SMS is sent** — the OTP is always `123456` and is printed to the
server console and shown in an on-screen dev banner.

| Role     | Phone         | Lands on   |
| -------- | ------------- | ---------- |
| Admin    | `01700000001` | `/admin`   |
| Seller   | `01700000002` | `/seller`  |
| Customer | `01700000003` | `/account` |

## What's built

**Storefront** — homepage (hero carousel, category rail, USP bar, brand strip, "Shop Under ৳X"
collections, live %-off deal grid, featured products), category / brand / search pages with
URL-driven filters and sort, product detail with variants, reviews and Product JSON-LD, cart,
multi-step checkout, order tracking, CMS-backed policy pages.

**Seller portal** — "Become a Seller" funnel with trade-licence/NID capture, product CRUD
(new listings go to `PENDING` for admin approval), per-seller order fulfilment, commission and
payout visibility. A seller only ever sees their own order lines.

**Admin panel** — seller approval queue, product approval queue, commission-rate control, orders,
and CRUD for categories, brands, banners, the "Shop Under ৳X" collections and policy pages.

## Commands

```bash
pnpm dev            # dev server
pnpm build          # production build
pnpm typecheck      # tsc --noEmit
pnpm exec eslint .  # lint  (`next lint` was removed in Next 16)
pnpm db:push        # sync schema -> database
pnpm db:seed        # (re)seed demo data
pnpm db:reset       # wipe + re-push + re-seed
pnpm db:studio      # browse the data
```

## Architecture notes

- **Money is an integer of whole Taka (৳).** Never a float. `price` is the strike-through
  original; `discountPrice` is what's actually charged. Always go through `effectivePrice()` /
  `discountPercent()` in `src/lib/format.ts`.
- **Commission is frozen at purchase time.** `OrderItem` stores `commissionRate`,
  `commissionAmount` and `sellerEarning`, so changing a seller's rate later never rewrites
  historical earnings. `commissionAmount + sellerEarning === lineTotal`, exactly.
- **One order can span many sellers.** That split lives on `OrderItem`, and each seller advances
  their own lines through fulfilment independently.
- **Checkout never trusts the client.** Prices, stock and commissions are all re-read from the
  database inside a transaction before the order is written.
- **Browse state lives in the URL**, so every filtered view is shareable and bookmarkable.

## Before this goes live

1. **Swap SQLite for Postgres.** A serverless host (Vercel etc.) has an ephemeral filesystem, so
   a SQLite file will not persist. Point `DATABASE_URL` at Neon/Supabase, change `provider` in
   `prisma/schema.prisma` to `postgresql`, and swap the adapter in `src/lib/db.ts` to
   `@prisma/adapter-pg`. The schema is written to be portable.
2. **Wire a real SMS gateway** (SSL Wireless, Alpha SMS) and set `DEV_OTP_BYPASS=false`.
   Until then, *anyone can log in as anyone* with `123456`.
3. **Wire SSLCommerz.** `src/lib/payments/sslcommerz.ts` documents the real flow
   (init → `GatewayPageURL` → IPN → server-side validation). Today, non-COD checkout routes to a
   clearly-labelled mock gateway. Never trust the IPN payload without calling the validation API.
4. **Move images to object storage** (Cloudflare R2 / S3). Product images are currently URLs;
   sellers need a real uploader.
5. Set a strong `AUTH_SECRET`.

## Not yet built

- Bengali/English i18n. The schema already carries `nameBn` / `titleBn` / `labelBn`, so this is
  additive — it needs a `[locale]` routing layer (next-intl), not a migration.
- Courier integration (Pathao / Steadfast / RedX).
- Real file upload for seller documents.
