'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button, Label, RatingInput, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * Write-a-review, shown ONLY to a shopper with a delivered line and no review yet.
 *
 * The gate is decided on the server (`getReviewEligibility`) and enforced again on the server
 * (`submitReview` re-checks the order history before it writes). This component is the third,
 * least important line of defence: it exists to make the rules obvious, not to impose them.
 */

const MAX_COMMENT = 1000

export type SubmitReviewFn = (input: {
  productId: string
  rating: number
  comment?: string
}) => Promise<{ ok: true } | { ok: false; error: string; requiresAuth?: boolean }>

export interface ReviewFormProps {
  productId: string
  productTitle: string
  submitAction: SubmitReviewFn
  className?: string
}

export function ReviewForm({ productId, productTitle, submitAction, className }: ReviewFormProps) {
  const router = useRouter()

  const [rating, setRating] = React.useState(0)
  const [comment, setComment] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (rating < 1) {
      setError('Please choose a star rating first.')
      return
    }

    setError(null)

    startTransition(async () => {
      const result = await submitAction({
        productId,
        rating,
        comment: comment.trim() || undefined,
      })

      if (!result.ok) {
        if (result.requiresAuth) {
          toast.error(result.error)
          router.push('/login')
          return
        }

        setError(result.error)
        toast.error(result.error)
        return
      }

      setRating(0)
      setComment('')
      toast.success('Thanks — your review is live.')

      // The Server Action already revalidated this path; refresh pulls the new rows into view.
      router.refresh()
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn('rounded-card border border-line bg-surface-muted p-4 sm:p-5', className)}
    >
      <h3 className="text-base font-semibold tracking-tight text-ink">Write a review</h3>
      <p className="mt-0.5 text-sm text-ink-muted">
        You bought “{productTitle}” — tell other shoppers how it went.
      </p>

      <div className="mt-4">
        <p className="mb-1.5 text-sm font-medium text-ink">
          Your rating
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        </p>
        <RatingInput
          value={rating}
          onChange={(next) => {
            setRating(next)
            setError(null)
          }}
          size="lg"
          disabled={isPending}
          aria-label="Your rating out of 5"
        />
      </div>

      <div className="mt-4">
        <Label htmlFor="review-comment">Your review (optional)</Label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value.slice(0, MAX_COMMENT))}
          maxLength={MAX_COMMENT}
          rows={4}
          disabled={isPending}
          placeholder="Fit, fabric, delivery time — whatever you wish someone had told you."
          // Marks the field invalid; the message itself is the single role="alert" below.
          error={Boolean(error)}
        />
        <p className="mt-1 text-right text-xs text-ink-subtle tabular-nums">
          {comment.length} / {MAX_COMMENT}
        </p>
      </div>

      {error ? (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" loading={isPending} className="mt-4 w-full sm:w-auto">
        Post review
      </Button>
    </form>
  )
}
