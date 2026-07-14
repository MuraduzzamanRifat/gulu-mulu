'use client'

import * as React from 'react'
import { ArrowLeft, MessageSquareLock, Phone, TriangleAlert } from 'lucide-react'

import { Button, Input, Label } from '@/components/ui'
import { isValidBdPhone } from '@/lib/format'
import { cn } from '@/lib/utils'

import { requestCodeAction, verifyCodeAction } from './_actions'
import { OtpInput } from './otp-input'

const OTP_LENGTH = 6
/** Matches OTP_RESEND_COOLDOWN_MS in '@/lib/otp'. The server is still the authority. */
const RESEND_COOLDOWN_SECONDS = 60

export interface LoginFormProps {
  /** Already sanitised by the page via safeNextPath(). Re-sanitised server-side regardless. */
  next: string
}

type Step = 'phone' | 'code'

/**
 * Two-step phone OTP sign-in.
 *
 * The number carried into step 2 is the one `requestOtp()` HANDED BACK, not the one that was
 * typed. `01712-345678`, `+8801712345678` and `1712345678` all normalise to `01712345678`, and
 * only that canonical form will match the OTP row — sending the raw input to `verifyOtp()` would
 * fail every code for anyone who formats their number the way BD shoppers actually do.
 */
export function LoginForm({ next }: LoginFormProps) {
  const [step, setStep] = React.useState<Step>('phone')
  const [pending, startTransition] = React.useTransition()

  // What the shopper typed vs. what the server normalised it to. Both are needed: one to keep
  // the field editable, one to verify against.
  const [phoneInput, setPhoneInput] = React.useState('')
  const [phone, setPhone] = React.useState('')

  const [code, setCode] = React.useState('')
  const [devCode, setDevCode] = React.useState<string | null>(null)

  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [cooldown, setCooldown] = React.useState(0)

  // Self-terminating 1s tick. Cheaper and less drifty than an interval, and it stops dead at 0
  // instead of leaving a timer running behind an idle screen.
  React.useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cooldown])

  const phoneValid = isValidBdPhone(phoneInput)

  /** Shared by "Send code" and "Resend code" — same action, different chrome. */
  function sendCode(rawPhone: string, { resend }: { resend: boolean }) {
    setError(null)
    setNotice(null)

    startTransition(async () => {
      const result = await requestCodeAction({ phone: rawPhone })

      if (!result.ok) {
        setError(result.error)
        // The server tells us exactly how long it will keep saying no. Honour it, so the button
        // can't be mashed into a second refusal.
        if (result.retryAfterSeconds) setCooldown(result.retryAfterSeconds)
        return
      }

      setPhone(result.phone) // ← the normalised number: this is what step 2 verifies against
      setDevCode(result.devCode ?? null)
      setCode('')
      setStep('code')
      setCooldown(RESEND_COOLDOWN_SECONDS)
      if (resend) setNotice(`A new code is on its way to ${result.phone}.`)
    })
  }

  function submitPhone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    // Client-side gate first: a typo shouldn't cost a round trip (or an SMS).
    if (!isValidBdPhone(phoneInput)) {
      setError('Enter a valid Bangladeshi mobile number, e.g. 01712345678.')
      return
    }

    sendCode(phoneInput, { resend: false })
  }

  function submitCode(fullCode: string) {
    if (pending) return

    if (fullCode.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code we sent you.`)
      return
    }

    setError(null)
    setNotice(null)

    startTransition(async () => {
      // On success this action redirects and never resolves with a value.
      const result = await verifyCodeAction({ phone, code: fullCode, next })

      if (result) {
        setError(result.error)
        setCode('') // wrong code: clear the boxes so they can just start typing again
      }
    })
  }

  function backToPhone() {
    setStep('phone')
    setCode('')
    setDevCode(null)
    setError(null)
    setNotice(null)
  }

  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-xs sm:p-7">
      {step === 'phone' ? (
        <>
          <header className="mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">Sign in or sign up</h1>
            <p className="mt-1.5 text-sm text-ink-muted">
              Enter your mobile number and we&rsquo;ll text you a {OTP_LENGTH}-digit code. No
              password to remember.
            </p>
          </header>

          <form onSubmit={submitPhone} noValidate>
            <Label htmlFor="login-phone" required>
              Mobile number
            </Label>

            <Input
              id="login-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              autoFocus
              enterKeyHint="send"
              placeholder="01712345678"
              maxLength={20}
              value={phoneInput}
              disabled={pending}
              error={error ?? undefined}
              icon={Phone}
              onChange={(event) => {
                setPhoneInput(event.target.value)
                if (error) setError(null)
              }}
              className="tabular-nums"
            />

            <p className="mt-1.5 text-xs text-ink-subtle">
              Bangladeshi numbers only. We accept 01712345678, +8801712345678 or 01712-345678.
            </p>

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={pending}
              disabled={!phoneValid}
              className="mt-5"
            >
              {pending ? 'Sending code…' : 'Send code'}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs leading-relaxed text-ink-subtle">
            By continuing you agree to Gulu Mulu&rsquo;s Terms of Service and Privacy Policy.
          </p>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={backToPhone}
            disabled={pending}
            className={cn(
              '-ml-1 mb-4 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium',
              'text-ink-muted transition-colors hover:text-ink',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Change number
          </button>

          <header className="mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">Enter your code</h1>
            <p className="mt-1.5 text-sm text-ink-muted">
              We sent a {OTP_LENGTH}-digit code to{' '}
              <span className="font-semibold text-ink tabular-nums">{phone}</span>. It expires in 5
              minutes.
            </p>
          </header>

          {devCode ? (
            <div
              role="status"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-warning/50 bg-warning-soft p-3"
            >
              <MessageSquareLock
                className="mt-0.5 size-4 shrink-0 text-accent-700"
                aria-hidden="true"
              />
              <p className="text-sm leading-snug text-accent-700">
                <span className="font-semibold">Dev mode</span> — your OTP is{' '}
                <span className="font-mono text-base font-bold tracking-widest tabular-nums">
                  {devCode}
                </span>
                <span className="mt-0.5 block text-xs opacity-80">
                  No SMS was sent. This banner never appears in production.
                </span>
              </p>
            </div>
          ) : null}

          <OtpInput
            value={code}
            onChange={(next) => {
              setCode(next)
              if (error) setError(null)
            }}
            onComplete={submitCode}
            length={OTP_LENGTH}
            disabled={pending}
            invalid={Boolean(error)}
            aria-describedby={error ? 'login-code-error' : undefined}
          />

          {error ? (
            <p
              id="login-code-error"
              role="alert"
              className="mt-3 flex items-start gap-1.5 text-sm text-danger"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}

          {notice && !error ? (
            <p role="status" className="mt-3 text-sm text-success">
              {notice}
            </p>
          ) : null}

          <Button
            type="button"
            size="lg"
            fullWidth
            loading={pending}
            disabled={code.length !== OTP_LENGTH}
            onClick={() => submitCode(code)}
            className="mt-5"
          >
            {pending ? 'Verifying…' : 'Verify and continue'}
          </Button>

          <div className="mt-5 text-center text-sm text-ink-muted">
            {cooldown > 0 ? (
              <p aria-live="polite">
                Didn&rsquo;t get it? Resend in{' '}
                <span className="font-semibold text-ink tabular-nums">{cooldown}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => sendCode(phone, { resend: true })}
                disabled={pending}
                className={cn(
                  'rounded-lg px-1 py-0.5 font-semibold text-brand-600 transition-colors',
                  'hover:text-brand-700 hover:underline',
                  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500',
                  'disabled:pointer-events-none disabled:opacity-50',
                )}
              >
                Resend code
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
