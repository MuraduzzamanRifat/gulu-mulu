'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, CircleAlert, Info, Loader2, Store } from 'lucide-react'
import { toast } from 'sonner'

import { Button, Card, Input, Label, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'

import type { FieldErrors } from '../../_lib/forms'
import { slugify } from '../../_lib/slug'
import { checkSlugAvailability, registerSeller, type SlugCheck } from './_actions'

type SlugState = { status: 'idle' | 'checking' } | ({ status: 'done' } & SlugCheck)

export function RegisterForm() {
  const router = useRouter()

  const [businessName, setBusinessName] = React.useState('')
  const [slug, setSlug] = React.useState('')
  /** Once the seller edits the link by hand, we stop overwriting it from the shop name. */
  const [slugTouched, setSlugTouched] = React.useState(false)
  const [description, setDescription] = React.useState('')
  const [logoUrl, setLogoUrl] = React.useState('')

  const [tradeLicenseNo, setTradeLicenseNo] = React.useState('')
  const [tradeLicenseUrl, setTradeLicenseUrl] = React.useState('')
  const [nidNumber, setNidNumber] = React.useState('')
  const [nidUrl, setNidUrl] = React.useState('')

  const [bkashNumber, setBkashNumber] = React.useState('')
  const [bankName, setBankName] = React.useState('')
  const [bankAccountName, setBankAccountName] = React.useState('')
  const [bankAccountNumber, setBankAccountNumber] = React.useState('')

  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [pending, startTransition] = React.useTransition()
  const [slugState, setSlugState] = React.useState<SlugState>({ status: 'idle' })

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Monotonic id of the latest request — anything older is a stale keystroke and is dropped. */
  const requestRef = React.useRef(0)

  // Unmount cleanup only. The check itself is kicked off from the change handler, not from an
  // effect: typing is an EVENT, and an effect that re-fires on every keystroke would be both a
  // cascading render and the wrong mental model (see react.dev/learn/you-might-not-need-an-effect).
  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  /** Debounced "is this shop link free?" — 400ms after the seller stops typing. */
  function scheduleSlugCheck(raw: string) {
    if (timerRef.current) clearTimeout(timerRef.current)

    const candidate = slugify(raw)
    if (candidate.length < 3) {
      setSlugState({ status: 'idle' })
      return
    }

    setSlugState({ status: 'checking' })
    const id = ++requestRef.current

    timerRef.current = setTimeout(async () => {
      const result = await checkSlugAvailability(candidate)
      // A slow answer for "rongdhonu" must never overwrite the verdict for "rongdhonu-fashion".
      if (id === requestRef.current) setSlugState({ status: 'done', ...result })
    }, 400)
  }

  function handleNameChange(value: string) {
    setBusinessName(value)
    if (slugTouched) return

    const derived = slugify(value)
    setSlug(derived)
    scheduleSlugCheck(derived)
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true)
    setSlug(value)
    scheduleSlugCheck(value)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await registerSeller({
        businessName,
        slug: slugify(slug),
        description,
        logoUrl,
        tradeLicenseNo,
        tradeLicenseUrl,
        nidNumber,
        nidUrl,
        bankName,
        bankAccountName,
        bankAccountNumber,
        bkashNumber,
      })

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
        return
      }

      setErrors({})
      toast.success('Application submitted. We will review it shortly.')
      router.push('/seller/pending')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* ---------------------------------------------------------------- Shop */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <Store className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink">Your shop</h2>
            <p className="text-xs text-ink-subtle">This is what shoppers will see.</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="businessName" required>
              Shop name
            </Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Rongdhonu Fashion House"
              maxLength={80}
              autoComplete="organization"
              error={errors.businessName}
            />
          </div>

          <div>
            <Label htmlFor="slug" required>
              Shop link
            </Label>
            <Input
              id="slug"
              value={slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              onBlur={() => setSlug(slugify(slug))}
              placeholder="rongdhonu-fashion-house"
              maxLength={60}
              autoComplete="off"
              spellCheck={false}
              error={errors.slug}
              trailing={
                slugState.status === 'checking' ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : slugState.status === 'done' && slugState.available ? (
                  <Check className="size-4 text-success" aria-hidden="true" />
                ) : slugState.status === 'done' ? (
                  <CircleAlert className="size-4 text-danger" aria-hidden="true" />
                ) : null
              }
            />

            <p
              className={cn(
                'mt-1.5 text-xs',
                slugState.status === 'done' && !slugState.available
                  ? 'text-danger'
                  : 'text-ink-subtle',
              )}
              aria-live="polite"
            >
              {slugState.status === 'done' && !slugState.available ? (
                <>
                  <span className="font-mono">{slugState.slug || '…'}</span> — {slugState.reason}
                </>
              ) : (
                <>
                  gulumulu.com.bd/shop/
                  <span className="font-mono text-ink">{slugify(slug) || 'your-shop'}</span>
                  {slugState.status === 'done' && slugState.available ? (
                    <span className="ml-1 font-semibold text-success">Available</span>
                  ) : null}
                </>
              )}
            </p>
          </div>

          <div>
            <Label htmlFor="description">What do you sell?</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Hand-block printed cotton three-piece sets, made in Narayanganj. Ten years on the wholesale market, now selling direct."
              error={errors.description}
            />
          </div>

          <div>
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="https://…/logo.png"
              inputMode="url"
              autoComplete="off"
              error={errors.logoUrl}
            />
          </div>
        </div>
      </Card>

      {/* ---------------------------------------------------------------- Verification */}
      <Card className="p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-ink">Verification</h2>
        <p className="mt-0.5 text-xs text-ink-subtle">
          Bangladeshi law requires us to verify a trade licence and the owner’s NID before a shop can
          take money. Only our verification team sees these.
        </p>

        <Card className="mt-4 flex items-start gap-3 bg-surface-muted p-3">
          <Info className="size-4.5 shrink-0 text-ink-muted" aria-hidden="true" />
          <p className="text-xs text-ink-muted">
            <span className="font-semibold text-ink">File upload is not live yet.</span> Uploading a
            scan needs object storage (S3 / Cloudflare R2), which this build does not have — so
            rather than show you a drop-zone that silently throws your documents away, we take a
            link. Paste a Google Drive / Dropbox link set to “anyone with the link can view”, or
            leave the two link fields blank and our team will call you to collect the scans.
          </p>
        </Card>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="tradeLicenseNo" required>
              Trade licence number
            </Label>
            <Input
              id="tradeLicenseNo"
              value={tradeLicenseNo}
              onChange={(event) => setTradeLicenseNo(event.target.value)}
              placeholder="TRAD/DNCC/012345/2024"
              maxLength={60}
              autoComplete="off"
              error={errors.tradeLicenseNo}
            />
          </div>

          <div>
            <Label htmlFor="tradeLicenseUrl">Link to the scanned licence</Label>
            <Input
              id="tradeLicenseUrl"
              value={tradeLicenseUrl}
              onChange={(event) => setTradeLicenseUrl(event.target.value)}
              placeholder="https://…"
              inputMode="url"
              autoComplete="off"
              error={errors.tradeLicenseUrl}
            />
          </div>

          <div>
            <Label htmlFor="nidNumber" required>
              NID number
            </Label>
            <Input
              id="nidNumber"
              value={nidNumber}
              onChange={(event) => setNidNumber(event.target.value)}
              placeholder="1990123456789"
              inputMode="numeric"
              maxLength={17}
              autoComplete="off"
              error={errors.nidNumber}
            />
            <p className="mt-1.5 text-xs text-ink-subtle">10, 13 or 17 digits.</p>
          </div>

          <div>
            <Label htmlFor="nidUrl">Link to the scanned NID</Label>
            <Input
              id="nidUrl"
              value={nidUrl}
              onChange={(event) => setNidUrl(event.target.value)}
              placeholder="https://…"
              inputMode="url"
              autoComplete="off"
              error={errors.nidUrl}
            />
          </div>
        </div>
      </Card>

      {/* ---------------------------------------------------------------- Payout */}
      <Card className="p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-ink">Getting paid</h2>
        <p className="mt-0.5 text-xs text-ink-subtle">
          Payouts run weekly. Give us a bKash number, or all three bank fields — at least one
          complete method.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="bkashNumber">bKash number</Label>
            <Input
              id="bkashNumber"
              value={bkashNumber}
              onChange={(event) => setBkashNumber(event.target.value)}
              placeholder="01712345678"
              inputMode="tel"
              maxLength={14}
              autoComplete="tel"
              error={errors.bkashNumber}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-x-0 top-1/2 h-px bg-line" aria-hidden="true" />
            <p className="relative mx-auto w-fit bg-surface px-3 text-xs font-medium text-ink-subtle">
              or a bank account
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="bankName">Bank</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
                placeholder="BRAC Bank"
                maxLength={80}
                autoComplete="off"
                error={errors.bankName}
              />
            </div>

            <div>
              <Label htmlFor="bankAccountName">Account name</Label>
              <Input
                id="bankAccountName"
                value={bankAccountName}
                onChange={(event) => setBankAccountName(event.target.value)}
                placeholder="Rongdhonu Fashion House"
                maxLength={80}
                autoComplete="off"
                error={errors.bankAccountName}
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="bankAccountNumber">Account number</Label>
              <Input
                id="bankAccountNumber"
                value={bankAccountNumber}
                onChange={(event) => setBankAccountNumber(event.target.value)}
                placeholder="1501200123456789"
                inputMode="numeric"
                maxLength={40}
                autoComplete="off"
                error={errors.bankAccountNumber}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-surface-muted p-4 text-xs leading-relaxed text-ink-muted sm:p-5">
        By submitting you agree to the{' '}
        <Link
          href="/pages/seller-policy"
          className="font-semibold text-brand-600 underline underline-offset-2"
        >
          Seller Policy
        </Link>{' '}
        and the{' '}
        <Link
          href="/pages/seller-exchange-return-policy"
          className="font-semibold text-brand-600 underline underline-offset-2"
        >
          Seller Exchange &amp; Return Policy
        </Link>
        . Your commission rate is set by Gulu Mulu when your shop is approved — it is shown in your
        seller centre and frozen onto every order at the moment of sale.
      </Card>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        Submit application
      </Button>
    </form>
  )
}
