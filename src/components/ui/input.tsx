import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Form fields. Deliberately hook-free (no useId) so they stay valid inside
 * Server Components — a bare <input> needs no JS to work.
 *
 * Pass an `id` to get full a11y wiring: the error message is rendered as
 * `${id}-error` and linked via aria-describedby.
 */

type IconComponent = React.ComponentType<{ className?: string }>

/** 16px minimum on mobile — anything smaller makes iOS Safari zoom on focus. */
const fieldBase = [
  'w-full rounded-lg border bg-surface text-ink placeholder:text-ink-subtle',
  'text-base sm:text-sm',
  'transition-colors duration-150',
  'focus-visible:outline-hidden focus-visible:ring-2',
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-subtle',
]

const fieldTone = (invalid: boolean) =>
  invalid
    ? 'border-danger focus-visible:border-danger focus-visible:ring-danger'
    : 'border-line hover:border-line-strong focus-visible:border-brand-500 focus-visible:ring-brand-500'

function errorIdFor(id?: string) {
  return id ? `${id}-error` : undefined
}

function describedBy(...ids: (string | undefined)[]) {
  const joined = ids.filter(Boolean).join(' ')
  return joined || undefined
}

/**
 * The `error` message under a field. Shared by Input/Textarea/Select.
 *
 * `role="alert"` is the point: aria-describedby only reaches the message once focus
 * lands on the field, and the red border says nothing at all. Without a live region a
 * screen-reader user submits the form and hears silence.
 */
function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs text-danger">
      {children}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <label className={cn('mb-1.5 block text-sm font-medium text-ink', className)} {...props}>
      {children}
      {required ? (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  )
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** `true` marks the field invalid; a string also renders the message. */
  error?: string | boolean
  /** Lucide icon rendered inside the leading edge of the field. */
  icon?: IconComponent
  /** Rendered at the trailing edge (e.g. a "৳" suffix or a clear button). */
  trailing?: React.ReactNode
  /** Wrapper class — use `className` for the <input> itself. */
  containerClassName?: string
  ref?: React.Ref<HTMLInputElement>
}

export function Input({
  className,
  containerClassName,
  error,
  icon: Icon,
  trailing,
  id,
  'aria-describedby': ariaDescribedBy,
  ...props
}: InputProps) {
  const invalid = Boolean(error)
  const errorId = errorIdFor(id)
  const hasMessage = typeof error === 'string' && error.length > 0

  return (
    <div className={containerClassName}>
      <div className="relative">
        {Icon ? (
          <Icon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle"
            aria-hidden="true"
          />
        ) : null}

        <input
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy(ariaDescribedBy, hasMessage ? errorId : undefined)}
          className={cn(
            fieldBase,
            fieldTone(invalid),
            'h-11 px-3 py-2',
            Icon && 'pl-9',
            trailing && 'pr-10',
            className,
          )}
          {...props}
        />

        {trailing ? (
          <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center text-ink-subtle">
            {trailing}
          </div>
        ) : null}
      </div>

      {hasMessage ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Textarea
// ---------------------------------------------------------------------------

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string | boolean
  containerClassName?: string
  ref?: React.Ref<HTMLTextAreaElement>
}

export function Textarea({
  className,
  containerClassName,
  error,
  id,
  rows = 4,
  'aria-describedby': ariaDescribedBy,
  ...props
}: TextareaProps) {
  const invalid = Boolean(error)
  const errorId = errorIdFor(id)
  const hasMessage = typeof error === 'string' && error.length > 0

  return (
    <div className={containerClassName}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy(ariaDescribedBy, hasMessage ? errorId : undefined)}
        className={cn(fieldBase, fieldTone(invalid), 'min-h-24 resize-y px-3 py-2.5', className)}
        {...props}
      />
      {hasMessage ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Select (native — keeps the OS picker on mobile, which is what BD users expect)
// ---------------------------------------------------------------------------

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string | boolean
  icon?: IconComponent
  containerClassName?: string
  ref?: React.Ref<HTMLSelectElement>
}

export function Select({
  className,
  containerClassName,
  error,
  icon: Icon,
  id,
  children,
  'aria-describedby': ariaDescribedBy,
  ...props
}: SelectProps) {
  const invalid = Boolean(error)
  const errorId = errorIdFor(id)
  const hasMessage = typeof error === 'string' && error.length > 0

  return (
    <div className={containerClassName}>
      <div className="relative">
        {Icon ? (
          <Icon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle"
            aria-hidden="true"
          />
        ) : null}

        <select
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy(ariaDescribedBy, hasMessage ? errorId : undefined)}
          className={cn(
            fieldBase,
            fieldTone(invalid),
            'h-11 cursor-pointer appearance-none py-2 pr-9 pl-3',
            Icon && 'pl-9',
            className,
          )}
          {...props}
        >
          {children}
        </select>

        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-subtle"
          aria-hidden="true"
        />
      </div>

      {hasMessage ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}
