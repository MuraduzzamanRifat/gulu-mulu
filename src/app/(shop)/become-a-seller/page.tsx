import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Coins,
  HandCoins,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { Badge, buttonVariants, Card } from '@/components/ui'
import { formatBDT } from '@/lib/format'
import {
  DELIVERY_FEE_INSIDE_DHAKA,
  DELIVERY_FEE_OUTSIDE_DHAKA,
  splitCommission,
} from '@/lib/pricing'
import { cn } from '@/lib/utils'

import { getMarketplaceStats } from './_queries'
import { FaqAccordion, type FaqItem } from './faq-accordion'

export const metadata: Metadata = {
  title: 'Sell on Gulu Mulu — Open Your Online Shop Free',
  description:
    'Sell to shoppers in all 64 districts of Bangladesh. Zero listing fee, cash-on-delivery ' +
    'collected for you, weekly payouts and a 48-hour delivery network. Approval in 3 working days.',
  alternates: { canonical: '/become-a-seller' },
  openGraph: {
    type: 'website',
    title: 'Sell on Gulu Mulu — Open Your Online Shop Free',
    description:
      'Zero listing fee. Cash on delivery collected for you. Weekly payouts. Open your shop today.',
    url: '/become-a-seller',
  },
}

/* -------------------------------------------------------------------------- */
/* The worked commission example                                              */
/* -------------------------------------------------------------------------- */

/**
 * The numbers below are not typed out — they are computed by the same `splitCommission()` the
 * checkout freezes onto every order line. A merchant reading this page and a merchant reading their
 * payout screen are looking at the output of one function, so the promise and the payment cannot
 * drift apart.
 */
const EXAMPLE_PRICE = 1_200
const EXAMPLE_RATE = 0.1
const EXAMPLE_DELIVERY = DELIVERY_FEE_INSIDE_DHAKA

const example = splitCommission(EXAMPLE_PRICE, EXAMPLE_RATE)

/* -------------------------------------------------------------------------- */
/* Content                                                                    */
/* -------------------------------------------------------------------------- */

interface Benefit {
  icon: LucideIcon
  title: string
  body: string
  highlight?: string
}

const BENEFITS: Benefit[] = [
  {
    icon: Users,
    title: 'Reach all 64 districts',
    body: 'Your shop opens to every shopper on Gulu Mulu the day you are approved — Dhaka, Chattogram, Sylhet, and the upazila your own courier would never quote for.',
    highlight: '64 districts',
  },
  {
    icon: Truck,
    title: '48-hour delivery network',
    body: 'Our riders collect from your door every working day. Metro orders land in 48 hours. You never negotiate with a courier, chase a parcel, or price a delivery again.',
    highlight: 'Daily pickup',
  },
  {
    icon: HandCoins,
    title: 'We collect the cash',
    body: 'Most of Bangladesh still pays cash on delivery. We take that risk: the rider collects, we reconcile, and the money reaches your payout as clean digital balance.',
    highlight: 'COD handled',
  },
  {
    icon: Banknote,
    title: 'Weekly payouts',
    body: 'Payouts close every Thursday midnight and land in your bank or bKash merchant account with a reference you can trace. No 45-day settlement games.',
    highlight: 'Every week',
  },
  {
    icon: Coins,
    title: 'Zero listing fee',
    body: 'No monthly rent, no per-listing charge, no setup fee, no charge for photographs. List a hundred products and pay nothing. We only earn when you sell.',
    highlight: '৳0 to start',
  },
  {
    icon: BarChart3,
    title: 'A dashboard that tells the truth',
    body: 'Every order line shows the exact commission and the exact Taka you earn, frozen at the moment of purchase. Stock, sales and payouts in one screen.',
    highlight: 'Live numbers',
  },
]

interface Step {
  title: string
  body: string
  icon: LucideIcon
}

const STEPS: Step[] = [
  {
    icon: ClipboardList,
    title: 'Register your shop',
    body: 'Your phone number, your business name, and a trade licence and NID we can verify. It takes about ten minutes and costs nothing.',
  },
  {
    icon: BadgeCheck,
    title: 'Get approved in 3 days',
    body: 'Our team checks your documents within three working days. You will hear back either way — and if something is missing we tell you exactly what.',
  },
  {
    icon: Boxes,
    title: 'List your products',
    body: 'Add photos, an honest description, your price in whole Taka, and your stock. Our catalogue team reviews new listings within 24 hours.',
  },
  {
    icon: PackageCheck,
    title: 'Pack it, we do the rest',
    body: 'An order arrives, you print the label and mark it ready before 2:00pm. Our rider collects, delivers, collects the cash — and it lands in your next payout.',
  },
]

const FAQS: FaqItem[] = [
  {
    question: 'What does it cost to open a shop?',
    answer:
      'Nothing. There is no registration fee, no monthly rent and no listing fee. Gulu Mulu earns a commission only when a product actually sells and the customer keeps it — if the order is returned, the commission is reversed in full.',
  },
  {
    question: 'What documents do I need to be approved?',
    answer:
      'A valid trade licence, the owner’s NID (front and back), and a bank account or bKash merchant number in the business name. If your turnover requires a TIN, add that too. Applications are reviewed within three working days.',
  },
  {
    question: 'How much commission will I actually pay?',
    answer:
      'Between 8% and 15% of the item value, agreed with you at onboarding based on your category and volume. It is charged on the item value only — never on the delivery fee — and the exact rate is shown on every order line in your dashboard.',
  },
  {
    question: 'When do I get paid?',
    answer:
      'Payouts run weekly, closing Thursday midnight. Earnings become payable seven days after an order is marked Delivered, which covers the return window. Money is sent to your registered bank account or bKash merchant number with a reference number.',
  },
  {
    question: 'Do I have to arrange delivery myself?',
    answer:
      'No. Our fleet collects from your registered pickup address every working day inside Dhaka, Chattogram, Sylhet, Khulna and Rajshahi metro. Outside those zones you drop the parcel at the nearest partner courier point and we reimburse the fee against your next payout.',
  },
  {
    question: 'Who pays when a customer returns an item?',
    answer:
      'If the fault is yours — a defect, a wrong item, a misleading listing — the return delivery is charged to you. If the customer simply changed their mind, Gulu Mulu absorbs the pickup and the original delivery fee is not refunded to them. Either way, your commission is fully reversed.',
  },
  {
    question: 'Can I sell branded goods?',
    answer:
      'Yes, if they are genuine and you can show an import invoice or a distributor agreement on request. Counterfeits — “master copy”, “7A quality” and the rest — mean immediate removal, suspension of the shop, and forfeiture of any pending payout. There is no first warning.',
  },
  {
    question: 'Can I run my own shop or Facebook page at the same time?',
    answer:
      'Absolutely. Most of our sellers do. The only rule is that you never use a Gulu Mulu parcel to pull a Gulu Mulu customer off the platform — no leaflets with your own phone number inside the box.',
  },
]

/* -------------------------------------------------------------------------- */
/* Pieces                                                                     */
/* -------------------------------------------------------------------------- */

const ctaPrimary = cn(buttonVariants({ variant: 'primary', size: 'lg' }), 'w-full sm:w-auto')
const ctaSecondary = cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full sm:w-auto')

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 text-center sm:text-left">
      <p className="text-2xl font-extrabold tracking-tight text-ink tabular-nums sm:text-3xl">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">{label}</p>
    </div>
  )
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: string
  subtitle: string
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold tracking-widest text-brand-600 uppercase">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-balance text-ink sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 text-base text-pretty text-ink-muted">{subtitle}</p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function BecomeASellerPage() {
  const stats = await getMarketplaceStats()

  // Structured data for the FAQ — the same eight answers, so the rich result can never say
  // something the page does not.
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }

  return (
    <div className="pb-4">
      <script
        type="application/ld+json"
        // Our own constants, serialised — no user input reaches this.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ------------------------------------------------------------------ Hero */}
      <section className="border-b border-line bg-linear-to-br from-brand-50 via-surface to-accent-100/40">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="min-w-0">
              <Badge variant="brand" className="gap-1.5 px-3 py-1 text-xs font-semibold">
                <Sparkles className="size-3" aria-hidden="true" />
                Zero listing fee · Approved in 3 days
              </Badge>

              <h1 className="mt-4 text-3xl leading-tight font-extrabold tracking-tight text-balance text-ink sm:text-4xl lg:text-5xl">
                Sell to all of Bangladesh.{' '}
                <span className="text-brand-600">We handle everything else.</span>
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-pretty text-ink-muted sm:text-lg">
                You make it. You price it. You pack it. Gulu Mulu brings the shoppers, delivers the
                parcel, collects the cash on delivery, and pays you every week — for a commission
                that only ever applies when the sale actually sticks.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/seller/register" className={ctaPrimary}>
                  Start selling — it&apos;s free
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Link>
                <Link href="/pages/seller-policy" className={ctaSecondary}>
                  Read the seller policy
                </Link>
              </div>

              <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
                {['No setup fee', 'No monthly rent', 'Cancel any time'].map((point) => (
                  <li key={point} className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* The image is decoration, not information — it is the last thing that should block a
                merchant on a slow connection, hence `priority` off and a light aspect box. */}
            <div className="relative hidden aspect-4/3 overflow-hidden rounded-card border border-line shadow-md lg:block">
              <Image
                src="https://picsum.photos/seed/gm-become-seller/1200/900"
                alt=""
                fill
                sizes="(min-width: 1024px) 40vw, 0px"
                quality={75}
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-linear-to-t from-ink/45 via-ink/5 to-transparent"
              />
              <div className="absolute inset-x-4 bottom-4 rounded-card bg-surface/95 p-4 backdrop-blur-sm">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Store className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
                  {stats.sellers} verified shops already selling
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Trade licence and NID checked by a human before a single product goes live.
                </p>
              </div>
            </div>
          </div>

          {/* Proof strip — counted from the database, never typed. */}
          <dl className="mt-10 grid grid-cols-2 gap-6 rounded-card border border-line bg-surface/70 px-5 py-6 backdrop-blur-sm sm:mt-14 sm:grid-cols-4 sm:px-8">
            <Stat value={`${stats.sellers}`} label="Verified sellers" />
            <Stat value={`${stats.products}`} label="Products live" />
            <Stat value={`${stats.categories}`} label="Categories" />
            <Stat value="64" label="Districts covered" />
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------- Why sell with us */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <SectionTitle
          eyebrow="Why Gulu Mulu"
          title="Everything a shop needs, minus the parts that break you"
          subtitle="A storefront, a payment system and a delivery fleet cost a small business more than it earns. So we built them once, and you rent none of it."
        />

        <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, body, highlight }) => (
            <Card key={title} className="flex flex-col p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {highlight ? (
                  <Badge variant="accent" size="md" className="font-semibold">
                    {highlight}
                  </Badge>
                ) : null}
              </div>

              <h3 className="mt-4 text-base font-semibold tracking-tight text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-ink-muted">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- How it works */}
      <section className="border-y border-line bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <SectionTitle
            eyebrow="How it works"
            title="From application to first payout in four steps"
            subtitle="No agency, no middleman, no “package” to buy. You do the two things only you can do — make it and pack it."
          />

          <ol className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="relative flex h-full">
                <Card className="flex h-full w-full flex-col bg-surface p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white tabular-nums">
                      {index + 1}
                    </span>
                    <Icon className="size-5 shrink-0 text-ink-subtle" aria-hidden="true" />
                  </div>

                  <h3 className="mt-4 text-base font-semibold tracking-tight text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-ink-muted">{body}</p>
                </Card>
              </li>
            ))}
          </ol>

          <div className="mt-8 text-center sm:mt-10">
            <Link href="/seller/register" className={ctaPrimary}>
              Open my shop
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Commission */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <SectionTitle
          eyebrow="The commission, in full"
          title="We only earn when you earn"
          subtitle="No hidden cut, no “platform fee”, no charge on the delivery. Here is exactly what happens to a ৳1,200 sale."
        />

        <div className="mx-auto mt-8 grid max-w-5xl gap-6 sm:mt-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {/* The rules */}
          <div className="space-y-4">
            {[
              {
                icon: Coins,
                title: 'Charged on the item value only',
                body: `Never on the delivery fee. A ${formatBDT(EXAMPLE_DELIVERY)} Dhaka delivery (or ${formatBDT(DELIVERY_FEE_OUTSIDE_DHAKA)} outside it) is collected by us and passed straight to the fleet — it is not part of your commission base.`,
              },
              {
                icon: ShieldCheck,
                title: 'Frozen at the moment of purchase',
                body: 'Your rate is stamped onto every order line when the customer checks out. If we renegotiate a rate next year, it can never reach backwards and rewrite a payout you have already been promised.',
              },
              {
                icon: PackageCheck,
                title: 'Fully reversed on a return',
                body: 'Including a change-of-mind return. You are never charged commission on money you did not keep — not a single Taka of it.',
              },
              {
                icon: BarChart3,
                title: 'Typically 8% to 15%',
                body: 'Agreed with you at onboarding, based on your category and volume. High-margin categories sit at the top of that band, thin-margin electronics at the bottom.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-ink sm:text-base">{title}</h3>
                  <p className="mt-1 max-w-[60ch] text-sm leading-6 text-ink-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* The worked example */}
          <Card className="h-fit overflow-hidden lg:sticky lg:top-24">
            <div className="border-b border-line bg-surface-sunken px-5 py-4">
              <h3 className="text-sm font-semibold text-ink">A ৳1,200 sale, line by line</h3>
              <p className="mt-0.5 text-xs text-ink-subtle">
                At a {Math.round(EXAMPLE_RATE * 100)}% commission rate
              </p>
            </div>

            <dl className="divide-y divide-line px-5 text-sm">
              <div className="flex items-center justify-between gap-4 py-3.5">
                <dt className="text-ink-muted">Your listed price</dt>
                <dd className="font-semibold text-ink tabular-nums">{formatBDT(EXAMPLE_PRICE)}</dd>
              </div>

              <div className="flex items-center justify-between gap-4 py-3.5">
                <dt className="text-ink-muted">
                  Gulu Mulu commission
                  <span className="ml-1 text-ink-subtle tabular-nums">
                    ({Math.round(EXAMPLE_RATE * 100)}%)
                  </span>
                </dt>
                <dd className="font-semibold text-danger tabular-nums">
                  −{formatBDT(example.commissionAmount)}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4 py-3.5">
                <dt className="text-ink-muted">Delivery fee (inside Dhaka)</dt>
                <dd className="text-right">
                  <span className="font-semibold text-ink tabular-nums">
                    {formatBDT(EXAMPLE_DELIVERY)}
                  </span>
                  <span className="block text-xs text-ink-subtle">paid by the customer</span>
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4 bg-success-soft/60 py-4">
                <dt className="font-semibold text-ink">You receive</dt>
                <dd className="text-lg font-extrabold text-success tabular-nums">
                  {formatBDT(example.sellerEarning)}
                </dd>
              </div>
            </dl>

            <p className="border-t border-line px-5 py-3 text-xs leading-5 text-ink-subtle">
              Paid out in the weekly cycle, 7 days after the order is marked Delivered.
            </p>
          </Card>
        </div>
      </section>

      {/* ------------------------------------------------------------------ FAQ */}
      <section className="border-t border-line bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <SectionTitle
            eyebrow="Questions"
            title="The things every seller asks us first"
            subtitle="And the answers, before you have to ask. If yours is not here, our seller team is on 16xxx, 9am–9pm."
          />

          <div className="mx-auto mt-8 max-w-3xl sm:mt-12">
            <FaqAccordion items={FAQS} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Final CTA */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="overflow-hidden rounded-card bg-linear-to-br from-brand-600 to-brand-800 px-6 py-10 text-center sm:px-10 sm:py-14">
          <h2 className="mx-auto max-w-2xl text-2xl font-extrabold tracking-tight text-balance text-white sm:text-3xl lg:text-4xl">
            Your next customer is already on Gulu Mulu
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-pretty text-white/85">
            Registering costs nothing and takes about ten minutes. Have your trade licence and NID
            ready, and you could be live within three working days.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/seller/register"
              className={cn(
                buttonVariants({ variant: 'accent', size: 'lg' }),
                'w-full font-bold sm:w-auto',
              )}
            >
              Register your shop
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
            <Link
              href="/pages"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'lg' }),
                'w-full text-white hover:bg-white/10 hover:text-white active:bg-white/20 sm:w-auto',
              )}
            >
              Read all the policies first
            </Link>
          </div>

          <p className="mt-6 text-xs text-white/70">
            Already applied?{' '}
            <Link href="/seller" className="font-semibold text-white underline underline-offset-2">
              Check your shop status
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
