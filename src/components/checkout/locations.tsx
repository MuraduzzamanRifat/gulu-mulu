/**
 * Bangladesh's 8 divisions and all 64 districts.
 *
 * Data only — no JSX, no 'use client', no server imports. That is deliberate: the address FORM is
 * a client component and needs the cascade, while the address Server Action needs to re-validate
 * that a submitted district really belongs to its submitted division. Both import from here, so
 * the two can never disagree.
 *
 * NOTE: only the DISTRICT reaches the money. `calcDeliveryFee()` in '@/lib/pricing' charges ৳60
 * inside Dhaka and ৳120 everywhere else, matching on the district string. Names below are the
 * current official romanisations (Chattogram, not Chittagong; Cumilla, not Comilla) — and "Dhaka"
 * is spelled exactly as `DHAKA_ALIASES` in the pricing engine expects it, or every Dhaka customer
 * would silently be over-charged ৳60.
 */

export interface Division {
  name: string
  districts: readonly string[]
}

export const BD_DIVISIONS: readonly Division[] = [
  {
    name: 'Dhaka',
    districts: [
      'Dhaka',
      'Faridpur',
      'Gazipur',
      'Gopalganj',
      'Kishoreganj',
      'Madaripur',
      'Manikganj',
      'Munshiganj',
      'Narayanganj',
      'Narsingdi',
      'Rajbari',
      'Shariatpur',
      'Tangail',
    ],
  },
  {
    name: 'Chattogram',
    districts: [
      'Bandarban',
      'Brahmanbaria',
      'Chandpur',
      'Chattogram',
      'Cumilla',
      "Cox's Bazar",
      'Feni',
      'Khagrachhari',
      'Lakshmipur',
      'Noakhali',
      'Rangamati',
    ],
  },
  {
    name: 'Khulna',
    districts: [
      'Bagerhat',
      'Chuadanga',
      'Jashore',
      'Jhenaidah',
      'Khulna',
      'Kushtia',
      'Magura',
      'Meherpur',
      'Narail',
      'Satkhira',
    ],
  },
  {
    name: 'Rajshahi',
    districts: [
      'Bogura',
      'Chapainawabganj',
      'Joypurhat',
      'Naogaon',
      'Natore',
      'Pabna',
      'Rajshahi',
      'Sirajganj',
    ],
  },
  {
    name: 'Barishal',
    districts: ['Barguna', 'Barishal', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur'],
  },
  {
    name: 'Sylhet',
    districts: ['Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet'],
  },
  {
    name: 'Rangpur',
    districts: [
      'Dinajpur',
      'Gaibandha',
      'Kurigram',
      'Lalmonirhat',
      'Nilphamari',
      'Panchagarh',
      'Rangpur',
      'Thakurgaon',
    ],
  },
  {
    name: 'Mymensingh',
    districts: ['Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur'],
  },
] as const

export const DIVISION_NAMES: readonly string[] = BD_DIVISIONS.map((division) => division.name)

/** Districts in a division. Empty array for an unknown division — never undefined, so `.map()` is safe. */
export function districtsOf(division: string): readonly string[] {
  return BD_DIVISIONS.find((d) => d.name === division)?.districts ?? []
}

/**
 * The pair check the Server Action runs. A client that posts
 * `{ division: 'Sylhet', district: 'Dhaka' }` is trying to buy ৳60 delivery to Sylhet — Zod alone
 * would wave it through, because each field is individually a valid string.
 */
export function isValidDivisionDistrict(division: string, district: string): boolean {
  return districtsOf(division).includes(district)
}
