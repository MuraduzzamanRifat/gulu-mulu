/**
 * SSLCommerz — Bangladesh's dominant payment aggregator (cards, bKash, Nagad, Rocket, net banking).
 *
 * ┌───────────────────────────────────────────────────────────────────────────────────────────┐
 * │  THIS FILE IS A TYPED STUB. GULU MULU DOES NOT TAKE REAL MONEY.                           │
 * │                                                                                           │
 * │  The request/response shapes, the endpoints and the security rules below are the REAL     │
 * │  ones — they are what you would ship. What is missing is a merchant account: without      │
 * │  SSLCZ_STORE_ID / SSLCZ_STORE_PASSWORD in the environment, `initSession()` refuses to     │
 * │  run and the checkout falls back to the clearly-labelled mock gateway at                  │
 * │  /checkout/pay/[orderNumber], which flips paymentStatus locally and charges nobody.       │
 * └───────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE REAL FLOW (three legs, and every one of them matters)
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 *
 *  1. INIT (server -> SSLCommerz)
 *       POST application/x-www-form-urlencoded to the init endpoint with store credentials, the
 *       amount, a `tran_id` you own (we use `Order.orderNumber`), and your success/fail/cancel/ipn
 *       URLs. You get back `GatewayPageURL`. You redirect the CUSTOMER'S BROWSER there.
 *
 *  2. CUSTOMER PAYS on SSLCommerz's hosted page, then is bounced back to your success_url /
 *     fail_url / cancel_url by an HTTP POST from *their* page.
 *
 *  3. IPN / VALIDATION (server -> SSLCommerz)
 *       SSLCommerz also POSTs an IPN to your ipn_url, server-to-server. It carries `val_id`.
 *       ⚠️  THAT PAYLOAD IS UNSIGNED AND UNAUTHENTICATED. ANYONE ON THE INTERNET CAN POST IT.
 *       You MUST call the validation endpoint with `val_id` + your store credentials, and then
 *       re-check the answer against YOUR stored order (see `assertIpnMatchesOrder` below).
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE FOUR WAYS MARKETPLACES GET ROBBED HERE — none of them is theoretical
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 *
 *  1. TRUSTING THE IPN BODY.  The POST to your ipn_url is just an HTTP request. `curl` it with
 *     `status=VALID&tran_id=GM-4F2A9C` and, if you believe it, you have shipped a phone for free.
 *     The body is a NOTIFICATION, never EVIDENCE. Only the response of the validation API —
 *     fetched by YOU, over TLS, authenticated with YOUR store password — is evidence.
 *
 *  2. TRUSTING THE VALIDATION RESPONSE'S AMOUNT.  Even a genuine `status: VALID` only proves that
 *     *some* money moved. It does not prove the RIGHT money moved. A customer can tamper with the
 *     amount on the way to the gateway, pay ৳1 against a ৳20,000 order, and hand you a perfectly
 *     valid val_id. Compare `amount` AND `currency` against the order you stored — never against
 *     anything that arrived in the request.
 *
 *  3. NOT BEING IDEMPOTENT.  SSLCommerz retries the IPN. The customer's browser also hits your
 *     success_url. That is at least two "payment succeeded" events for one payment. If marking an
 *     order paid also, say, credits a seller's payout, you have just paid the seller twice. Every
 *     transition below is a no-op when the order is already PAID.
 *
 *  4. RELYING ON THE BROWSER REDIRECT AT ALL.  The customer can close the tab the instant the
 *     payment goes through and never load your success_url. The IPN is the source of truth; the
 *     redirect is a nicety for the human.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * ENDPOINTS (verbatim — these are the only four you need)
 *
 *   sandbox init:     https://sandbox.sslcommerz.com/gwprocess/v4/api.php
 *   live init:        https://securepay.sslcommerz.com/gwprocess/v4/api.php
 *   sandbox validate: https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php
 *   live validate:    https://securepay.sslcommerz.com/validator/api/validationserverAPI.php
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */
/*
 * SERVER-ONLY. This module reads SSLCZ_STORE_PASSWORD from the environment — importing it from a
 * 'use client' component would be a credential leak. (The `server-only` package is not installed
 * in this project, so that rule is enforced by review, not by the bundler: never import this file
 * from anything that carries a 'use client' directive.)
 */

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                  */
/* -------------------------------------------------------------------------- */

export const SSLCOMMERZ_ENDPOINTS = {
  sandbox: {
    init: 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
    validate: 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php',
  },
  live: {
    init: 'https://securepay.sslcommerz.com/gwprocess/v4/api.php',
    validate: 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php',
  },
} as const

/** SSLCommerz settles in BDT only. Hard-coded so an amount check can never be fooled by a currency swap. */
export const SSLCOMMERZ_CURRENCY = 'BDT'

/* -------------------------------------------------------------------------- */
/* Config                                                                     */
/* -------------------------------------------------------------------------- */

export interface SslCommerzConfig {
  storeId: string
  storePassword: string
  /** `false` points every call at securepay.sslcommerz.com. Default true — you opt IN to live. */
  sandbox: boolean
}

/**
 * Read credentials from the environment. Returns null when the merchant account isn't configured —
 * which is the normal state of this demo, and is exactly what makes the checkout fall back to the
 * mock gateway instead of silently pretending a card was charged.
 */
export function getSslCommerzConfig(): SslCommerzConfig | null {
  const storeId = process.env.SSLCZ_STORE_ID
  const storePassword = process.env.SSLCZ_STORE_PASSWORD
  if (!storeId || !storePassword) return null

  return {
    storeId,
    storePassword,
    // Anything other than the literal string "live" stays in the sandbox. Going live must be a
    // deliberate act, never a typo in an env var.
    sandbox: process.env.SSLCZ_MODE !== 'live',
  }
}

export function isSslCommerzConfigured(): boolean {
  return getSslCommerzConfig() !== null
}

/** Thrown by `initSession` / `validateIpn` when there are no store credentials. */
export class SslCommerzNotConfiguredError extends Error {
  constructor() {
    super(
      'SSLCommerz is not configured. Set SSLCZ_STORE_ID and SSLCZ_STORE_PASSWORD to enable the ' +
        'real gateway. Until then Gulu Mulu uses the mock gateway at /checkout/pay/[orderNumber], ' +
        'which processes no real payment.',
    )
    this.name = 'SslCommerzNotConfiguredError'
  }
}

/* -------------------------------------------------------------------------- */
/* 1. Init — get a GatewayPageURL to redirect the customer to                  */
/* -------------------------------------------------------------------------- */

/**
 * The subset of SSLCommerz's (very large) init form that a marketplace actually has to send.
 * Every field is required by the API unless marked optional here.
 */
export interface InitSessionParams {
  /** Whole BDT. Sent as `total_amount`. SSLCommerz accepts decimals; we never have any. */
  amount: number
  /** OUR id for the payment. Must be unique per attempt. We use `Order.orderNumber` (GM-4F2A9C). */
  tranId: string
  /** Absolute URLs — SSLCommerz POSTs the customer's browser back to these. */
  successUrl: string
  failUrl: string
  cancelUrl: string
  /** Absolute URL. Server-to-server notification. THE ONLY LEG YOU MAY BELIEVE (after validating). */
  ipnUrl: string

  customerName: string
  customerPhone: string
  customerEmail?: string
  customerAddress: string
  customerCity: string

  /** Free text shown on the gateway page, e.g. "Gulu Mulu order GM-4F2A9C (3 items)". */
  productName: string
  /** SSLCommerz's fixed taxonomy. A marketplace of goods is "physical-goods". */
  productCategory?: string
  shippingMethod?: 'Courier' | 'NO'
}

export type InitSessionResult =
  | { status: 'SUCCESS'; gatewayPageUrl: string; sessionKey: string }
  | { status: 'FAILED'; reason: string }

/** The raw JSON SSLCommerz answers `gwprocess/v4/api.php` with. */
interface RawInitResponse {
  status?: string
  failedreason?: string
  sessionkey?: string
  GatewayPageURL?: string
}

/**
 * Open a payment session and get the URL to send the customer's browser to.
 *
 * The amount MUST come from the Order row you just wrote — never from the client, and never from
 * a cart re-computed on the fly. This is the number the customer will be charged, and it is the
 * number you will later compare the validation response against; if the two can ever disagree,
 * threat #2 in the header comment is wide open.
 *
 * @throws SslCommerzNotConfiguredError when no merchant credentials are present.
 */
export async function initSession(params: InitSessionParams): Promise<InitSessionResult> {
  const config = getSslCommerzConfig()
  if (!config) throw new SslCommerzNotConfiguredError()

  const endpoint = config.sandbox ? SSLCOMMERZ_ENDPOINTS.sandbox.init : SSLCOMMERZ_ENDPOINTS.live.init

  // The API is form-urlencoded, NOT JSON. Sending JSON gets you a 200 with an unhelpful failure.
  const body = new URLSearchParams({
    store_id: config.storeId,
    store_passwd: config.storePassword,
    total_amount: String(Math.max(0, Math.round(params.amount))),
    currency: SSLCOMMERZ_CURRENCY,
    tran_id: params.tranId,
    success_url: params.successUrl,
    fail_url: params.failUrl,
    cancel_url: params.cancelUrl,
    ipn_url: params.ipnUrl,
    cus_name: params.customerName,
    cus_phone: params.customerPhone,
    cus_email: params.customerEmail ?? 'noreply@gulumulu.com.bd',
    cus_add1: params.customerAddress,
    cus_city: params.customerCity,
    cus_country: 'Bangladesh',
    shipping_method: params.shippingMethod ?? 'Courier',
    num_of_item: '1',
    product_name: params.productName,
    product_category: params.productCategory ?? 'physical-goods',
    product_profile: 'physical-goods',
  })

  let raw: RawInitResponse
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      // A payment session must never be served from a cache.
      cache: 'no-store',
    })

    if (!response.ok) {
      return { status: 'FAILED', reason: `Gateway returned HTTP ${response.status}.` }
    }

    raw = (await response.json()) as RawInitResponse
  } catch (error) {
    // Network/TLS/parse failure. The customer has not paid — leave the order PENDING and say so.
    return {
      status: 'FAILED',
      reason: error instanceof Error ? error.message : 'Could not reach the payment gateway.',
    }
  }

  if (raw.status !== 'SUCCESS' || !raw.GatewayPageURL) {
    return { status: 'FAILED', reason: raw.failedreason || 'The gateway refused the session.' }
  }

  return {
    status: 'SUCCESS',
    gatewayPageUrl: raw.GatewayPageURL,
    sessionKey: raw.sessionkey ?? '',
  }
}

/* -------------------------------------------------------------------------- */
/* 3. Validation — the ONLY thing you may believe                             */
/* -------------------------------------------------------------------------- */

/**
 * The IPN body, as it lands on your ipn_url.
 *
 * ⚠️  UNTRUSTED INPUT. Every field here is attacker-controlled. The ONLY one you may use is
 *     `val_id`, and you may only use it as an ARGUMENT TO `validateIpn()`. Reading `status`,
 *     `amount` or `tran_id` off this object and acting on them is the single most common way a
 *     Bangladeshi e-commerce site gets its inventory drained.
 */
export interface UntrustedIpnPayload {
  val_id?: string
  tran_id?: string
  status?: string
  amount?: string
  currency?: string
  [key: string]: string | undefined
}

/**
 * What the validation API says — this you may trust, once you've compared it to your own order.
 *
 * Discriminated on `ok`, not on `status`: a union whose discriminant is itself a union of literals
 * ('VALID' | 'VALIDATED') narrows badly, and a payment type that needs a cast to read is a payment
 * type that will one day be read wrong.
 */
export type ValidationResult =
  | {
      ok: true
      status: 'VALID' | 'VALIDATED'
      /** OUR tran_id, echoed back. Look the order up by THIS, not by anything in the IPN body. */
      tranId: string
      /** Whole BDT actually captured. Compare against `order.total`. */
      amount: number
      currency: string
      /** SSLCommerz's own transaction id — store it on the order for reconciliation/refunds. */
      bankTranId: string
      cardType: string
    }
  | { ok: false; status: 'INVALID' | 'FAILED' | 'CANCELLED' | 'UNATTEMPTED'; reason: string }

interface RawValidationResponse {
  status?: string
  tran_id?: string
  amount?: string
  currency?: string
  bank_tran_id?: string
  card_type?: string
  error?: string
}

/**
 * Ask SSLCommerz, over an authenticated TLS call YOU initiate, what really happened.
 *
 * This is the trust boundary. Nothing that arrived in the IPN request crosses it except `val_id`,
 * which is an opaque lookup key and cannot be forged into a successful answer: an attacker who
 * invents one gets `INVALID` back, because they cannot make SSLCommerz's own database agree.
 *
 * @throws SslCommerzNotConfiguredError when no merchant credentials are present.
 */
export async function validateIpn(valId: string): Promise<ValidationResult> {
  const config = getSslCommerzConfig()
  if (!config) throw new SslCommerzNotConfiguredError()

  if (!valId) return { ok: false, status: 'INVALID', reason: 'No val_id supplied.' }

  const base = config.sandbox
    ? SSLCOMMERZ_ENDPOINTS.sandbox.validate
    : SSLCOMMERZ_ENDPOINTS.live.validate

  const url = new URL(base)
  url.searchParams.set('val_id', valId)
  url.searchParams.set('store_id', config.storeId)
  url.searchParams.set('store_passwd', config.storePassword)
  url.searchParams.set('v', '1')
  url.searchParams.set('format', 'json')

  let raw: RawValidationResponse
  try {
    const response = await fetch(url, { method: 'GET', cache: 'no-store' })
    if (!response.ok) {
      return {
        ok: false,
        status: 'FAILED',
        reason: `Validation API returned HTTP ${response.status}.`,
      }
    }
    raw = (await response.json()) as RawValidationResponse
  } catch (error) {
    // Could not reach the validator => we do NOT know whether the money moved => do NOT mark paid.
    // Leave the order PENDING and let the IPN retry, or reconcile by hand. Guessing here is theft.
    return {
      ok: false,
      status: 'FAILED',
      reason: error instanceof Error ? error.message : 'Could not reach the validation API.',
    }
  }

  // SSLCommerz answers VALID for a straight capture and VALIDATED for one that was already
  // validated by an earlier call (their idempotency). Both mean "the money is there".
  if (raw.status !== 'VALID' && raw.status !== 'VALIDATED') {
    return {
      ok: false,
      status:
        raw.status === 'FAILED' || raw.status === 'CANCELLED' || raw.status === 'UNATTEMPTED'
          ? raw.status
          : 'INVALID',
      reason: raw.error || `Gateway reported status "${raw.status ?? 'unknown'}".`,
    }
  }

  return {
    ok: true,
    status: raw.status,
    tranId: raw.tran_id ?? '',
    // The API returns a decimal string ("1299.00"). We bank whole Taka, so round once, here.
    amount: Math.round(Number.parseFloat(raw.amount ?? '0')),
    currency: raw.currency ?? '',
    bankTranId: raw.bank_tran_id ?? '',
    cardType: raw.card_type ?? '',
  }
}

/* -------------------------------------------------------------------------- */
/* The check that actually protects the money                                 */
/* -------------------------------------------------------------------------- */

/** The order as YOUR database knows it. Not as the request claims it is. */
export interface StoredOrderFacts {
  orderNumber: string
  /** Whole BDT, from the Order row. */
  total: number
  /** Already PAID? Then this event is a duplicate and must change nothing. */
  alreadyPaid: boolean
}

export type IpnVerdict =
  | { accept: true; bankTranId: string }
  | { accept: false; reason: string }
  /** A retry of a payment already banked. Acknowledge with 200 and touch NOTHING. */
  | { accept: false; duplicate: true; reason: string }

/**
 * The last gate before an order is marked PAID.
 *
 * A `VALID` validation response is necessary and NOT sufficient. It proves money moved; it does
 * not prove the right amount, in the right currency, against the right order. This function is
 * where those three facts are checked — against the stored order, never against the request.
 *
 * Call it as:
 *
 *   const result  = await validateIpn(untrusted.val_id ?? '')
 *   const order   = await prisma.order.findUnique({ where: { orderNumber: result.tranId } })
 *   const verdict = assertIpnMatchesOrder(result, {
 *     orderNumber: order.orderNumber,
 *     total: order.total,
 *     alreadyPaid: order.paymentStatus === PaymentStatus.PAID,
 *   })
 *   if (!verdict.accept) return new Response('OK')   // 200: acknowledged, ignored
 *   await prisma.order.update({ ... paymentStatus: PAID, transactionId: verdict.bankTranId })
 *
 * Note the order lookup uses `result.tranId` — the tran_id the VALIDATOR echoed back — and not
 * the `tran_id` field of the IPN body, which is attacker-controlled.
 */
export function assertIpnMatchesOrder(
  validation: ValidationResult,
  order: StoredOrderFacts,
): IpnVerdict {
  if (!validation.ok) {
    return { accept: false, reason: validation.reason }
  }

  if (order.alreadyPaid) {
    return {
      accept: false,
      duplicate: true,
      reason: `Order ${order.orderNumber} is already PAID — ignoring a repeat notification.`,
    }
  }

  if (validation.tranId !== order.orderNumber) {
    return {
      accept: false,
      reason: `tran_id "${validation.tranId}" does not match order ${order.orderNumber}.`,
    }
  }

  if (validation.currency !== SSLCOMMERZ_CURRENCY) {
    return {
      accept: false,
      reason: `Paid in ${validation.currency}, but the order is in ${SSLCOMMERZ_CURRENCY}.`,
    }
  }

  // THE check. Underpayment is the whole attack; `!==` (not `<`) also catches an overpayment,
  // which is just as much a reconciliation bug and must be looked at by a human.
  if (validation.amount !== order.total) {
    return {
      accept: false,
      reason: `Paid ৳${validation.amount}, but order ${order.orderNumber} is ৳${order.total}.`,
    }
  }

  return { accept: true, bankTranId: validation.bankTranId }
}
