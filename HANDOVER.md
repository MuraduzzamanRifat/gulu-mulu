# Gulu Mulu — overnight handover

**Live:** https://gm-jade.vercel.app
**Code:** https://github.com/MuraduzzamanRifat/gulu-mulu
**Database:** Neon Postgres (`ep-lively-tooth-…`), 77 products seeded

---

## 🔴 Two things only you can do

### 1. Rotate the credentials that leaked into our chat

Both are live and both are sitting in the conversation transcript. Treat them as compromised.

| What | Where to rotate | Then |
|---|---|---|
| **Vercel token** (`vcp_34mCx…`) | Vercel → Settings → Tokens → delete it | Nothing else — I only used it for deploys |
| **Neon password** (`npg_Soq7…`) | Neon console → Reset password | Tell me and I'll update `DATABASE_URL` + `DIRECT_URL` on Vercel and in `.env` |

The Vercel token is the more serious of the two — it grants full account access, including reading every environment variable on every project.

### 2. Decide how production login should work

**Right now nobody can log in to the live site — including you.** That's deliberate, and it's the safe end of a genuine trade-off:

- `DEV_OTP_BYPASS=false` in production, so the dev code `123456` does **not** work there.
- No SMS gateway is wired, so `requestOtp()` correctly refuses to pretend it sent anything.

The result: the **storefront browses fine** (homepage, search, categories, product pages, cart), but **checkout, account, seller portal and admin are unreachable**.

I could have "fixed" this by turning the bypass on in production. **I deliberately did not** — that publishes `123456` as a universal admin password to anyone who finds the URL. On a live site with real seller and payout data, that's a breach, not a demo.

**Three ways forward — your call:**

| Option | What it means |
|---|---|
| **A. Wire a real SMS gateway** *(the real answer)* | `sendOtpSms()` in `src/lib/otp.ts` is already written against the standard BD gateway shape (BulkSMSBD / SSL Wireless / Alpha Net). Set `SMS_API_URL`, `SMS_API_KEY`, `SMS_SENDER_ID` on Vercel and login just works. |
| **B. Secret demo code** *(fastest)* | I've written the code for this already. Set `DEMO_ACCESS_CODE` on Vercel to a secret 6-digit value and it becomes the OTP for every phone — never shown in the UI, never logged. It's a **shared password**: anyone who learns it can log in as admin. Fine for a private demo, not for launch. Say the word and I'll set it. |
| **C. Leave it** | Storefront is public and browsable; the authenticated half stays closed until you launch. |

I stopped short of doing (B) on my own because planting a standing login bypass on a live production site is a decision you should make consciously, not one I make while you're asleep.

---

## What I did overnight

### 🔒 Security — a real vulnerability, found and fixed

**OTP was brute-forceable.** `verifyOtp()` had a 60-second cooldown on *requesting* codes but **no limit at all on guessing them**. Anyone who knew the admin's phone number (`01700000001` — it's in the seed) could request one code and then walk all 10⁶ combinations unthrottled until they hit it. That's a straight path to admin.

Fixed: 5 attempts, then the code burns and they eat the 60s cooldown. Verified end-to-end against the live database:

```
guess 1-4:  "That code is wrong. N attempts left."
guess 5:    "Too many incorrect attempts. Request a new code."
then:       even the CORRECT code is rejected — it was burned.
```

Roughly four months of continuous attack for a coin-flip chance, versus minutes before.

### ♿ Accessibility — the brand colour itself failed WCAG

I ran a 6-dimension audit and it found things I'd have shipped:

- **White on `brand-500` measured 3.99:1** — below the 4.5:1 floor. That's *every* conversion-critical control: **Place Order**, **Buy Now**, header **Search**, and the "40% OFF" flash at 10px. My own design token was the bug.
- **`ink-subtle` measured 2.88:1** — it failed even the 3:1 large-text floor, so there was *no size* at which it was legible. It renders the Terms/Privacy consent line, which is legally material text.
- **5 of 7 status badges failed** — "Delivered" was 2.87:1. Order status is the single thing customers return to the site to check, and it was the lowest-contrast text on the page.

All measured (oklch → linear sRGB → relative luminance → ratio), not eyeballed. **All 9 token pairs now clear AA.**

### 🖱️ Tailwind 4 silently deleted `cursor: pointer`

Tailwind 4 removed v3's `button { cursor: pointer }` preflight rule and nothing replaced it. **Every button on the site** — Add to Cart, Buy Now, Place Order, the quantity stepper — rendered with a plain arrow cursor on desktop. Nothing felt clickable. Only links still got a pointer, from the browser's own stylesheet, which is why it was easy to miss. Restored in `globals.css`.

### 💸 A double-tap could double an order

The PDP "Buy Now" button re-enabled itself *while the navigation was still in flight*, and `addToCart` **accumulates**. On a 3G connection in Dhaka that's 1–3 seconds of a live, idle-looking button. A second tap silently made it quantity 2 — and on Cash on Delivery that means a rider turns up with two items, the customer refuses the parcel, and you eat the delivery cost. Fixed.

### 📱 Touch targets

The `Button` primitive was well-built (44px), but almost every *secondary* control bypassed it: the cart quantity stepper was **32px**, the hero carousel dots **8px**, the filter-chip ✕ **20px**, the wishlist heart **32px** sitting on top of the card's link — so a miss didn't just fail, it navigated you away. All raised to 44px.

### 🔍 SEO — dead URLs returned `200 OK`

Every bogus URL (`/product/anything`, `/category/anything`, `/brand/anything`, `/pages/anything`) returned **HTTP 200** instead of 404 — a soft 404. Google would happily index unlimited dead pages on your domain, burning crawl budget. Cause: `loading.tsx` opens a Suspense boundary, so Next flushes the shell and commits a `200` *before* the page can call `notFound()`. Fixed.

Also: **`NEXT_PUBLIC_SITE_URL` was never set on Vercel**, so `sitemap.xml` was advertising `localhost:3000` URLs to Google. Fixed.

### 🖼️ The shop looked like a stock-photo accident

Product images were random Picsum photos — a mountain range as a "Cotton Saree". Replaced with **158 category-matched Unsplash photos**, every single one HTTP-verified (with a negative control proving the checker actually discriminates). Verified again after seeding: **158/158 resolve from the live database.**

### ⚡ Performance — images were being optimized twice

Every product/banner photo was piped through Vercel's `/_next/image` optimizer *on top of*
Unsplash's own CDN, which already serves resized AVIF/WebP. The default width ladder also
requested `w=3840` from ~800–1600px sources — paying Vercel to **upscale**. A custom loader
(`src/lib/image-loader.ts`) now hands the render width straight to the source CDN and skips
Vercel's optimizer entirely. Verified live: **0 images hit `/_next/image`** (was ~719 srcset
requests), max width capped at 1600, hero still preloads with `fetchpriority=high`.

- **Why it matters when you swap in real seller images:** if those land on Cloudflare R2 / S3
  *without* their own resize, extend the loader to route them back through Vercel's optimizer
  (or an image CDN). The loader currently passes non-CDN sources through untouched.

### ✨ Also

- OpenGraph social card + favicon (shares on Facebook/WhatsApp were rendering as blank grey boxes — that's how BD e-commerce actually spreads)
- Deleted the dead `prisma/dev.db` and various agent scratch files
- Pinned Turbopack's workspace root (it was inferring it from an unrelated `package-lock.json` in the parent folder)

---

## Still stubbed, deliberately

| Thing | State | To finish |
|---|---|---|
| **Payments** | COD works end-to-end. Card/bKash/Nagad route to a clearly-labelled **mock** gateway. | `src/lib/payments/sslcommerz.ts` documents the real flow (init → `GatewayPageURL` → IPN → **server-side validate**). Never trust the IPN payload without calling the validation API and re-checking the amount. |
| **SMS** | Not wired. See "production login" above. | Set the three `SMS_*` env vars. |
| **Seller document upload** | Takes a URL, not a file. Clearly labelled as such — I didn't fake an uploader that doesn't work. | Needs object storage (Cloudflare R2 / S3). Supabase Storage is also an option since you already have the project. |
| **Bengali / i18n** | **Removed — the site is English-only.** The `nameBn`/`titleBn`/`labelBn` columns, the Bengali font, and all Bengali UI/seed data were dropped. (The ৳ currency symbol stays.) | If bilingual is ever wanted, it's a fresh `[locale]` + next-intl build, not a revert. |
| **Courier integration** | Not started. | Pathao / Steadfast / RedX all have merchant APIs with a similar shape — one `CourierAdapter` interface, three implementations. |

---

## Demo logins (local only, until you decide on production login)

```bash
pnpm dev     # http://localhost:3000 — OTP is always 123456
```

| Role | Phone | Lands on |
|---|---|---|
| Admin | `01700000001` | `/admin` |
| Seller | `01700000002` | `/seller` |
| Customer | `01700000003` | `/account` |
