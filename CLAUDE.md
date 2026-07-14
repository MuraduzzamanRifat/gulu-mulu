@AGENTS.md

# Gulu Mulu — multi-vendor e-commerce marketplace (Bangladesh)

A Govaly/Daraz-style marketplace: third-party sellers list products, Gulu Mulu runs the
storefront, checkout, and delivery, and takes a commission.

## Stack (verified July 2026 — do NOT assume older versions)

| Thing      | Version | Notes |
|------------|---------|-------|
| Next.js    | 16.2.10 | App Router, **Turbopack default**, `src/` dir |
| React      | 19.2    | |
| TypeScript | 5.9     | strict |
| Tailwind   | 4.3     | **CSS-first**, no `tailwind.config.js` |
| Prisma     | 7.8     | **major rewrite vs v5/v6** |
| DB         | SQLite  | local dev; Postgres-portable schema |
| Auth       | DIY     | `jose` JWT in an httpOnly cookie |
| pnpm       | 10      | |

---

## ⚠️ Version traps — your training data is WRONG about these

### Next.js 16 (not 15)
- **`params` and `searchParams` are Promises.** No sync access. Always `await`.
  ```tsx
  export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
  }
  ```
  Same for `cookies()`, `headers()`, `draftMode()` — all `await`.
- **`middleware.ts` is now `proxy.ts`**, exporting a function named `proxy`. Node runtime only.
- **`revalidateTag(tag)` needs a 2nd arg**: `revalidateTag('products', 'max')`.
  In Server Actions prefer `updateTag('products')` (read-your-writes) or `refresh()`.
- `cacheLife` / `cacheTag` are stable — import from `next/cache` with no `unstable_` prefix.
- **`next lint` is removed.** Use `pnpm exec eslint .`.
- `cacheComponents` is **off** in this project. Do not add `use cache`; do not enable PPR.
- Route handler context params are also Promises: `{ params }: { params: Promise<{ id: string }> }`.
- `images.qualities` defaults to `[75]` only; `images.domains` is dead — use `remotePatterns`.

### Prisma 7 (not 5/6)
- Generator is `provider = "prisma-client"` (not `prisma-client-js`) and `output` is **mandatory**.
- **Import from the generated path, NOT `@prisma/client`:**
  ```ts
  import { PrismaClient } from '@/generated/prisma/client'
  ```
  Model/enum types also come from there. Always use the `@/lib/db` singleton in app code:
  ```ts
  import { prisma } from '@/lib/db'
  ```
- A **driver adapter is mandatory**. We use `@prisma/adapter-better-sqlite3`.
- `.env` is **not** auto-loaded by the Prisma CLI — `prisma.config.ts` does `import 'dotenv/config'`.
- `prisma migrate dev` **no longer auto-runs `generate` or seed.** Run them explicitly.
- **SQLite has no scalar lists** (`String[]`). Use a relation table. (Enums and `Json` ARE fine.)
- Never put `@map(...)` on an enum *value* — known Prisma 7 codegen bug.

### Tailwind 4 (not 3) — these v3 classes are DEAD
| ❌ v3 (dead) | ✅ v4 |
|---|---|
| `shadow` | `shadow-sm` |
| `shadow-sm` | `shadow-xs` |
| `rounded` | `rounded-sm` |
| `rounded-sm` | `rounded-xs` |
| `blur` | `blur-sm` |
| `outline-none` | `outline-hidden` |
| `ring` (3px) | `ring-3` (bare `ring` is now 1px) |
| `flex-shrink-0` | `shrink-0` |
| `flex-grow` | `grow` |
| `bg-gradient-to-r` | `bg-linear-to-r` |
| `bg-opacity-50` | `bg-black/50` |
| `text-opacity-50` | `text-black/50` |
| `overflow-ellipsis` | `text-ellipsis` |
| `!flex` | `flex!` (important moves to the END) |

- No `tailwind.config.js`. Theme tokens live in `@theme` inside `src/app/globals.css`.
- Container queries are built in: `@container` + `@sm:` / `@lg:`.
- Use the design tokens (`bg-brand`, `text-ink-muted`, …), not raw hexes.

---

## Conventions

- **Money is `Int`, whole Bangladeshi Taka (৳).** Never a float. Format via `formatBDT()` in
  `@/lib/format` — it renders `৳1,299`.
- Prices: `price` is the strike-through original; `discountPrice` (nullable) is what's actually
  charged. Use `effectivePrice()` / `discountPercent()` from `@/lib/format` — never re-derive.
- Server Components by default. `'use client'` only for real interactivity.
- Mutations are **Server Actions** in `_actions.ts` files next to the route. Validate every input
  with Zod. Never trust a client-supplied price, sellerId, or commission.
- Auth: `getCurrentUser()` from `@/lib/auth` (nullable), `requireUser()` / `requireSeller()` /
  `requireAdmin()` to gate. Roles: `CUSTOMER` | `SELLER` | `ADMIN`.
- URL is the source of truth for browse state (filters/sort/page) — shareable, bookmarkable.
- Mobile-first. BD e-commerce traffic is overwhelmingly mobile.

## Commands

```bash
pnpm dev                  # dev server (Turbopack)
pnpm build                # production build
pnpm typecheck            # tsc --noEmit
pnpm exec eslint .        # lint (NOT `next lint` — removed in 16)
pnpm db:push              # push schema to SQLite
pnpm db:generate          # regenerate Prisma client (NOT automatic in v7)
pnpm db:seed              # seed demo data
pnpm db:reset             # wipe + re-push + re-seed
pnpm db:studio            # Prisma Studio
```

## Demo logins (seeded)

OTP is **not** sent by SMS in dev — the code is printed to the server console and shown in a dev
banner on the verify screen. In dev the OTP is always `123456`.

| Role     | Phone         |
|----------|---------------|
| Admin    | `01700000001` |
| Seller   | `01700000002` |
| Customer | `01700000003` |
