/**
 * The payment methods Gulu Mulu offers, and what the customer is told about each.
 *
 * Data only — no secrets, no `process.env`, no `fetch`. Safe to import from a client component
 * (which `PaymentStep` does). The gateway credentials live in ./sslcommerz.ts, which must NEVER
 * cross the client boundary.
 *
 * ORDERING IS A PRODUCT DECISION, NOT A COSMETIC ONE.
 * Cash on Delivery is first and is the default. In Bangladesh COD is not a fallback — it is how
 * the large majority of e-commerce orders are actually paid, because trust in online payment is
 * still being earned and many shoppers have no card at all. Burying it under three digital wallets
 * is how a BD marketplace loses its cart.
 */
import { PaymentMethod } from '@/generated/prisma/client'

export interface PaymentMethodOption {
  method: PaymentMethod
  label: string
  /** One line under the label. Says what will actually happen next. */
  description: string
  /** Short flag, e.g. "Most popular". Null when there's nothing worth shouting. */
  tag: string | null
  /** Does choosing this send the customer to a gateway after the order is created? */
  redirectsToGateway: boolean
}

/**
 * In display order. COD first — see the note above.
 *
 * Everything except COD routes to /checkout/pay/[orderNumber], the clearly-labelled MOCK gateway.
 * Nothing here charges a card. Wiring the real thing means calling `initSession()` from
 * ./sslcommerz.ts and redirecting to the `GatewayPageURL` it returns instead.
 */
export const PAYMENT_METHODS: readonly PaymentMethodOption[] = [
  {
    method: PaymentMethod.COD,
    label: 'Cash on Delivery',
    description: 'Check the parcel at your door, then pay the rider. No gateway, no card.',
    tag: 'Most popular',
    redirectsToGateway: false,
  },
  {
    method: PaymentMethod.BKASH,
    label: 'bKash',
    description: 'Pay from your bKash wallet. You will be sent to the payment page next.',
    tag: null,
    redirectsToGateway: true,
  },
  {
    method: PaymentMethod.NAGAD,
    label: 'Nagad',
    description: 'Pay from your Nagad wallet. You will be sent to the payment page next.',
    tag: null,
    redirectsToGateway: true,
  },
  {
    method: PaymentMethod.SSLCOMMERZ,
    label: 'Card / Net Banking',
    description: 'Visa, Mastercard, Amex or bank transfer via SSLCommerz.',
    tag: null,
    redirectsToGateway: true,
  },
] as const

const BY_METHOD = new Map(PAYMENT_METHODS.map((option) => [option.method, option]))

export function paymentMethodOption(method: PaymentMethod): PaymentMethodOption {
  // Every PaymentMethod enum member has an entry above, so this cannot miss — but a schema change
  // that adds a method without adding it here should fail loudly, not render an empty row.
  const option = BY_METHOD.get(method)
  if (!option) throw new Error(`No payment-method copy defined for "${method}".`)
  return option
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return BY_METHOD.get(method)?.label ?? method
}

/** True for everything except COD: the order exists, but the money hasn't been taken yet. */
export function requiresGateway(method: PaymentMethod): boolean {
  return BY_METHOD.get(method)?.redirectsToGateway ?? false
}

/** The default. Do not change this to a wallet without reading the note at the top of this file. */
export const DEFAULT_PAYMENT_METHOD: PaymentMethod = PaymentMethod.COD
