// -----------------------------------------------------------------------------
// Gulu Mulu — demo seed data.
//
// Idempotent: wipes every table in FK-safe order, then re-inserts a full, realistic
// Bangladeshi fashion/lifestyle marketplace so the whole site is browsable.
//
// Run with:  pnpm db:seed        (or `pnpm db:reset` to wipe the schema too)
//
// Prisma 7 notes:
//  * `.env` is NOT auto-loaded here — hence `import 'dotenv/config'`.
//  * A driver adapter is mandatory.
//  * Seeding writes a lot of rows, so it goes through the DIRECT Neon endpoint rather
//    than the pooled one — bulk inserts over a transaction pooler are slow and can
//    trip statement-timeout limits.
// -----------------------------------------------------------------------------
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import {
  BRAND_IMAGES,
  HERO_BANNERS,
  SECONDARY_BANNERS,
  pickCategoryImage,
  pickCollectionImage,
  pickProductImage,
} from './seed-images'

// Seeding writes thousands of rows, so use the DIRECT (unpooled) endpoint — bulk inserts
// through a transaction pooler are slow and can trip statement timeouts.
// Neon's Vercel integration calls it DATABASE_URL_UNPOOLED; locally we call it DIRECT_URL.
const connectionString =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL

const adapter = new PrismaPg({ connectionString })

const prisma = new PrismaClient({ adapter })

// -----------------------------------------------------------------------------
// Deterministic PRNG — the same seed run twice produces the same demo data, so
// screenshots, tests and bug reports stay reproducible.
// -----------------------------------------------------------------------------
let rngState = 20260714

function rnd(): number {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296
  return rngState / 4294967296
}

function randInt(min: number, max: number): number {
  return Math.floor(rnd() * (max - min + 1)) + min
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)]
}

function pickSome<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0])
  }
  return out
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[%&]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(randInt(9, 21), randInt(0, 59), 0, 0)
  return d
}

function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

/** Split a total stock figure across n variants so the sums stay consistent. */
function distribute(total: number, n: number): number[] {
  const base = Math.floor(total / n)
  let rem = total - base * n
  return Array.from({ length: n }, () => {
    const extra = rem > 0 ? 1 : 0
    rem -= extra
    return base + extra
  })
}

/**
 * Product photo, picked from a category-appropriate pool of HTTP-verified Unsplash URLs.
 *
 * This used to be a random picsum image, which always loaded but served landscapes — a mountain
 * range as a "Cotton Saree" made the whole shop look broken. Deterministic, so re-seeding
 * reproduces the identical catalogue.
 */
function productImageUrl(categorySlug: string, slug: string, index: number): string {
  return pickProductImage(categorySlug, slug, index)
}

// -----------------------------------------------------------------------------
// 1. Wipe (FK-safe order: children before parents)
// -----------------------------------------------------------------------------
async function wipe() {
  await prisma.review.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.coupon.deleteMany()
  await prisma.payout.deleteMany()
  await prisma.wishlistItem.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.cart.deleteMany()
  await prisma.address.deleteMany()
  await prisma.productImage.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.product.deleteMany()
  await prisma.collection.deleteMany()
  await prisma.brand.deleteMany()
  // Category is a self-relation: delete leaves first, then the roots.
  await prisma.category.deleteMany({ where: { parentId: { not: null } } })
  await prisma.category.deleteMany()
  await prisma.seller.deleteMany()
  await prisma.otpCode.deleteMany()
  await prisma.user.deleteMany()
  await prisma.banner.deleteMany()
  await prisma.page.deleteMany()
}

// -----------------------------------------------------------------------------
// 2. Users
// -----------------------------------------------------------------------------
const ADMIN_PHONE = '01700000001'
const SELLER_PHONE = '01700000002'
const CUSTOMER_PHONE = '01700000003'

const SELLER_USERS = [
  { phone: SELLER_PHONE, name: 'Rahim Uddin', email: 'rahim@dhakafashionhouse.com.bd' },
  { phone: '01711002233', name: 'Nasrin Akter', email: 'nasrin@chittagongcotton.com.bd' },
  { phone: '01712334455', name: 'Tanvir Hasan', email: 'tanvir@gulshanbeauty.com.bd' },
  { phone: '01713445566', name: 'Shirin Sultana', email: 'shirin@sylhetsilk.com.bd' },
  { phone: '01714556677', name: 'Kamrul Islam', email: 'kamrul@aarongstyle.com.bd' },
  { phone: '01715667788', name: 'Farhana Rahman', email: 'farhana@banikids.com.bd' },
] as const

const CUSTOMER_USERS = [
  { phone: CUSTOMER_PHONE, name: 'Ayesha Karim', email: 'ayesha.karim@gmail.com' },
  { phone: '01812345678', name: 'Mahbub Alam', email: 'mahbub.alam@gmail.com' },
  { phone: '01913572468', name: 'Sadia Islam', email: 'sadia.islam@yahoo.com' },
  { phone: '01611224466', name: 'Imran Chowdhury', email: 'imran.chowdhury@gmail.com' },
  { phone: '01521334455', name: 'Rubina Yasmin', email: 'rubina.yasmin@gmail.com' },
] as const

// -----------------------------------------------------------------------------
// 3. Sellers  (exactly 2 PENDING so the admin approval queue has real work)
// -----------------------------------------------------------------------------
const SELLERS = [
  {
    userPhone: SELLER_PHONE,
    businessName: 'Dhaka Fashion House',
    slug: 'dhaka-fashion-house',
    status: 'APPROVED' as const,
    commissionRate: 0.12,
    description:
      'A New Market institution since 2011. Dhaka Fashion House stitches everyday women’s wear — kurtis, three-pieces and cotton tops — in its own Keraniganj unit, so the price you see is the factory price plus a fair margin.',
    tradeLicenseNo: 'TRAD/DNCC/019283/2011',
    bankName: 'Dutch-Bangla Bank',
    bkashNumber: '01700000002',
  },
  {
    userPhone: '01711002233',
    businessName: 'Chittagong Cotton Co.',
    slug: 'chittagong-cotton-co',
    status: 'APPROVED' as const,
    commissionRate: 0.1,
    description:
      'Export-surplus cotton straight from the Chattogram EPZ belt. Chittagong Cotton Co. specialises in men’s shirts, denim and pure-cotton home textiles — the same fabric that ships to Europe, minus the label.',
    tradeLicenseNo: 'TRAD/CCC/044120/2014',
    bankName: 'BRAC Bank',
    bkashNumber: '01711002233',
  },
  {
    userPhone: '01712334455',
    businessName: 'Gulshan Beauty Bar',
    slug: 'gulshan-beauty-bar',
    status: 'APPROVED' as const,
    commissionRate: 0.15,
    description:
      '100% authentic imported skincare, makeup and haircare. Every batch of our Korean and US stock arrives with an import invoice, and we publish the expiry date on every single listing.',
    tradeLicenseNo: 'TRAD/DNCC/077341/2018',
    bankName: 'City Bank',
    bkashNumber: '01712334455',
  },
  {
    userPhone: '01713445566',
    businessName: 'Sylhet Silk Studio',
    slug: 'sylhet-silk-studio',
    status: 'APPROVED' as const,
    commissionRate: 0.13,
    description:
      'Handloom sarees, panjabis and festive wear woven by weaver families in Monipuri Para, Sylhet. Small batches, natural dyes, and a fair price paid directly to the loom.',
    tradeLicenseNo: 'TRAD/SCC/012908/2016',
    bankName: 'Islami Bank Bangladesh',
    bkashNumber: '01713445566',
  },
  {
    userPhone: '01714556677',
    businessName: 'Aarong Style Bazaar',
    slug: 'aarong-style-bazaar',
    status: 'PENDING' as const,
    commissionRate: 0.11,
    description:
      'A curated reseller of heritage Bangladeshi craft — nakshi kantha, leather goods and jute homeware. Trade licence and NID submitted; awaiting marketplace verification.',
    tradeLicenseNo: 'TRAD/DSCC/091776/2024',
    bankName: 'Eastern Bank',
    bkashNumber: '01714556677',
  },
  {
    userPhone: '01715667788',
    businessName: 'Banani Kids Corner',
    slug: 'banani-kids-corner',
    status: 'PENDING' as const,
    commissionRate: 0.09,
    description:
      'Kids and baby clothing from newborn to nine years, all skin-safe and OEKO-TEX certified fabric. New seller — verification documents under review.',
    tradeLicenseNo: 'TRAD/DNCC/103455/2026',
    bankName: 'Prime Bank',
    bkashNumber: '01715667788',
  },
]

// -----------------------------------------------------------------------------
// 4. Categories — a real 2-level Govaly-style tree
// -----------------------------------------------------------------------------
type CatSeed = {
  name: string
  nameBn: string
  slug: string
  children: { name: string; nameBn: string; slug: string; featured?: number }[]
}

const CATEGORY_TREE: CatSeed[] = [
  {
    name: 'Women',
    nameBn: 'নারী',
    slug: 'women',
    children: [
      { name: 'Women Bottom', nameBn: 'নারীদের বটম', slug: 'women-bottom' },
      { name: 'Women Topwear', nameBn: 'নারীদের টপওয়্যার', slug: 'women-topwear', featured: 2 },
      { name: 'Women Footwear', nameBn: 'নারীদের জুতা', slug: 'women-footwear', featured: 5 },
      { name: 'Sarees', nameBn: 'শাড়ি', slug: 'sarees', featured: 1 },
      { name: 'Kurti', nameBn: 'কুর্তি', slug: 'kurti', featured: 3 },
    ],
  },
  {
    name: 'Men',
    nameBn: 'পুরুষ',
    slug: 'men',
    children: [
      { name: 'Men Topwear', nameBn: 'পুরুষদের টপওয়্যার', slug: 'men-topwear', featured: 6 },
      { name: 'Men Bottom', nameBn: 'পুরুষদের বটম', slug: 'men-bottom' },
      { name: 'Men Footwear', nameBn: 'পুরুষদের জুতা', slug: 'men-footwear' },
      { name: 'Panjabi', nameBn: 'পাঞ্জাবি', slug: 'panjabi', featured: 4 },
    ],
  },
  {
    name: 'Kids',
    nameBn: 'শিশু',
    slug: 'kids',
    children: [
      { name: 'Kids Kurti', nameBn: 'শিশুদের কুর্তি', slug: 'kids-kurti', featured: 7 },
      { name: 'Kids Footwear', nameBn: 'শিশুদের জুতা', slug: 'kids-footwear' },
    ],
  },
  {
    name: 'Baby',
    nameBn: 'নবজাতক',
    slug: 'baby',
    children: [
      { name: 'Baby Clothing', nameBn: 'বেবি পোশাক', slug: 'baby-clothing', featured: 8 },
      { name: 'Baby Accessories', nameBn: 'বেবি এক্সেসরিজ', slug: 'baby-accessories' },
    ],
  },
  {
    name: 'Health & Beauty',
    nameBn: 'স্বাস্থ্য ও সৌন্দর্য',
    slug: 'health-beauty',
    children: [
      { name: 'Skincare', nameBn: 'স্কিনকেয়ার', slug: 'skincare', featured: 9 },
      { name: 'Makeup', nameBn: 'মেকআপ', slug: 'makeup', featured: 10 },
      { name: 'Haircare', nameBn: 'হেয়ারকেয়ার', slug: 'haircare' },
    ],
  },
  {
    name: 'Home & Living',
    nameBn: 'ঘর ও জীবনযাপন',
    slug: 'home-living',
    children: [
      { name: 'Bedding', nameBn: 'বিছানাপত্র', slug: 'bedding', featured: 11 },
      { name: 'Kitchen', nameBn: 'রান্নাঘর', slug: 'kitchen', featured: 12 },
    ],
  },
]

// -----------------------------------------------------------------------------
// 5. Brands
// -----------------------------------------------------------------------------
const BRANDS = [
  { name: 'Aarong', featured: true },
  { name: 'Yellow', featured: true },
  { name: 'Ecstasy', featured: true },
  { name: 'Le Reve', featured: true },
  { name: 'Sailor', featured: true },
  { name: 'COSRX', featured: true },
  { name: 'Dove', featured: true },
  { name: 'Gillette', featured: true },
  { name: 'Aveeno', featured: false },
  { name: 'Bella Vita', featured: false },
  { name: 'Sana Safinaz', featured: false },
  { name: 'Asim Jofa', featured: false },
]

// -----------------------------------------------------------------------------
// 6. Products
// -----------------------------------------------------------------------------
type ProductSeed = {
  t: string // title
  bn?: string // Bengali title
  c: string // category slug
  b?: string // brand slug
  s: string // seller slug
  price: number
  disc?: number
  stock: number
  d: string // description
  f?: boolean // isFeatured
  pending?: boolean
}

const DFH = 'dhaka-fashion-house'
const CCC = 'chittagong-cotton-co'
const GBB = 'gulshan-beauty-bar'
const SSS = 'sylhet-silk-studio'

const PRODUCTS: ProductSeed[] = [
  // ---------------------------------------------------------------- Women Bottom
  {
    t: 'Cotton Palazzo Pants for Women',
    bn: 'কটন প্যালাজো প্যান্ট',
    c: 'women-bottom',
    b: 'yellow',
    s: DFH,
    price: 1290,
    disc: 899,
    stock: 64,
    d: 'Wide-leg palazzo cut from soft 100% cotton that breathes through a Dhaka summer. The covered elastic waistband sits flat under a kurti and never digs in. Pre-shrunk fabric, so the length you buy is the length you keep after the first wash.',
  },
  {
    t: 'High-Waist Denim Jeans Skinny Fit',
    c: 'women-bottom',
    b: 'ecstasy',
    s: DFH,
    price: 2190,
    disc: 1649,
    stock: 48,
    f: true,
    d: 'A high-rise skinny jean in stretch denim that holds its shape all day. Two per cent elastane gives just enough give for a long bus ride or a full shift at the office. Dark indigo wash pairs with anything, and the colour is locked in for at least thirty washes.',
  },
  {
    t: 'Printed Cotton Salwar Bottom',
    c: 'women-bottom',
    s: DFH,
    price: 650,
    stock: 72,
    d: 'A classic drawstring salwar in light printed cotton, cut generously through the hip so it drapes rather than clings. Ideal as an everyday base under a kurti or a three-piece top. Colours are dyed with reactive dyes and will not bleed onto your kameez.',
  },
  {
    t: 'Straight-Cut Linen Trousers',
    c: 'women-bottom',
    b: 'le-reve',
    s: DFH,
    price: 1850,
    stock: 33,
    d: 'Linen-viscose trousers with a clean straight leg and a proper zip fly, made for the office rather than the lounge. The blend keeps the cool hand-feel of linen but creases far less than pure linen ever will. Side pockets are deep enough for a phone.',
  },

  // -------------------------------------------------------------- Women Topwear
  {
    t: 'Embroidered Chiffon Tunic Top',
    c: 'women-topwear',
    b: 'yellow',
    s: DFH,
    price: 1590,
    disc: 1199,
    stock: 41,
    d: 'A flowing chiffon tunic with hand-guided thread embroidery across the yoke and cuffs. Fully lined at the body so it is never see-through. Dress it up with a dupatta for a dawat, or wear it plain with jeans.',
  },
  {
    t: 'Half-Sleeve Cotton Fatua',
    c: 'women-topwear',
    s: DFH,
    price: 890,
    stock: 58,
    d: 'The everyday cotton fatua — short, soft and endlessly washable. Side slits give you room to move and the neckline is finished with a narrow contrast piping. This is the top you will reach for on a hot Thursday morning.',
  },
  {
    t: 'Georgette Party Blouse',
    c: 'women-topwear',
    b: 'le-reve',
    s: DFH,
    price: 1450,
    stock: 27,
    d: 'A dressy georgette blouse with a keyhole back and covered buttons. The fabric has a subtle sheen that photographs beautifully under indoor lighting. Cut slightly loose so it layers over a saree petticoat or a fitted skirt.',
  },
  {
    t: 'Casual Printed Cotton Shirt for Women',
    c: 'women-topwear',
    b: 'ecstasy',
    s: DFH,
    price: 1190,
    disc: 949,
    stock: 52,
    d: 'A relaxed button-down in printed cotton poplin with a soft collar that stays put without starch. Roll the sleeves and fasten the tab for a warmer day. Works over palazzos, jeans or leggings without a second thought.',
  },

  // ------------------------------------------------------------ Women Footwear
  {
    t: 'Handcrafted Leather Sandals',
    c: 'women-footwear',
    b: 'aarong',
    s: SSS,
    price: 2290,
    disc: 1799,
    stock: 36,
    f: true,
    d: 'Vegetable-tanned leather sandals stitched by hand in a small workshop, with a cushioned footbed that moulds to your foot over the first week. The sole is properly glued and stitched, not just glued. Expect these to outlast three pairs of the mass-market alternative.',
  },
  {
    t: 'Embellished Party Heels',
    c: 'women-footwear',
    b: 'sailor',
    s: SSS,
    price: 2650,
    disc: 1990,
    stock: 22,
    d: 'A two-and-a-half inch block heel with a hand-set stone strap — high enough for a wedding, stable enough to actually dance in. The padded insole is the reason you will still be standing at midnight. Comes in a dust bag.',
  },
  {
    t: 'Everyday Cushioned Flats',
    c: 'women-footwear',
    s: SSS,
    price: 1150,
    stock: 60,
    d: 'Soft faux-leather flats with a memory-foam insole and a flexible non-slip sole. Designed for the walk from the CNG to the office and every errand in between. Wipe clean with a damp cloth after a rickshaw ride through a puddle.',
  },
  {
    t: 'Traditional Kolhapuri Chappal',
    c: 'women-footwear',
    s: SSS,
    price: 1390,
    stock: 44,
    d: 'The classic braided Kolhapuri, made in genuine buffalo leather with no plastic in the upper. It softens and darkens with wear, which is exactly the point. Goes with a cotton saree as easily as with a kurti.',
  },

  // ---------------------------------------------------------------------- Sarees
  {
    t: 'Jamdani Handloom Saree Traditional Motif',
    bn: 'জামদানি হ্যান্ডলুম শাড়ি',
    c: 'sarees',
    b: 'aarong',
    s: SSS,
    price: 6500,
    disc: 5499,
    stock: 14,
    f: true,
    d: 'A genuine handloom Jamdani woven in Rupganj over roughly three weeks on a pit loom. The motifs are supplementary-weft, worked in by hand thread by thread — no print, no machine. Comes with an unstitched blouse piece and a weaver’s tag naming the family who made it.',
  },
  {
    t: 'Half Silk Saree with Zari Border',
    c: 'sarees',
    s: SSS,
    price: 3200,
    disc: 2499,
    stock: 28,
    d: 'A half-silk saree with a silk warp and cotton weft, which gives you the drape of silk without the weight. The zari border catches the light without shouting. Perfect for a Pohela Boishakh morning or a family gathering.',
  },
  {
    t: 'Soft Katan Silk Saree Deep Maroon',
    c: 'sarees',
    s: SSS,
    price: 4500,
    disc: 3799,
    stock: 19,
    d: 'A deep maroon Katan silk with a firm, rustling drape that holds its pleats beautifully. The contrast anchal is woven, not stitched on. Dry clean only — treat this one as an investment piece for weddings.',
  },
  {
    t: 'Cotton Tangail Saree Everyday Wear',
    c: 'sarees',
    s: SSS,
    price: 1650,
    stock: 55,
    d: 'A lightweight Tangail cotton saree in a fine count that stays cool through a full working day. Starch it lightly and the pleats behave; skip the starch and it drapes soft. The sort of saree teachers and office-goers buy three of.',
  },
  {
    t: 'Georgette Printed Saree with Blouse Piece',
    c: 'sarees',
    s: SSS,
    price: 2100,
    stock: 31,
    d: 'A featherweight printed georgette that packs down to nothing — the saree you carry to a wedding out of town. The print is digitally set so the colours stay sharp after washing. Blouse piece included in the same print.',
  },

  // ----------------------------------------------------------------------- Kurti
  {
    t: 'Cotton Embroidered Salwar Kameez 3-Piece',
    bn: 'কটন এমব্রয়ডারি সালোয়ার কামিজ ৩ পিস',
    c: 'kurti',
    s: DFH,
    price: 2450,
    disc: 1899,
    stock: 47,
    f: true,
    d: 'A complete three-piece: embroidered cotton kameez, matching salwar and a soft cotton dupatta. The embroidery runs across the yoke and down the front placket, not just a token patch at the neck. Semi-stitched so a local tailor can bring it in to your exact fit.',
  },
  {
    t: 'Straight-Cut Printed Kurti',
    c: 'kurti',
    b: 'yellow',
    s: DFH,
    price: 1290,
    disc: 990,
    stock: 66,
    d: 'A clean straight-cut kurti in printed cotton, ending just below the knee with side slits for movement. Three-quarter sleeves keep it practical for the office. The print is placed, so no two panels awkwardly cut through the motif.',
  },
  {
    t: 'Anarkali Georgette Kurti with Dupatta',
    c: 'kurti',
    b: 'asim-jofa',
    s: DFH,
    price: 3900,
    disc: 2999,
    stock: 24,
    f: true,
    d: 'A full-flare Anarkali in layered georgette with a fitted bodice and a properly gathered skirt — the flare is real, not implied. Comes with a matching net dupatta finished with a lace edge. This is a wedding-guest outfit that needs no alteration.',
  },
  {
    t: 'A-Line Cotton Kurti Block Print',
    c: 'kurti',
    s: DFH,
    price: 1150,
    stock: 71,
    d: 'Hand block printed on soft cotton, so slight variation between panels is the signature rather than a flaw. The A-line cut is forgiving and flattering on most frames. Machine wash cold and it will only get softer.',
  },
  {
    t: 'Lawn 3-Piece Unstitched Suit',
    c: 'kurti',
    b: 'sana-safinaz',
    s: DFH,
    price: 4200,
    disc: 3399,
    stock: 18,
    d: 'A premium lawn unstitched set — kameez fabric, trouser fabric and a printed chiffon dupatta. Lawn is the lightest cotton weave there is, which is why Pakistani lawn sells out every summer in Dhaka. Take it to your tailor and get exactly the fit you want.',
  },

  // ---------------------------------------------------------------- Men Topwear
  {
    t: 'Slim-Fit Formal Cotton Shirt',
    c: 'men-topwear',
    b: 'ecstasy',
    s: CCC,
    price: 1690,
    disc: 1299,
    stock: 62,
    f: true,
    d: 'An export-quality formal shirt in 100% combed cotton with a fused collar that will not curl after a month. Slim through the chest and waist without restricting the shoulder. Holds a press well, which matters when your commute is humid.',
  },
  {
    t: 'Half-Sleeve Polo T-Shirt',
    c: 'men-topwear',
    b: 'le-reve',
    s: CCC,
    price: 890,
    disc: 699,
    stock: 78,
    d: 'A 180 GSM pique-knit polo with a ribbed collar that keeps its shape wash after wash. The cotton is combed, so it stays smooth instead of pilling around the underarm. Casual Friday sorted.',
  },
  {
    t: 'Printed Round-Neck Cotton T-Shirt',
    c: 'men-topwear',
    s: CCC,
    price: 550,
    stock: 80,
    d: 'A single-jersey cotton tee with a plastisol-free water-based print that stays soft and does not crack. Bio-washed for a smoother hand-feel straight out of the packet. Honest basics at an honest price.',
  },
  {
    t: 'Casual Denim Shirt Full Sleeve',
    c: 'men-topwear',
    b: 'sailor',
    s: CCC,
    price: 1890,
    disc: 1499,
    stock: 39,
    d: 'A lightweight 6oz denim shirt — soft enough to wear alone, structured enough to layer over a tee. Metal-shanked buttons and double-stitched side seams. It will fade at the elbows in exactly the way you want it to.',
  },
  {
    t: 'Checked Flannel Casual Shirt',
    c: 'men-topwear',
    s: CCC,
    price: 1450,
    stock: 34,
    d: 'A brushed cotton flannel in a classic check, warm enough for a Dhaka December evening without being bulky. The brushing is on both faces, so it feels soft against the skin. Fits true to size with room to layer.',
  },

  // ----------------------------------------------------------------- Men Bottom
  {
    t: 'Slim-Fit Stretch Denim Jeans',
    c: 'men-bottom',
    b: 'ecstasy',
    s: CCC,
    price: 2290,
    disc: 1749,
    stock: 57,
    d: 'A 12oz stretch denim cut slim through the thigh with a straight opening at the ankle. Enough elastane to sit comfortably on a long CNG ride, not so much that it goes baggy at the knee. YKK zip and riveted pockets.',
  },
  {
    t: 'Cotton Chino Pants',
    c: 'men-bottom',
    b: 'le-reve',
    s: CCC,
    price: 1790,
    disc: 1390,
    stock: 49,
    d: 'Mid-weight cotton twill chinos with a clean flat front and a slightly tapered leg. Smart enough for the office, relaxed enough for a Friday. The waistband has a hidden extra button so it stays flat under a shirt.',
  },
  {
    t: 'Formal Gabardine Trousers',
    c: 'men-bottom',
    s: CCC,
    price: 1590,
    stock: 43,
    d: 'Poly-viscose gabardine formal trousers that hold a crease all week and shrug off wrinkles on the ride to work. Fully lined to the knee so they hang cleanly. Hemmed long on purpose — get them finished to your length.',
  },
  {
    t: 'Cotton Twill Cargo Shorts',
    c: 'men-bottom',
    s: CCC,
    price: 950,
    stock: 51,
    d: 'Knee-length cargo shorts in washed cotton twill with two proper flap pockets that actually close. Cut roomy for airflow but not shapeless. The go-to for a weekend in Cox’s Bazar.',
  },

  // --------------------------------------------------------------- Men Footwear
  {
    t: 'Genuine Leather Formal Shoes',
    c: 'men-footwear',
    b: 'aarong',
    s: SSS,
    price: 3900,
    disc: 3199,
    stock: 29,
    f: true,
    d: 'A full-grain leather derby with a cemented rubber sole that grips a wet Dhaka footpath. The leather is thick enough to polish properly and take a shine. Break them in over a week and they will serve you for years.',
  },
  {
    t: 'Casual Canvas Sneakers',
    c: 'men-footwear',
    b: 'sailor',
    s: SSS,
    price: 1690,
    disc: 1290,
    stock: 54,
    d: 'A low-top canvas sneaker on a vulcanised rubber sole — light, flexible and easy to throw in a wash bag. Padded collar stops the heel rubbing. Neutral enough to wear with jeans or chinos.',
  },
  {
    t: 'Leather Sandal Two-Strap',
    c: 'men-footwear',
    s: SSS,
    price: 1890,
    stock: 37,
    d: 'A two-strap leather sandal with an adjustable buckle and a shock-absorbing EVA midsole. Built for the Dhaka summer, when a closed shoe is simply not an option. The footbed is lined in soft leather, not synthetic.',
  },
  {
    t: 'Everyday Rubber Flip-Flops',
    c: 'men-footwear',
    s: SSS,
    price: 350,
    stock: 80,
    d: 'A dense rubber flip-flop with a textured footbed that does not turn into a skating rink when wet. The toe post is anchored through the sole, so it will not pull out on day three. Buy two pairs and stop worrying.',
  },

  // ---------------------------------------------------------------------- Panjabi
  {
    t: 'Half-Sleeve Cotton Panjabi',
    bn: 'হাফ-স্লিভ কটন পাঞ্জাবি',
    c: 'panjabi',
    s: SSS,
    price: 1290,
    disc: 990,
    stock: 68,
    f: true,
    d: 'A short-sleeve cotton panjabi for the days when the full-sleeve version is simply too hot. Side slits and a straight cut keep it comfortable through Jummah prayers and a long afternoon. Pre-washed cotton that softens with every wear.',
  },
  {
    t: 'Embroidered Silk Panjabi Eid Edition',
    bn: 'এমব্রয়ডারি সিল্ক পাঞ্জাবি',
    c: 'panjabi',
    b: 'aarong',
    s: SSS,
    price: 3500,
    disc: 2799,
    stock: 32,
    f: true,
    d: 'Our Eid panjabi: art silk with tone-on-tone thread embroidery running down the placket and around the collar band. It photographs beautifully and moves without a crackle. Comes on a hanger in a garment bag, ready to gift.',
  },
  {
    t: 'Full-Sleeve Slub Cotton Panjabi',
    c: 'panjabi',
    b: 'le-reve',
    s: SSS,
    price: 1890,
    disc: 1490,
    stock: 46,
    d: 'Slub cotton gives this panjabi a textured, hand-woven look while staying entirely machine washable. The mandarin collar sits neatly without a stiff interlining digging into the neck. A safe, sharp choice for any invitation.',
  },
  {
    t: 'Printed Cotton Panjabi with Chudidar',
    c: 'panjabi',
    s: SSS,
    price: 2450,
    disc: 1999,
    stock: 26,
    d: 'A two-piece set: a printed cotton panjabi with a matching chudidar pyjama, so you are not hunting for a bottom the night before Eid. The print is subtle enough for an older wearer and modern enough for a younger one. Both pieces are pre-shrunk.',
  },
  {
    t: 'Classic White Cotton Panjabi',
    c: 'panjabi',
    s: SSS,
    price: 1590,
    stock: 0,
    d: 'The plain white panjabi that never goes out of style — crisp cotton, mandarin collar, three-button placket. Every wardrobe in Bangladesh needs one and this is the one to own. Currently sold out; restocking before the next Eid.',
  },

  // ------------------------------------------------------------------ Kids Kurti
  {
    t: 'Girls Cotton Printed Kurti Set',
    c: 'kids-kurti',
    s: DFH,
    price: 890,
    disc: 690,
    stock: 55,
    d: 'A two-piece kurti and legging set in soft printed cotton, cut for real running-around. The neckline has no scratchy tag and the seams are flat-locked so nothing rubs. Machine wash and tumble dry without drama.',
  },
  {
    t: 'Kids Embroidered Anarkali Frock',
    c: 'kids-kurti',
    s: DFH,
    price: 1450,
    disc: 1150,
    stock: 38,
    d: 'A full-circle Anarkali frock with a lined bodice and a bit of net at the hem for twirl. The embroidery is machine-set but neatly finished, with no loose threads inside. Made for weddings, birthdays and being photographed.',
  },
  {
    t: 'Boys Cotton Panjabi Eid Special',
    c: 'kids-kurti',
    s: DFH,
    price: 1190,
    disc: 899,
    stock: 44,
    d: 'A miniature version of the grown-up panjabi, right down to the mandarin collar and the button placket. Soft cotton with a generous cut so it survives one more Eid as he grows. Pairs with the matching adult panjabi if you want the full family photo.',
  },
  {
    t: 'Girls Denim Dungaree Dress',
    c: 'kids-kurti',
    s: DFH,
    price: 1290,
    stock: 30,
    d: 'A light denim pinafore with adjustable shoulder straps that buy you another six months of wear. The front pocket is big enough for the collection of small rocks she will inevitably acquire. Wear over a tee or on its own.',
  },

  // --------------------------------------------------------------- Kids Footwear
  {
    t: 'Kids Velcro School Shoes',
    c: 'kids-footwear',
    s: SSS,
    price: 1190,
    disc: 949,
    stock: 47,
    d: 'Black school shoes with a wide velcro strap, because laces and a six-year-old are not a partnership. Non-marking rubber sole with real grip on a polished school corridor. Wipeable synthetic upper survives the monsoon walk.',
  },
  {
    t: 'Girls Party Ballerina Flats',
    c: 'kids-footwear',
    s: SSS,
    price: 890,
    stock: 41,
    d: 'Soft ballerina flats with an elastic top-line so they stay on while she is running. A small bow at the toe and a cushioned insole underneath. Light enough to dance in and cheap enough to replace when she outgrows them.',
  },
  {
    t: 'Kids Cartoon Rubber Sandals',
    c: 'kids-footwear',
    s: SSS,
    price: 550,
    stock: 0,
    d: 'One-piece moulded rubber sandals that are completely waterproof — hose them off and they look new. The back strap flips forward to become a clog. Currently out of stock; new sizes arriving shortly.',
  },

  // -------------------------------------------------------------- Baby Clothing
  {
    t: 'Newborn Cotton Romper Pack of 3',
    c: 'baby-clothing',
    s: CCC,
    price: 990,
    disc: 749,
    stock: 62,
    f: true,
    d: 'Three envelope-neck rompers in OEKO-TEX certified cotton, with press studs all the way down the inside leg for one-handed nappy changes at 3am. No dyes on the inside seams. Softens further after the first wash.',
  },
  {
    t: 'Baby Full-Sleeve Sleepsuit',
    c: 'baby-clothing',
    s: CCC,
    price: 650,
    stock: 58,
    d: 'A footed sleepsuit in brushed cotton interlock with fold-over mittens at the cuffs. Warm enough for an air-conditioned room without overheating. The studs are nickel-free and rounded so they never catch skin.',
  },
  {
    t: 'Baby Muslin Wrap Blanket',
    c: 'baby-clothing',
    s: CCC,
    price: 850,
    stock: 45,
    d: 'A generous 120cm square of double-gauze muslin — a swaddle, a burp cloth, a pram cover and a sunshade all at once. Gets softer and more absorbent with every wash. The one baby item nobody regrets buying two of.',
  },
  {
    t: 'Baby Winter Hoodie Set',
    c: 'baby-clothing',
    s: CCC,
    price: 1290,
    disc: 990,
    stock: 0,
    d: 'A fleece-lined hoodie and jogger set for the short, sharp Dhaka winter. The hood is lined so it is soft against the head, and the trouser cuffs are ribbed to keep the cold out. Sold out for this season — back in November.',
  },

  // ----------------------------------------------------------- Baby Accessories
  {
    t: 'Baby Cotton Bib Pack of 5',
    c: 'baby-accessories',
    s: CCC,
    price: 450,
    disc: 349,
    stock: 74,
    d: 'Five double-layer cotton bibs with a waterproof middle layer that actually stops the leak reaching the shirt. Adjustable press studs give you two sizes as the neck grows. Boil-wash safe.',
  },
  {
    t: 'Soft Baby Mittens and Booties Set',
    c: 'baby-accessories',
    s: CCC,
    price: 390,
    stock: 66,
    d: 'A matched mitten and bootie set in soft cotton knit, with gentle elastic that holds without leaving a mark on tiny wrists. Stops the newborn scratch-face phase before it starts. Comes in a gift-ready sleeve.',
  },
  {
    t: 'Baby Feeding Bottle 250ml BPA-Free',
    c: 'baby-accessories',
    s: CCC,
    price: 620,
    disc: 499,
    stock: 52,
    d: 'A 250ml polypropylene bottle with an anti-colic vent in the teat and clear volume markings that survive sterilising. Completely BPA-free and safe to boil, steam or use in a cold-water steriliser. Fits standard-neck teats you can buy anywhere.',
  },

  // ------------------------------------------------------------------- Skincare
  {
    t: 'COSRX Snail Mucin 96% Power Essence 100ml',
    c: 'skincare',
    b: 'cosrx',
    s: GBB,
    price: 1850,
    disc: 1499,
    stock: 43,
    f: true,
    d: 'The cult Korean essence — 96.3% snail secretion filtrate, nothing else doing the heavy lifting. It absorbs in seconds and leaves skin plump rather than sticky, which is why it survives Dhaka humidity. Imported directly; batch code and expiry printed on the box.',
  },
  {
    t: 'Gillette Fusion5 Shaving Foam 200ml',
    c: 'skincare',
    b: 'gillette',
    s: GBB,
    price: 620,
    disc: 499,
    stock: 61,
    d: 'A rich, low-irritation shaving foam that lifts the hair and cushions the blade, so you stop nicking the same spot on your jaw. Rinses clean without leaving a film in the basin. 200ml lasts an average shaver about two months.',
  },
  {
    t: 'Dove Deeply Nourishing Body Wash 500ml',
    c: 'skincare',
    b: 'dove',
    s: GBB,
    price: 890,
    disc: 699,
    stock: 57,
    d: 'A creamy, sulphate-mild body wash with Dove’s signature moisturising cream, so skin does not feel tight afterwards. Works on hard Dhaka tap water without leaving a residue. The 500ml pump is genuinely a few months of daily use.',
  },
  {
    t: 'Aveeno Daily Moisturising Lotion 354ml',
    c: 'skincare',
    b: 'aveeno',
    s: GBB,
    price: 1450,
    disc: 1190,
    stock: 35,
    d: 'Colloidal oatmeal in a fragrance-free base — the dermatologist standby for dry, reactive or eczema-prone skin. Non-greasy enough to wear under clothes in summer. Safe for the whole family, including children.',
  },
  {
    t: 'Bella Vita Vitamin C Face Serum 20ml',
    c: 'skincare',
    b: 'bella-vita',
    s: GBB,
    price: 950,
    disc: 699,
    stock: 48,
    d: 'A stabilised vitamin C serum aimed squarely at the dullness and uneven tone that come from sun and city dust. Lightweight and quick-absorbing, so it sits happily under sunscreen. Keep the bottle out of direct light to protect the actives.',
  },
  {
    t: 'Aloe Vera Soothing Gel 300ml',
    c: 'skincare',
    s: GBB,
    price: 550,
    stock: 70,
    d: 'A cooling multi-purpose aloe gel for sunburn, razor rash and post-shave sting. Ninety-two per cent aloe leaf juice, with no added colour. Keep the tub in the fridge in April and thank yourself later.',
  },
  {
    t: 'Niacinamide 10% Brightening Serum 30ml',
    c: 'skincare',
    s: GBB,
    price: 890,
    stock: 40,
    pending: true,
    d: 'A 10% niacinamide serum with 1% zinc, aimed at visible pores, oiliness and post-acne marks. Water-light texture that layers under anything without pilling. Introduce it slowly — every other night for the first two weeks.',
  },

  // --------------------------------------------------------------------- Makeup
  {
    t: 'Matte Liquid Lipstick Long Wear',
    c: 'makeup',
    s: GBB,
    price: 650,
    disc: 499,
    stock: 63,
    d: 'A transfer-resistant matte liquid lipstick that survives a cup of tea and a long meeting. The formula has vitamin E in it, so it does not turn your lips to sandpaper by evening. Two coats give you full opacity from the first swipe.',
  },
  {
    t: 'Waterproof Kajal Pencil Deep Black',
    c: 'makeup',
    s: GBB,
    price: 350,
    stock: 79,
    d: 'A genuinely smudge-proof kajal that holds its line through humidity, sweat and a monsoon downpour. The tip is soft enough to glide on the waterline without dragging. One pencil, one intense black, no compromise.',
  },
  {
    t: 'HD Compact Powder with SPF 15',
    c: 'makeup',
    s: GBB,
    price: 890,
    disc: 699,
    stock: 50,
    d: 'A finely milled pressed powder that controls shine without going cakey by lunchtime. SPF 15 is a useful top-up, though it is not a substitute for a proper sunscreen. Comes with a mirror and a decent puff rather than a token one.',
  },
  {
    t: '12-Colour Eyeshadow Palette',
    c: 'makeup',
    s: GBB,
    price: 1290,
    disc: 990,
    stock: 38,
    d: 'Twelve blendable shades — six matte, six shimmer — built around warm neutrals that flatter South Asian skin tones. The pigment payoff is high enough that you do not need a primer to see the colour. Compact enough to travel with.',
  },

  // ------------------------------------------------------------------- Haircare
  {
    t: 'Dove Intense Repair Shampoo 650ml',
    c: 'haircare',
    b: 'dove',
    s: GBB,
    price: 1090,
    disc: 849,
    stock: 59,
    f: true,
    d: 'A repairing shampoo aimed at hair that has been through heat, colour or one too many monsoons. It lathers well even in hard water and rinses out completely. The 650ml pump bottle is the best value size Dove makes.',
  },
  {
    t: 'Coconut and Amla Hair Oil 200ml',
    c: 'haircare',
    s: GBB,
    price: 420,
    disc: 329,
    stock: 77,
    d: 'Cold-pressed coconut oil infused with amla — the pre-wash oiling ritual every Bangladeshi grandmother swears by, and she is right. Warm it slightly, work it into the scalp, leave it an hour before shampooing. No mineral oil, no added fragrance.',
  },
  {
    t: 'Keratin Smooth Conditioner 340ml',
    c: 'haircare',
    s: GBB,
    price: 780,
    stock: 53,
    d: 'A silicone-light conditioner with hydrolysed keratin that smooths the cuticle instead of just coating it. Cuts drying time and takes the edge off frizz on a humid day. Leave it in for two minutes, not twenty.',
  },
  {
    t: 'Anti-Hairfall Herbal Hair Serum 100ml',
    c: 'haircare',
    s: GBB,
    price: 890,
    stock: 42,
    pending: true,
    d: 'A leave-in scalp serum built on bhringraj, rosemary and caffeine, applied to the roots rather than the lengths. Non-greasy, so you can use it in the morning and still go to work. Give it a full eight weeks before judging the result.',
  },

  // -------------------------------------------------------------------- Bedding
  {
    t: 'Cotton King-Size Bed Sheet Set with 2 Pillow Covers',
    c: 'bedding',
    s: CCC,
    price: 2450,
    disc: 1899,
    stock: 44,
    f: true,
    d: 'A king-size flat sheet with two matching pillow covers in 100% cotton, woven at a count that actually feels cool rather than papery. Reactive-dyed, so the colour survives repeated hot washes. Generously cut to tuck properly under a thick mattress.',
  },
  {
    t: 'Printed Single Bed Sheet Pure Cotton',
    c: 'bedding',
    s: CCC,
    price: 1290,
    stock: 56,
    d: 'A single bed sheet with one pillow cover, in a printed pure cotton that suits a hostel room or a child’s bed. Light enough to dry on a Dhaka balcony in an afternoon. Pre-shrunk, so the fit stays true.',
  },
  {
    t: 'Microfibre Pillow Pack of 2',
    c: 'bedding',
    s: CCC,
    price: 950,
    disc: 749,
    stock: 48,
    d: 'Two medium-loft microfibre pillows that bounce back instead of flattening into a pancake in a month. The shell is a tight cotton weave that keeps the fill where it belongs. Machine washable and quick to dry.',
  },
  {
    t: 'Quilted Cotton Comforter Queen',
    c: 'bedding',
    s: CCC,
    price: 3200,
    disc: 2599,
    stock: 25,
    d: 'A lightly quilted queen comforter with a cotton shell and a hollow-fibre fill — warm enough for December in Dhaka, not so warm that it is useless in March. Box quilting keeps the fill evenly spread. Comes in a reusable zip bag.',
  },

  // -------------------------------------------------------------------- Kitchen
  {
    t: 'Non-Stick Frying Pan 24cm',
    c: 'kitchen',
    s: CCC,
    price: 1290,
    disc: 990,
    stock: 46,
    d: 'A 24cm pan with a three-layer non-stick coating on a heavy forged base that will not warp on a high gas flame. The handle is riveted, not screwed, so it stays tight. PFOA-free coating; use a wooden spatula and it will last years.',
  },
  {
    t: 'Stainless Steel Pressure Cooker 3L',
    c: 'kitchen',
    s: CCC,
    price: 2650,
    disc: 2199,
    stock: 31,
    d: 'A 3-litre induction-and-gas compatible pressure cooker in food-grade stainless steel, with a triple-ply sandwich bottom that spreads heat evenly. Dal in twelve minutes, beef in thirty-five. Comes with a spare gasket and a safety valve.',
  },
  {
    t: 'Ceramic Dinner Set 18 Pieces',
    c: 'kitchen',
    s: CCC,
    price: 3500,
    disc: 2799,
    stock: 22,
    pending: true,
    d: 'An eighteen-piece ceramic set — six dinner plates, six side plates and six bowls — glazed in an off-white with a fine rim detail. Microwave and dishwasher safe, and heavy enough not to skid across the table. Packed in a moulded box that survives courier handling.',
  },
  {
    t: 'Insulated Stainless Steel Water Bottle 750ml',
    c: 'kitchen',
    s: CCC,
    price: 890,
    disc: 699,
    stock: 0,
    d: 'A double-walled vacuum bottle that keeps water cold for around twenty-four hours and tea hot for twelve. The lid is genuinely leak-proof, so it can live in a laptop bag. Currently out of stock — the next shipment lands in two weeks.',
  },
]

// -----------------------------------------------------------------------------
// Variant configuration by category
// -----------------------------------------------------------------------------
const COLORS = ['Maroon', 'Navy', 'Black', 'Off-White', 'Olive'] as const

const SIZES_BY_CATEGORY: Record<string, string[]> = {
  'women-bottom': ['S', 'M', 'L', 'XL'],
  'women-topwear': ['S', 'M', 'L', 'XL'],
  kurti: ['S', 'M', 'L', 'XL'],
  'men-topwear': ['S', 'M', 'L', 'XL'],
  'men-bottom': ['S', 'M', 'L', 'XL'],
  panjabi: ['S', 'M', 'L', 'XL'],
  'women-footwear': ['36', '37', '38', '39'],
  'men-footwear': ['39', '40', '41', '42'],
  'kids-footwear': ['28', '30', '32', '34'],
  'kids-kurti': ['2-3Y', '4-5Y', '6-7Y', '8-9Y'],
  'baby-clothing': ['0-3M', '3-6M', '6-12M', '12-18M'],
  sarees: [], // free size — colour only
}

/** Beauty, home and baby-accessory products intentionally have zero variants. */
const NO_VARIANT_CATEGORIES = new Set([
  'skincare',
  'makeup',
  'haircare',
  'bedding',
  'kitchen',
  'baby-accessories',
])

// -----------------------------------------------------------------------------
// Reviews
// -----------------------------------------------------------------------------
const POSITIVE_COMMENTS = [
  'Fabric quality is good, delivery was fast. Ordered on Sunday, got it Tuesday.',
  'Exactly like the picture. Colour is same as shown, no difference at all.',
  'Alhamdulillah, very happy with this purchase. Will order again from this seller.',
  'Stitching is neat and the finishing inside is clean. Worth the price.',
  'Bought it for Eid and everyone asked me where I got it from. Highly recommended.',
  'Delivery man called before coming, packaging was proper. Product is as described.',
  'Size chart is accurate. I took M and it fits perfectly, no need to alter.',
  'Material feels premium for this price range. Much better than New Market quality.',
  'Second time ordering from this shop. Consistent quality, never disappointed.',
  'Received within 3 days in Chittagong. Product is genuine, seal was intact.',
  'Comfortable to wear in this heat. Cotton is soft and does not stick to the body.',
  'Colour did not fade after two washes. Good quality dye.',
  'My wife loved it. Thank you Gulu Mulu for the fast delivery.',
  'Cash on delivery worked smoothly. Checked the product before paying, all good.',
  'Value for money. I will definitely recommend this to my colleagues.',
  'The embroidery work is very fine. Looks much more expensive than what I paid.',
  'Perfect for daily office use. Does not wrinkle much.',
  'Original product, I compared with the one I bought abroad. Same thing.',
  'Kids are happy with it, that is all I need. Good stitching, soft fabric.',
  'Packaging was neat and the product had no defects. Full marks.',
]

const NEUTRAL_COMMENTS = [
  'Product is okay for the price, but delivery took 5 days instead of 3.',
  'Quality is decent. Colour is slightly lighter than the photo but still nice.',
  'Fits fine but the fabric is a bit thinner than I expected. Still usable.',
  'Good product overall, though the packaging was a little damaged on arrival.',
  'It is fine. Not amazing, not bad. Does the job.',
  'Stitching is fine but the length runs a little short. Order one size up.',
]

const NEGATIVE_COMMENTS = [
  'Colour is different from the picture. Not what I expected, but the seller offered an exchange.',
  'Size was too small for me even though I followed the chart. Had to return it.',
  'Delivery was delayed by a week. The product itself is acceptable.',
]

// -----------------------------------------------------------------------------
// CMS pages
// -----------------------------------------------------------------------------
const PAGES: { slug: string; title: string; titleBn?: string; content: string }[] = [
  {
    slug: 'about-us',
    title: 'About Us',
    titleBn: 'আমাদের সম্পর্কে',
    content: `## Who we are

Gulu Mulu is a Bangladeshi multi-vendor marketplace. We do not own a single warehouse full of our own
stock — instead we give small and mid-sized Bangladeshi businesses a shopfront, a payment system and a
delivery network they could never afford to build alone.

When you buy on Gulu Mulu, you are buying from a real seller: a family-run tailoring unit in Keraniganj,
a cotton exporter in Chattogram, a weaver collective in Sylhet, a beauty importer in Gulshan. We handle
the checkout, the delivery and the customer protection. They handle the craft.

## Why we started

Bangladesh makes clothes for the world. Yet a shopper in Rangpur often pays more for a locally made shirt
than a shopper in London pays for the same shirt with a European label sewn into it. That gap exists
because the route from the maker to the customer is crowded with middlemen. We built Gulu Mulu to
shorten that route.

## How we protect you

* **Every seller is verified.** Trade licence and NID are checked by our team before a shop goes live.
* **Cash on delivery.** Open the parcel, check the product, then pay. Available across all 64 districts.
* **7-day return window.** If the item is not what was described, send it back.
* **No fake reviews.** A review can only be written against a delivered order.

## Where we are

Level 6, Rangs Babylonia, 246 Bir Uttam Mir Shawkat Sarak, Tejgaon, Dhaka 1208.
Support runs 9am–9pm, seven days a week, on **16xxx** and at **support@gulumulu.com.bd**.`,
  },
  {
    slug: 'return-refund-policy',
    title: 'Return & Refund Policy',
    titleBn: 'রিটার্ন ও রিফান্ড নীতি',
    content: `## Your right to return

You may request a return within **7 days of delivery** for any product that is damaged, defective,
materially different from its listing, or was delivered in the wrong size or colour by the seller.

Change-of-mind returns are accepted within 7 days **only** where the product is unused, unwashed, and
still carries its original tags and packaging.

## What cannot be returned

For hygiene and safety reasons the following are non-returnable unless they arrive damaged or the seal
is broken on arrival:

* Innerwear, socks and swimwear
* Cosmetics, skincare and haircare where the seal has been opened
* Baby feeding items where the packaging has been opened
* Custom-stitched or altered garments
* Items marked **Final Sale** on the product page

## How to raise a return

1. Go to **My Orders**, open the order, and press **Request Return** on the affected item.
2. Choose a reason and upload at least one clear photo of the issue.
3. We review within 48 hours and, if approved, arrange a free pickup from your delivery address.

## Your refund

Once the seller receives the item and our quality check passes, the refund is issued:

| Payment method | Refund route | Time |
|---|---|---|
| Cash on Delivery | bKash / Nagad / bank transfer | 5–7 working days |
| bKash / Nagad | Same wallet | 3–5 working days |
| Card (SSLCOMMERZ) | Original card | 7–10 working days |

Delivery fees are refunded in full when the fault lies with the seller or with us. On a change-of-mind
return, the original delivery fee is not refunded.

If a return is rejected after quality check, we send the item back to you at no charge and explain why.`,
  },
  {
    slug: 'exchange-policy',
    title: 'Exchange Policy',
    titleBn: 'এক্সচেঞ্জ নীতি',
    content: `## When you can exchange

An exchange is usually faster than a return-and-rebuy, and it is the right choice when the product is
correct but the **size or colour** is not. You may request an exchange within **7 days of delivery**,
provided the item is unused, unwashed, and still has its original tags.

## What you can exchange it for

You may exchange an item for:

* A different **size** of the same product
* A different **colour** of the same product
* A different product from the same seller of **equal or greater value** (you pay the difference)

You cannot exchange across sellers — each seller holds their own stock, so a cross-seller swap has to be
processed as a return plus a fresh order.

## Stock is not reserved

We cannot hold a size for you while an exchange is in transit. If your requested size sells out before we
receive your returned item, we will contact you and convert the exchange into a full refund.

## Delivery charges

* **Seller error** (wrong item sent, wrong size shipped, defect): both legs of the exchange are free.
* **Customer preference** (you simply want another size): the return leg is free, and the redelivery is
  charged at the standard delivery fee for your area.

## How to request one

Open **My Orders → the item → Request Exchange**, pick your replacement size or colour, and upload a
photo. Our rider collects the original item and hands you the replacement at the same visit wherever
stock and geography allow. Where a same-visit swap is not possible, the replacement ships within 3
working days of the original reaching the seller.`,
  },
  {
    slug: 'shipping-delivery-policy',
    title: 'Shipping & Delivery Policy',
    titleBn: 'শিপিং ও ডেলিভারি নীতি',
    content: `## Where we deliver

Gulu Mulu delivers to all **64 districts** of Bangladesh, including upazila-level addresses served by our
courier partners.

## Delivery times

| Zone | Estimated time | Delivery fee |
|---|---|---|
| Inside Dhaka city | 1–2 working days | ৳60 |
| Dhaka suburbs & Gazipur / Narayanganj | 2–3 working days | ৳80 |
| Chattogram, Sylhet, Khulna, Rajshahi metro | 2–4 working days | ৳120 |
| Other districts & upazilas | 3–6 working days | ৳120 |

Orders placed before **2:00pm** are picked up from the seller the same working day. Friday is a
non-dispatch day for most sellers, and government holidays add one working day.

## Multi-seller orders

Gulu Mulu is a marketplace, so one order can contain products from several sellers. Each seller ships
their own parcel, which means **your order may arrive in more than one delivery**. You are charged the
delivery fee **once per order**, not once per seller — we absorb the difference.

## Tracking

Every parcel gets a tracking status visible under **My Orders**. You will get an SMS when the parcel is
picked up and again when the rider is out for delivery.

## Failed deliveries

Our rider attempts delivery **twice**, and calls you before each attempt. If both attempts fail because
the number is unreachable or the address is wrong, the parcel returns to the seller and the order is
cancelled. Repeated failed COD deliveries may lead to COD being disabled on your account.

## Before you pay

On a Cash on Delivery order you may **open the parcel and check the product** in front of the rider. If
it is the wrong item or visibly damaged, refuse it and pay nothing.`,
  },
  {
    slug: 'cancellation-policy',
    title: 'Cancellation Policy',
    titleBn: 'অর্ডার বাতিল নীতি',
    content: `## Cancelling before dispatch

You may cancel an order **free of charge at any time before it has been dispatched**. Open **My Orders**,
select the order, and press **Cancel Order**. Cancellation is immediate and no fee is charged.

On a multi-seller order you may cancel an **individual item** without cancelling the whole order. The
order total, discount and delivery fee are recalculated automatically, and any coupon that no longer
meets its minimum order value will be removed.

## After dispatch

Once a parcel has left the seller and been handed to the courier, it can no longer be cancelled from the
app. You have two options:

1. **Refuse the parcel** at the door. Nothing is charged on a COD order.
2. **Accept it and raise a return** within 7 days under our Return & Refund Policy.

## When we cancel an order

We will cancel an order and refund you in full if:

* The seller confirms the item is out of stock after you ordered
* The listed price was materially wrong due to a pricing error
* Two delivery attempts fail and the parcel comes back to us
* We detect fraud, a fake address, or abuse of a coupon

## Refunds on cancellation

Prepaid orders (bKash, Nagad, card) are refunded to the original payment method within **3–7 working
days**. Cash on Delivery orders carry no charge, so nothing needs to be refunded.

## Repeated cancellations

We are a marketplace of small sellers, and a cancelled parcel costs them real money. Accounts that
repeatedly cancel after dispatch or refuse COD parcels may have Cash on Delivery withdrawn and be limited
to prepaid orders.`,
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    titleBn: 'গোপনীয়তা নীতি',
    content: `## What we collect

To run a marketplace we collect only what an order actually needs:

* **Your phone number** — this is your login. We do not use passwords; we send a one-time code by SMS.
* **Your name and delivery address** — passed to the rider so the parcel reaches you.
* **Your order history** — so you can reorder, review and raise returns.
* **Basic device and usage data** — pages viewed, searches made, so we can fix what is broken and show
  you products you might actually want.

We do **not** store your card number. Card payments go directly to SSLCOMMERZ, a Bangladesh Bank–licensed
payment gateway, and we only ever see a transaction reference.

## Who we share it with

* **The seller** of the item you bought — they see your name, phone and delivery address, and nothing
  else. They may not contact you for marketing.
* **Our delivery partners** — the same three fields, for the duration of the delivery.
* **Payment gateways** — bKash, Nagad and SSLCOMMERZ, to process and refund your payment.
* **Law enforcement** — only where we are legally obliged under Bangladeshi law.

We do not sell your data to anyone. Ever.

## Your rights

You may, at any time, ask us to:

* Show you every piece of data we hold about you
* Correct anything that is wrong
* Delete your account and personal data (we retain order records where tax law requires it)
* Stop sending you marketing SMS — reply STOP, or turn it off in **Account → Notifications**

## Security

Traffic is encrypted with TLS. Sessions are held in an httpOnly cookie that JavaScript cannot read.
Seller verification documents are stored separately from the shopping database.

## Contact

Data questions go to **privacy@gulumulu.com.bd**. We reply within 7 working days.`,
  },
  {
    slug: 'terms-conditions',
    title: 'Terms & Conditions',
    titleBn: 'শর্তাবলী',
    content: `## 1. Who you are contracting with

Gulu Mulu is a **marketplace**. When you buy a product, your contract of sale is with the **seller**
listed on the product page, not with Gulu Mulu. We provide the platform, take payment, arrange delivery
and enforce the buyer-protection policies set out on this site.

## 2. Your account

* You must be **18 or over** to buy on Gulu Mulu.
* Your account is tied to your mobile number and secured by a one-time code. Keep your phone secure —
  anyone with access to the OTP can place an order in your name.
* One person, one account. Duplicate accounts created to abuse first-order coupons will be closed.

## 3. Pricing and availability

All prices are in **Bangladeshi Taka (৳)** and include VAT where applicable. Sellers set their own
prices. If a product is listed at an obviously incorrect price, we may cancel the order and refund you
in full rather than honour the error.

Stock is not reserved until an order is placed, and in rare cases a seller may confirm they cannot fulfil
an item after checkout. You will be refunded in full.

## 4. Coupons

Coupons are single-use per account unless the coupon terms say otherwise, cannot be combined, and cannot
be exchanged for cash. Any coupon obtained through a duplicate account, a bot, or a leaked internal code
will be voided.

## 5. Reviews

You may only review a product you have actually received. Reviews containing abuse, phone numbers,
external links or content unrelated to the product will be removed.

## 6. Our liability

We are liable for the platform, the payment and the delivery. We are not liable for a seller's
manufacturing defects beyond the refund and return rights described in our Return & Refund Policy.

## 7. Governing law

These terms are governed by the laws of the People's Republic of Bangladesh, and the courts of Dhaka have
exclusive jurisdiction.`,
  },
  {
    slug: 'seller-policy',
    title: 'Seller Policy',
    titleBn: 'বিক্রেতা নীতি',
    content: `## Becoming a seller

Any registered Bangladeshi business may apply. To be approved you must submit:

* A valid **trade licence**
* The owner's **NID** (front and back)
* A **bank account or bKash merchant number** in the business name
* Your **TIN**, where your turnover requires one

Applications are reviewed within **3 working days**. Until you are approved your shop stays in
**Pending** and your products are not visible to shoppers.

## Commission

Gulu Mulu charges a commission on the **item value only** — never on the delivery fee. The rate is agreed
with you at onboarding and typically sits between **8% and 15%**, depending on category and volume. It is
shown on every order line in your dashboard, frozen at the moment of purchase, so a later rate change
never rewrites your history.

## Payouts

* Payouts run on a **weekly cycle**, closing Thursday midnight.
* Earnings become payable **7 days after an order is marked Delivered** — this covers the return window.
* Money is sent to your registered bank account or bKash merchant number. Payouts appear in your
  dashboard as Pending, then Processing, then Paid, with a reference number.

## What you must do

* Dispatch within **1 working day** of order confirmation.
* Describe products honestly. Photographs must be of the actual product you will ship.
* Never contact a customer for off-platform payment. This is grounds for immediate termination.
* Accept returns that fall within the marketplace Return & Refund Policy.

## Performance

We track cancellation rate, late-dispatch rate and return rate. Persistently poor metrics lead to reduced
search visibility, then suspension. Counterfeit goods lead to immediate permanent removal and forfeiture
of any pending payout.`,
  },
  {
    slug: 'product-policy',
    title: 'Product Policy',
    titleBn: 'পণ্য নীতি',
    content: `## Listing standards

Every product on Gulu Mulu must have:

* A **truthful title** — no keyword stuffing, no rival brand names, no ALL CAPS.
* At least **two real photographs** of the actual product on a clean background. Stock photos taken from
  a brand's website are only allowed for genuine branded goods you actually stock.
* An honest **description**, including fabric or ingredients, and a size chart for anything wearable.
* A **price in whole Taka**, VAT included. A strike-through price must be a price the item was genuinely
  sold at.

## Prohibited items

The following may never be listed:

* Counterfeit or replica branded goods ("master copy", "7A quality", and similar)
* Prescription medicines, supplements making medical claims, and unregistered cosmetics
* Weapons, ammunition, explosives and their imitations
* Tobacco, alcohol, and any controlled substance
* Live animals, wildlife products, ivory and other protected materials
* Stolen goods, or any item you do not have the legal right to sell
* Adult content, and anything that breaches Bangladeshi law

## Cosmetics and skincare

Beauty listings must state the **batch code and expiry date**, and imported stock must be backed by a
valid import invoice on request. Products with less than **6 months** of remaining shelf life may not be
listed at full price.

## Review and enforcement

New listings enter a **Pending** queue and are checked by our catalogue team, usually within 24 hours.
Listings can be rejected for poor photos, a misleading title, or a missing size chart — you will be told
exactly why and can resubmit.

Selling a counterfeit is not a first-warning offence. The listing is removed, the shop is suspended, and
any pending payout on that product is withheld.`,
  },
  {
    slug: 'pickup-delivery-policy',
    title: 'Pickup & Delivery Policy',
    titleBn: 'পিকআপ ও ডেলিভারি নীতি',
    content: `## For sellers: how pickup works

Once a customer's order is confirmed, it appears in your dashboard as **Ready to Pack**. You then:

1. Pack the item securely and print the Gulu Mulu shipping label from your dashboard.
2. Mark the order **Ready for Pickup** before **2:00pm**.
3. Hand the parcel to our rider, who collects daily from your registered pickup address.

Orders marked ready before 2:00pm are collected the **same working day**. Anything after that goes on the
next day's run. Friday is not a pickup day in most zones.

## Pickup coverage

We run our own pickup fleet inside Dhaka, Chattogram, Sylhet, Khulna and Rajshahi metro areas. Outside
those zones, sellers drop parcels at the nearest partner courier point and we reimburse the drop-off fee
against your next payout.

## Packaging standards

* Use a poly mailer or carton — never a loose plastic bag.
* Wrap fragile items (ceramics, glass bottles, cosmetics) in bubble wrap. A breakage caused by inadequate
  packaging is charged to the seller, not to the customer.
* Do not put promotional leaflets carrying your own phone number or external shop link inside the parcel.
  Attempting to take a customer off-platform is a terminable offence.

## Failed pickups

If the rider arrives and the parcel is not ready, the pickup is marked failed. Three failed pickups in a
month trigger a review of your shop's dispatch performance.

## Returns arriving back to you

Returned parcels are delivered back to your pickup address by the same fleet. Inspect the item within **48
hours** and either accept the return or raise a dispute with photographs. Silence after 48 hours counts as
acceptance and the customer is refunded.`,
  },
  {
    slug: 'seller-exchange-return-policy',
    title: 'Seller Exchange & Return Policy',
    titleBn: 'বিক্রেতা এক্সচেঞ্জ ও রিটার্ন নীতি',
    content: `## What sellers must accept

As a Gulu Mulu seller you agree to honour the marketplace Return & Refund Policy. You must accept a
return where the item is:

* **Damaged or defective** on arrival
* **Not as described** — wrong colour, wrong size, wrong item, missing components
* **Counterfeit or not genuine**, where you listed it as branded
* Returned within the **7-day change-of-mind window**, unused and with tags intact

## Who pays

| Reason for return | Return delivery | Refund of original delivery fee |
|---|---|---|
| Seller error or defect | Seller | Seller |
| Item not as described | Seller | Seller |
| Change of mind | Gulu Mulu absorbs pickup | Not refunded to customer |
| Courier damage in transit | Gulu Mulu | Gulu Mulu |

Where the fault is yours, the return delivery charge is deducted from your next payout, alongside the
refunded item value and the reversal of your commission line.

## Inspecting a returned item

You have **48 hours** from the moment the parcel is handed back to you to inspect it and either accept or
dispute the return. A dispute must include clear photographs — for example, showing the garment has been
worn, washed, or altered. Our team adjudicates within 3 working days and the decision is final.

If you do not respond within 48 hours, the return is auto-accepted and the customer is refunded.

## Commission on returns

Commission is **fully reversed** on any accepted return, including a change-of-mind return. You are never
charged commission on money you did not keep.

## Excessive returns

A return rate above **15%** over a rolling 60-day window triggers a listing quality review. The usual
cause is a misleading photograph or a missing size chart, and fixing the listing usually fixes the
returns.`,
  },
]

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------
async function main() {
  console.log('🧹  Wiping existing data...')
  await wipe()

  // ---------------------------------------------------------------- Users
  console.log('👤  Seeding users...')
  const admin = await prisma.user.create({
    data: {
      phone: ADMIN_PHONE,
      name: 'Gulu Mulu Admin',
      email: 'admin@gulumulu.com.bd',
      role: 'ADMIN',
      avatarUrl: 'https://picsum.photos/seed/gm-user-admin/200/200',
    },
  })

  const sellerUsers = new Map<string, string>() // phone -> userId
  for (const u of SELLER_USERS) {
    const created = await prisma.user.create({
      data: {
        phone: u.phone,
        name: u.name,
        email: u.email,
        role: 'SELLER',
        avatarUrl: `https://picsum.photos/seed/gm-user-${slugify(u.name)}/200/200`,
      },
    })
    sellerUsers.set(u.phone, created.id)
  }

  const customers: { id: string; phone: string; name: string }[] = []
  for (const u of CUSTOMER_USERS) {
    const created = await prisma.user.create({
      data: {
        phone: u.phone,
        name: u.name,
        email: u.email,
        role: 'CUSTOMER',
        avatarUrl: `https://picsum.photos/seed/gm-user-${slugify(u.name)}/200/200`,
      },
    })
    customers.push({ id: created.id, phone: created.phone, name: created.name! })
  }
  const demoCustomer = customers[0]

  // ---------------------------------------------------------------- Sellers
  console.log('🏪  Seeding sellers...')
  const sellerBySlug = new Map<string, { id: string; commissionRate: number; businessName: string }>()
  for (const s of SELLERS) {
    const created = await prisma.seller.create({
      data: {
        userId: sellerUsers.get(s.userPhone)!,
        businessName: s.businessName,
        slug: s.slug,
        logoUrl: `https://picsum.photos/seed/gm-shop-${s.slug}/300/300`,
        bannerUrl: `https://picsum.photos/seed/gm-shopbanner-${s.slug}/1600/400`,
        description: s.description,
        status: s.status,
        commissionRate: s.commissionRate,
        tradeLicenseNo: s.tradeLicenseNo,
        tradeLicenseUrl: `https://picsum.photos/seed/gm-doc-${s.slug}-tl/800/1100`,
        nidNumber: `19${randInt(70, 99)}${randInt(1000000000, 9999999999)}`,
        nidUrl: `https://picsum.photos/seed/gm-doc-${s.slug}-nid/800/500`,
        bankName: s.bankName,
        bankAccountName: s.businessName,
        bankAccountNumber: `${randInt(1000, 9999)}${randInt(1000000000, 9999999999)}`,
        bkashNumber: s.bkashNumber,
        rating: s.status === 'APPROVED' ? Math.round((3.9 + rnd() * 1.0) * 10) / 10 : 0,
        reviewCount: s.status === 'APPROVED' ? randInt(40, 260) : 0,
      },
    })
    sellerBySlug.set(s.slug, {
      id: created.id,
      commissionRate: created.commissionRate,
      businessName: created.businessName,
    })
  }

  // ---------------------------------------------------------------- Categories
  console.log('🗂️   Seeding categories...')
  const categoryBySlug = new Map<string, string>()
  let topOrder = 0
  for (const top of CATEGORY_TREE) {
    const parent = await prisma.category.create({
      data: {
        name: top.name,
        nameBn: top.nameBn,
        slug: top.slug,
        imageUrl: pickCategoryImage(top.slug),
        isFeatured: false,
        displayOrder: topOrder++,
      },
    })
    categoryBySlug.set(top.slug, parent.id)

    let childOrder = 0
    for (const child of top.children) {
      const c = await prisma.category.create({
        data: {
          name: child.name,
          nameBn: child.nameBn,
          slug: child.slug,
          imageUrl: pickCategoryImage(child.slug),
          parentId: parent.id,
          isFeatured: child.featured != null,
          displayOrder: child.featured ?? childOrder,
        },
      })
      categoryBySlug.set(child.slug, c.id)
      childOrder++
    }
  }

  // ---------------------------------------------------------------- Brands
  console.log('🏷️   Seeding brands...')
  const brandBySlug = new Map<string, string>()
  let brandOrder = 0
  for (const b of BRANDS) {
    const slug = slugify(b.name)
    const created = await prisma.brand.create({
      data: {
        name: b.name,
        slug,
        logoUrl: BRAND_IMAGES[brandOrder % BRAND_IMAGES.length],
        isFeatured: b.featured,
        displayOrder: brandOrder++,
      },
    })
    brandBySlug.set(slug, created.id)
  }

  // ---------------------------------------------------------------- Products
  console.log('📦  Seeding products, images and variants...')
  type SeededProduct = {
    id: string
    slug: string
    title: string
    price: number
    discountPrice: number | null
    sellerSlug: string
    approved: boolean
    stock: number
    image: string
    variants: { id: string; label: string | null }[]
  }
  const seededProducts: SeededProduct[] = []

  let skuCounter = 1000
  for (const p of PRODUCTS) {
    const slug = slugify(p.t)
    const sku = `GM-${String(skuCounter++)}`

    // Images: 2–4 category-appropriate, HTTP-verified Unsplash photos.
    const imageCount = randInt(2, 4)
    const images = Array.from({ length: imageCount }, (_, i) => ({
      url: productImageUrl(p.c, slug, i + 1),
      alt: `${p.t} — image ${i + 1}`,
      displayOrder: i,
    }))

    // Variants: clothing/footwear get real size + colour combinations.
    const sizes = SIZES_BY_CATEGORY[p.c]
    const wantsVariants = !NO_VARIANT_CATEGORIES.has(p.c) && sizes !== undefined
    let variantData: { size: string | null; color: string; stock: number; sku: string }[] = []

    if (wantsVariants) {
      const colors = pickSome(COLORS, randInt(2, 3))
      const sizeList = sizes.length ? sizes.slice(0, randInt(3, sizes.length)) : [null]
      const combos: { size: string | null; color: string }[] = []
      for (const size of sizeList) {
        for (const color of colors) combos.push({ size, color })
      }
      const stocks = distribute(p.stock, combos.length)
      variantData = combos.map((combo, i) => ({
        size: combo.size,
        color: combo.color,
        stock: stocks[i],
        sku: `${sku}-${(combo.size ?? 'FS').replace(/[^A-Za-z0-9]/g, '')}-${combo.color.slice(0, 3).toUpperCase()}`,
      }))
    }

    const created = await prisma.product.create({
      data: {
        title: p.t,
        titleBn: p.bn ?? null,
        slug,
        description: p.d,
        price: p.price,
        discountPrice: p.disc ?? null,
        sku,
        stock: p.stock,
        categoryId: categoryBySlug.get(p.c)!,
        brandId: p.b ? (brandBySlug.get(p.b) ?? null) : null,
        sellerId: sellerBySlug.get(p.s)!.id,
        status: p.pending ? 'PENDING' : 'APPROVED',
        isFeatured: p.f ?? false,
        rating: 0, // recomputed from real reviews below
        reviewCount: 0,
        soldCount: 0,
        createdAt: daysAgo(randInt(10, 180)),
        images: { create: images },
        variants: variantData.length ? { create: variantData } : undefined,
      },
      include: { variants: true },
    })

    seededProducts.push({
      id: created.id,
      slug,
      title: p.t,
      price: p.price,
      discountPrice: p.disc ?? null,
      sellerSlug: p.s,
      approved: !p.pending,
      stock: p.stock,
      image: images[0].url,
      variants: created.variants.map((v) => ({
        id: v.id,
        label: [v.size, v.color].filter(Boolean).join(' / ') || null,
      })),
    })
  }

  // ---------------------------------------------------------------- Addresses
  console.log('🏠  Seeding addresses...')
  const AREAS: Record<string, { division: string; district: string; areas: string[] }> = {
    dhaka: {
      division: 'Dhaka',
      district: 'Dhaka',
      areas: ['Dhanmondi', 'Gulshan', 'Mirpur', 'Uttara', 'Banani', 'Mohammadpur', 'Bashundhara R/A'],
    },
    ctg: {
      division: 'Chattogram',
      district: 'Chattogram',
      areas: ['Agrabad', 'Khulshi', 'Nasirabad', 'Pahartali'],
    },
    sylhet: {
      division: 'Sylhet',
      district: 'Sylhet',
      areas: ['Zindabazar', 'Uposhohor', 'Amberkhana'],
    },
  }

  const addressesByUser = new Map<string, { id: string; snapshot: Record<string, string> }[]>()
  const zoneKeys = Object.keys(AREAS)

  for (const c of customers) {
    const count = randInt(1, 2)
    const list: { id: string; snapshot: Record<string, string> }[] = []
    const usedZones = pickSome(zoneKeys, count)
    for (let i = 0; i < count; i++) {
      const zone = AREAS[usedZones[i] ?? 'dhaka']
      const area = pick(zone.areas)
      const addressLine = `House ${randInt(3, 88)}, Road ${randInt(1, 27)}, ${area}`
      const created = await prisma.address.create({
        data: {
          userId: c.id,
          label: i === 0 ? 'Home' : 'Office',
          fullName: c.name,
          phone: c.phone,
          division: zone.division,
          district: zone.district,
          area,
          addressLine,
          isDefault: i === 0,
        },
      })
      list.push({
        id: created.id,
        snapshot: {
          shipFullName: c.name,
          shipPhone: c.phone,
          shipDivision: zone.division,
          shipDistrict: zone.district,
          shipArea: area,
          shipAddressLine: addressLine,
        },
      })
    }
    addressesByUser.set(c.id, list)
  }

  // ---------------------------------------------------------------- Coupons
  console.log('🎟️   Seeding coupons...')
  const gm100 = await prisma.coupon.create({
    data: {
      code: 'GM100',
      type: 'FIXED',
      value: 100,
      minOrder: 999,
      usageLimit: 5000,
      usedCount: 412,
      expiresAt: daysFromNow(90),
      isActive: true,
    },
  })
  const new10 = await prisma.coupon.create({
    data: {
      code: 'NEW10',
      type: 'PERCENT',
      value: 10,
      minOrder: 500,
      maxDiscount: 300,
      usageLimit: 10000,
      usedCount: 1873,
      expiresAt: daysFromNow(180),
      isActive: true,
    },
  })
  const eidsale = await prisma.coupon.create({
    data: {
      code: 'EIDSALE',
      type: 'PERCENT',
      value: 15,
      minOrder: 1500,
      maxDiscount: 500,
      usageLimit: 3000,
      usedCount: 2914,
      expiresAt: daysAgo(12), // expired
      isActive: true,
    },
  })
  await prisma.coupon.create({
    data: {
      code: 'FREESHIP',
      type: 'FIXED',
      value: 60,
      minOrder: 700,
      usageLimit: 2000,
      usedCount: 640,
      expiresAt: daysFromNow(45),
      isActive: false, // paused by admin
    },
  })
  const couponBag = { GM100: gm100, NEW10: new10, EIDSALE: eidsale }

  // ---------------------------------------------------------------- Orders
  console.log('🧾  Seeding orders (multi-vendor, with commission splits)...')
  const buyable = seededProducts.filter((p) => p.approved)
  const bySlug = new Map(seededProducts.map((p) => [p.slug, p]))

  function effective(p: SeededProduct): number {
    return p.discountPrice != null && p.discountPrice < p.price ? p.discountPrice : p.price
  }

  type OrderPlan = {
    customerIdx: number
    productSlugs: string[]
    status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
    paymentMethod: 'COD' | 'SSLCOMMERZ' | 'BKASH' | 'NAGAD'
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
    ago: number
    coupon?: keyof typeof couponBag
    deliveryFee: number
  }

  // Each plan deliberately spans MULTIPLE sellers — that is the point of multi-vendor.
  const ORDER_PLANS: OrderPlan[] = [
    {
      customerIdx: 0,
      productSlugs: [
        'cotton-embroidered-salwar-kameez-3-piece',
        'cosrx-snail-mucin-96-power-essence-100ml',
        'handcrafted-leather-sandals',
      ],
      status: 'DELIVERED',
      paymentMethod: 'BKASH',
      paymentStatus: 'PAID',
      ago: 54,
      coupon: 'GM100',
      deliveryFee: 60,
    },
    {
      customerIdx: 0,
      productSlugs: ['half-sleeve-cotton-panjabi', 'dove-intense-repair-shampoo-650ml'],
      status: 'DELIVERED',
      paymentMethod: 'COD',
      paymentStatus: 'PAID',
      ago: 41,
      deliveryFee: 60,
    },
    {
      customerIdx: 0,
      productSlugs: [
        'jamdani-handloom-saree-traditional-motif',
        'matte-liquid-lipstick-long-wear',
        'cotton-king-size-bed-sheet-set-with-2-pillow-covers',
      ],
      status: 'SHIPPED',
      paymentMethod: 'SSLCOMMERZ',
      paymentStatus: 'PAID',
      ago: 6,
      coupon: 'NEW10',
      deliveryFee: 60,
    },
    {
      customerIdx: 0,
      productSlugs: ['straight-cut-printed-kurti', 'aloe-vera-soothing-gel-300ml'],
      status: 'PENDING',
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      ago: 1,
      deliveryFee: 60,
    },
    {
      customerIdx: 1,
      productSlugs: [
        'slim-fit-formal-cotton-shirt',
        'genuine-leather-formal-shoes',
        'gillette-fusion5-shaving-foam-200ml',
      ],
      status: 'DELIVERED',
      paymentMethod: 'SSLCOMMERZ',
      paymentStatus: 'PAID',
      ago: 33,
      coupon: 'EIDSALE',
      deliveryFee: 120,
    },
    {
      customerIdx: 1,
      productSlugs: ['slim-fit-stretch-denim-jeans', 'casual-canvas-sneakers'],
      status: 'CONFIRMED',
      paymentMethod: 'BKASH',
      paymentStatus: 'PAID',
      ago: 3,
      deliveryFee: 120,
    },
    {
      customerIdx: 2,
      productSlugs: [
        'anarkali-georgette-kurti-with-dupatta',
        'embellished-party-heels',
        '12-colour-eyeshadow-palette',
      ],
      status: 'DELIVERED',
      paymentMethod: 'COD',
      paymentStatus: 'PAID',
      ago: 47,
      deliveryFee: 60,
    },
    {
      customerIdx: 2,
      productSlugs: ['soft-katan-silk-saree-deep-maroon', 'hd-compact-powder-with-spf-15'],
      status: 'CANCELLED',
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      ago: 21,
      deliveryFee: 60,
    },
    {
      customerIdx: 3,
      productSlugs: [
        'embroidered-silk-panjabi-eid-edition',
        'boys-cotton-panjabi-eid-special',
        'stainless-steel-pressure-cooker-3l',
      ],
      status: 'DELIVERED',
      paymentMethod: 'NAGAD',
      paymentStatus: 'PAID',
      ago: 29,
      coupon: 'GM100',
      deliveryFee: 120,
    },
    {
      customerIdx: 3,
      productSlugs: ['cotton-chino-pants', 'coconut-and-amla-hair-oil-200ml'],
      status: 'PROCESSING',
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      ago: 2,
      deliveryFee: 80,
    },
    {
      customerIdx: 4,
      productSlugs: [
        'newborn-cotton-romper-pack-of-3',
        'baby-cotton-bib-pack-of-5',
        'girls-cotton-printed-kurti-set',
      ],
      status: 'DELIVERED',
      paymentMethod: 'BKASH',
      paymentStatus: 'PAID',
      ago: 16,
      deliveryFee: 60,
    },
    {
      customerIdx: 4,
      productSlugs: [
        'non-stick-frying-pan-24cm',
        'quilted-cotton-comforter-queen',
        'keratin-smooth-conditioner-340ml',
      ],
      status: 'SHIPPED',
      paymentMethod: 'SSLCOMMERZ',
      paymentStatus: 'PAID',
      ago: 5,
      deliveryFee: 60,
    },
  ]

  const soldByProduct = new Map<string, number>()
  const deliveredOrderItems: { orderItemId: string; productId: string; userId: string }[] = []
  const orderNumbers = new Set<string>()

  function nextOrderNumber(): string {
    const alphabet = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    for (;;) {
      let out = ''
      for (let i = 0; i < 6; i++) out += alphabet[Math.floor(rnd() * alphabet.length)]
      const n = `GM-${out}`
      if (!orderNumbers.has(n)) {
        orderNumbers.add(n)
        return n
      }
    }
  }

  for (const plan of ORDER_PLANS) {
    const customer = customers[plan.customerIdx]
    const addr = pick(addressesByUser.get(customer.id)!)

    const lines = plan.productSlugs
      .map((s) => bySlug.get(s))
      .filter((p): p is SeededProduct => Boolean(p))
      .map((p) => {
        const qty = randInt(1, 2)
        const unitPrice = effective(p)
        const lineTotal = unitPrice * qty
        const seller = sellerBySlug.get(p.sellerSlug)!
        const commissionRate = seller.commissionRate
        const commissionAmount = Math.round(lineTotal * commissionRate)
        const sellerEarning = lineTotal - commissionAmount
        const variant = p.variants.length ? pick(p.variants) : null
        return {
          product: p,
          sellerId: seller.id,
          variantId: variant?.id ?? null,
          variantLabel: variant?.label ?? null,
          unitPrice,
          quantity: qty,
          lineTotal,
          commissionRate,
          commissionAmount,
          sellerEarning,
        }
      })

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0)

    // Discount, computed the same way checkout does it.
    let discount = 0
    const coupon = plan.coupon ? couponBag[plan.coupon] : null
    if (coupon && subtotal >= coupon.minOrder) {
      if (coupon.type === 'PERCENT') {
        const raw = Math.round((subtotal * coupon.value) / 100)
        discount = coupon.maxDiscount != null ? Math.min(raw, coupon.maxDiscount) : raw
      } else {
        discount = Math.min(coupon.value, subtotal)
      }
    }

    const total = subtotal + plan.deliveryFee - discount
    const placedAt = daysAgo(plan.ago)

    const order = await prisma.order.create({
      data: {
        orderNumber: nextOrderNumber(),
        userId: customer.id,
        addressId: addr.id,
        shipFullName: addr.snapshot.shipFullName,
        shipPhone: addr.snapshot.shipPhone,
        shipDivision: addr.snapshot.shipDivision,
        shipDistrict: addr.snapshot.shipDistrict,
        shipArea: addr.snapshot.shipArea,
        shipAddressLine: addr.snapshot.shipAddressLine,
        subtotal,
        deliveryFee: plan.deliveryFee,
        discount,
        total,
        paymentMethod: plan.paymentMethod,
        paymentStatus: plan.paymentStatus,
        status: plan.status,
        transactionId:
          plan.paymentStatus === 'PAID' && plan.paymentMethod !== 'COD'
            ? `TXN${randInt(100000000, 999999999)}`
            : null,
        couponId: discount > 0 && coupon ? coupon.id : null,
        placedAt,
        items: {
          create: lines.map((l) => ({
            productId: l.product.id,
            variantId: l.variantId,
            sellerId: l.sellerId,
            titleSnapshot: l.product.title,
            imageSnapshot: l.product.image,
            variantLabel: l.variantLabel,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            lineTotal: l.lineTotal,
            commissionRate: l.commissionRate,
            commissionAmount: l.commissionAmount,
            sellerEarning: l.sellerEarning,
            status: plan.status,
          })),
        },
      },
      include: { items: true },
    })

    if (plan.status !== 'CANCELLED') {
      for (const l of lines) {
        soldByProduct.set(
          l.product.id,
          (soldByProduct.get(l.product.id) ?? 0) + l.quantity,
        )
      }
    }
    if (plan.status === 'DELIVERED') {
      for (const item of order.items) {
        deliveredOrderItems.push({
          orderItemId: item.id,
          productId: item.productId,
          userId: customer.id,
        })
      }
    }
  }

  // ---------------------------------------------------------------- Reviews
  console.log('⭐  Seeding reviews...')

  type DraftReview = {
    productId: string
    userId: string
    orderItemId: string | null
    rating: number
    createdAt: Date
  }

  const reviewKeys = new Set<string>() // `${userId}:${productId}` — one review per user per product
  const draftsByProduct = new Map<string, DraftReview[]>()

  function addDraft(d: DraftReview): boolean {
    const key = `${d.userId}:${d.productId}`
    if (reviewKeys.has(key)) return false
    reviewKeys.add(key)
    const list = draftsByProduct.get(d.productId) ?? []
    list.push(d)
    draftsByProduct.set(d.productId, list)
    return true
  }

  /** Positive-skewed, the way a marketplace's review mix actually looks. */
  function rollRating(): number {
    const r = rnd()
    if (r < 0.58) return 5
    if (r < 0.86) return 4
    if (r < 0.95) return 3
    if (r < 0.985) return 2
    return 1
  }

  function commentFor(rating: number): string {
    if (rating >= 4) return pick(POSITIVE_COMMENTS)
    if (rating === 3) return pick(NEUTRAL_COMMENTS)
    return pick(NEGATIVE_COMMENTS)
  }

  // Verified-purchase reviews: one per delivered order item, linked back to that item.
  for (const d of deliveredOrderItems) {
    addDraft({
      productId: d.productId,
      userId: d.userId,
      orderItemId: d.orderItemId,
      rating: rollRating(),
      createdAt: daysAgo(randInt(1, 25)),
    })
  }

  // Top every approved product up to a believable number of reviews (1–4).
  for (const p of buyable) {
    const target = randInt(1, 4)
    for (let i = 0; i < target; i++) {
      addDraft({
        productId: p.id,
        userId: pick(customers).id,
        orderItemId: null,
        rating: rollRating(),
        createdAt: daysAgo(randInt(1, 120)),
      })
    }
  }

  // A product whose average lands below 3.5 would look broken next to its own star bar,
  // so lift its weakest review until the average is believable. The rows stay real — the
  // aggregate below is still recomputed from exactly these rows, never faked.
  for (const drafts of draftsByProduct.values()) {
    const mean = () => drafts.reduce((a, d) => a + d.rating, 0) / drafts.length
    while (mean() < 3.5) {
      const weakest = drafts.reduce((lo, d) => (d.rating < lo.rating ? d : lo), drafts[0])
      weakest.rating = Math.min(5, weakest.rating + 1)
    }
  }

  let reviewCount = 0
  for (const drafts of draftsByProduct.values()) {
    for (const d of drafts) {
      await prisma.review.create({
        data: {
          productId: d.productId,
          userId: d.userId,
          orderItemId: d.orderItemId,
          rating: d.rating,
          comment: commentFor(d.rating), // comment tone always matches the final star count
          createdAt: d.createdAt,
        },
      })
      reviewCount++
    }
  }

  // ------------------------------------------------- Recompute product aggregates
  // The numbers on screen must match the reviews you can actually read on the page.
  console.log('🧮  Recomputing product rating / reviewCount / soldCount from real rows...')
  const grouped = await prisma.review.groupBy({
    by: ['productId'],
    _avg: { rating: true },
    _count: { _all: true },
  })
  const statsByProduct = new Map(
    grouped.map((g) => [g.productId, { avg: g._avg.rating ?? 0, count: g._count._all }]),
  )

  for (const p of seededProducts) {
    const stats = statsByProduct.get(p.id)
    const rating = stats ? Math.round(stats.avg * 10) / 10 : 0
    const rCount = stats?.count ?? 0
    // Sold count must always be at least the number of people who reviewed it,
    // plus the units actually moved by the seeded orders.
    const ordered = soldByProduct.get(p.id) ?? 0
    const soldCount = p.approved ? Math.max(ordered + rCount * randInt(3, 11), rCount) : ordered

    await prisma.product.update({
      where: { id: p.id },
      data: { rating, reviewCount: rCount, soldCount },
    })
  }

  // ---------------------------------------------------------------- Payouts
  console.log('💸  Seeding payouts...')
  let payoutCount = 0
  for (const s of SELLERS.filter((x) => x.status === 'APPROVED')) {
    const seller = sellerBySlug.get(s.slug)!
    const cycles = randInt(2, 3)
    for (let i = 0; i < cycles; i++) {
      const periodEnd = daysAgo(7 + i * 14)
      const periodStart = new Date(periodEnd)
      periodStart.setDate(periodStart.getDate() - 13)
      const paid = i > 0 // the most recent cycle is still pending
      await prisma.payout.create({
        data: {
          sellerId: seller.id,
          amount: randInt(8000, 96000),
          status: paid ? 'PAID' : 'PENDING',
          periodStart,
          periodEnd,
          paidAt: paid ? daysAgo(5 + i * 14) : null,
          reference: paid ? `PO-${randInt(100000, 999999)}` : null,
        },
      })
      payoutCount++
    }
  }

  // ---------------------------------------------------------------- Wishlist
  console.log('❤️   Seeding wishlist...')
  const wishlistSlugs = [
    'lawn-3-piece-unstitched-suit',
    'half-silk-saree-with-zari-border',
    'aveeno-daily-moisturising-lotion-354ml',
    'everyday-cushioned-flats',
    'quilted-cotton-comforter-queen',
    'bella-vita-vitamin-c-face-serum-20ml',
  ]
  let wishlistCount = 0
  for (const slug of wishlistSlugs) {
    const p = bySlug.get(slug)
    if (!p) continue
    await prisma.wishlistItem.create({
      data: { userId: demoCustomer.id, productId: p.id, createdAt: daysAgo(randInt(1, 40)) },
    })
    wishlistCount++
  }

  // ---------------------------------------------------------------- Banners
  console.log('🖼️   Seeding banners...')
  const BANNERS = [
    {
      title: 'Eid Collection 2026 — Up to 50% Off',
      subtitle: 'Panjabis, sarees and three-pieces from 40+ Bangladeshi sellers. Free delivery over ৳1,499.',
      imageUrl: HERO_BANNERS[0],
      linkUrl: '/c/panjabi',
      placement: 'HERO' as const,
      displayOrder: 0,
    },
    {
      title: 'Handloom Week — Jamdani, Katan & Tangail',
      subtitle: 'Woven in Rupganj, Sylhet and Tangail. Straight from the loom, no middleman.',
      imageUrl: HERO_BANNERS[1],
      linkUrl: '/c/sarees',
      placement: 'HERO' as const,
      displayOrder: 1,
    },
    {
      title: 'Beauty Fest — 100% Authentic, Batch Verified',
      subtitle: 'COSRX, Dove, Aveeno and more. Every listing shows its expiry date.',
      imageUrl: HERO_BANNERS[2],
      linkUrl: '/c/skincare',
      placement: 'HERO' as const,
      displayOrder: 2,
    },
    {
      title: 'Cash on Delivery, All 64 Districts',
      subtitle: 'Open the parcel. Check it. Then pay.',
      imageUrl: SECONDARY_BANNERS[0],
      linkUrl: '/p/shipping-delivery-policy',
      placement: 'SECONDARY' as const,
      displayOrder: 0,
    },
    {
      title: 'Sell on Gulu Mulu — 0 Setup Fee',
      subtitle: 'Commission from 8%. Weekly payouts to bKash or bank.',
      imageUrl: SECONDARY_BANNERS[1],
      linkUrl: '/seller/register',
      placement: 'SECONDARY' as const,
      displayOrder: 1,
    },
  ]
  for (const b of BANNERS) {
    await prisma.banner.create({ data: { ...b, isActive: true } })
  }

  // ---------------------------------------------------------------- Collections
  console.log('🎯  Seeding budget collections...')
  const COLLECTIONS: {
    label: string
    labelBn: string
    priceMax: number
    categorySlug?: string
    brandSlug?: string
    imageUrl: string
    displayOrder: number
  }[] = [
    {
      label: 'Beauty Items Under ৳999',
      labelBn: '৯৯৯ টাকার নিচে বিউটি আইটেম',
      priceMax: 999,
      categorySlug: 'skincare',
      imageUrl: pickCollectionImage('beauty'),
      displayOrder: 0,
    },
    {
      label: 'Classic Time Under ৳950',
      labelBn: '৯৫০ টাকার নিচে ক্লাসিক',
      priceMax: 950,
      categorySlug: 'makeup',
      imageUrl: pickCollectionImage('beauty'),
      displayOrder: 1,
    },
    {
      label: 'Ready Carry Under ৳1599',
      labelBn: '১৫৯৯ টাকার নিচে রেডি ক্যারি',
      priceMax: 1599,
      categorySlug: 'women-topwear',
      imageUrl: pickCategoryImage('women-topwear'),
      displayOrder: 2,
    },
    {
      label: 'Panjabi Under ৳1999',
      labelBn: '১৯৯৯ টাকার নিচে পাঞ্জাবি',
      priceMax: 1999,
      categorySlug: 'panjabi',
      imageUrl: pickCollectionImage('panjabi'),
      displayOrder: 3,
    },
    {
      label: 'Step Out Under ৳1499',
      labelBn: '১৪৯৯ টাকার নিচে জুতা',
      priceMax: 1499,
      categorySlug: 'women-footwear',
      imageUrl: pickCategoryImage('women-footwear'),
      displayOrder: 4,
    },
    {
      label: 'Le Reve Picks Under ৳1499',
      labelBn: '১৪৯৯ টাকার নিচে লা রিভ',
      priceMax: 1499,
      brandSlug: 'le-reve',
      imageUrl: pickCollectionImage('bags'),
      displayOrder: 5,
    },
  ]
  for (const c of COLLECTIONS) {
    await prisma.collection.create({
      data: {
        label: c.label,
        labelBn: c.labelBn,
        imageUrl: c.imageUrl,
        priceMax: c.priceMax,
        categoryId: c.categorySlug ? categoryBySlug.get(c.categorySlug)! : null,
        brandId: c.brandSlug ? brandBySlug.get(c.brandSlug)! : null,
        displayOrder: c.displayOrder,
        isActive: true,
      },
    })
  }

  // ---------------------------------------------------------------- CMS pages
  console.log('📄  Seeding CMS pages...')
  for (const p of PAGES) {
    await prisma.page.create({
      data: {
        slug: p.slug,
        title: p.title,
        titleBn: p.titleBn ?? null,
        content: p.content,
        isPublished: true,
      },
    })
  }

  // ---------------------------------------------------------------- Summary
  const counts = {
    users: await prisma.user.count(),
    sellers: await prisma.seller.count(),
    sellersApproved: await prisma.seller.count({ where: { status: 'APPROVED' } }),
    sellersPending: await prisma.seller.count({ where: { status: 'PENDING' } }),
    categories: await prisma.category.count(),
    categoriesFeatured: await prisma.category.count({ where: { isFeatured: true } }),
    brands: await prisma.brand.count(),
    products: await prisma.product.count(),
    productsApproved: await prisma.product.count({ where: { status: 'APPROVED' } }),
    productsPending: await prisma.product.count({ where: { status: 'PENDING' } }),
    productsOutOfStock: await prisma.product.count({ where: { stock: 0 } }),
    productsFeatured: await prisma.product.count({ where: { isFeatured: true } }),
    productImages: await prisma.productImage.count(),
    productVariants: await prisma.productVariant.count(),
    reviews: await prisma.review.count(),
    addresses: await prisma.address.count(),
    coupons: await prisma.coupon.count(),
    banners: await prisma.banner.count(),
    collections: await prisma.collection.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    payouts: await prisma.payout.count(),
    wishlist: await prisma.wishlistItem.count(),
    pages: await prisma.page.count(),
  }

  const gmv = await prisma.order.aggregate({ _sum: { total: true } })
  const commission = await prisma.orderItem.aggregate({ _sum: { commissionAmount: true } })

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  Gulu Mulu — demo data seeded                            ║
╚══════════════════════════════════════════════════════════╝

  Users             ${counts.users}   (1 admin, ${SELLER_USERS.length} sellers, ${CUSTOMER_USERS.length} customers)
  Sellers           ${counts.sellers}   (${counts.sellersApproved} approved, ${counts.sellersPending} pending → admin queue)
  Categories        ${counts.categories}  (${counts.categoriesFeatured} featured for the quick-nav strip)
  Brands            ${counts.brands}
  Products          ${counts.products}  (${counts.productsApproved} approved, ${counts.productsPending} pending → admin queue)
                    ${counts.productsFeatured} featured, ${counts.productsOutOfStock} out of stock
  Product images    ${counts.productImages}
  Product variants  ${counts.productVariants}
  Reviews           ${counts.reviews}  (product rating + reviewCount recomputed from these)
  Addresses         ${counts.addresses}
  Coupons           ${counts.coupons}  (GM100, NEW10, EIDSALE — expired, FREESHIP — inactive)
  Banners           ${counts.banners}  (3 hero, 2 secondary)
  Collections       ${counts.collections}  ("Shop Under ৳X" cards)
  Orders            ${counts.orders}  → ${counts.orderItems} order items across multiple sellers
  Payouts           ${counts.payouts}
  Wishlist items    ${counts.wishlist}
  CMS pages         ${counts.pages}

  Seeded GMV        ৳${(gmv._sum.total ?? 0).toLocaleString('en-US')}
  Commission earned ৳${(commission._sum.commissionAmount ?? 0).toLocaleString('en-US')}

  ── Demo logins (OTP in dev is always 123456) ─────────────
  Admin      01700000001   Gulu Mulu Admin
  Seller     01700000002   Rahim Uddin  (Dhaka Fashion House — approved)
  Customer   01700000003   Ayesha Karim
`)

  void reviewCount
  void payoutCount
  void wishlistCount
  void admin
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌  Seed failed:')
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
