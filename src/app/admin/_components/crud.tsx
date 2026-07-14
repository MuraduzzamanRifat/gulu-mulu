'use client'

import * as React from 'react'
import { AlertCircle, Pencil, Trash2 } from 'lucide-react'

import { Button, Dialog, Label, type DialogSize } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * The shared skeleton of every CRUD editor in the console — categories, brands, banners,
 * collections, pages.
 *
 * They differ only in their fields. Everything around the fields (the dialog, the pending state,
 * the top-line error, the destructive confirm, the row buttons) is identical, and identical is what
 * it must stay: five hand-rolled delete confirms is five chances for one of them to not actually
 * confirm anything.
 */

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

/** The one message a rejected Server Action came back with. Not a field error — those live inline. */
export function FormAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Fields                                                                     */
/* -------------------------------------------------------------------------- */

export interface FieldProps {
  /** Must match the `id` on the control inside, or the label clicks nothing. */
  id: string
  label: string
  hint?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

/**
 * Label + control + hint. The ERROR is not rendered here — Input/Select/Textarea already render
 * their own `error` string and wire up `aria-describedby`, and duplicating it would read the
 * message twice to a screen reader.
 */
export function Field({ id, label, hint, required, className, children }: FieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  )
}

export interface ToggleProps {
  id: string
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

/** A real checkbox — it keeps keyboard, form and screen-reader semantics for free. */
export function Toggle({ id, label, hint, checked, onChange, disabled }: ToggleProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 transition-colors',
        'hover:bg-surface-muted has-[:checked]:border-brand-200 has-[:checked]:bg-brand-50',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-brand-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span> : null}
      </span>
    </label>
  )
}

/* -------------------------------------------------------------------------- */
/* Dialogs                                                                    */
/* -------------------------------------------------------------------------- */

export interface DialogFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Top-line failure from the Server Action. Field errors go on the fields. */
  error?: string | null
  pending: boolean
  submitLabel: string
  onSubmit: () => void
  size?: DialogSize
  children: React.ReactNode
}

/**
 * A create/edit dialog.
 *
 * The submit button lives in the dialog's footer, which is OUTSIDE the <form> element — so the
 * form also carries a visually hidden submit, without which Enter would do nothing in a text field
 * and every admin would learn to reach for the mouse.
 *
 * While a save is in flight the dialog cannot be dismissed: closing it would leave the mutation
 * running with nowhere to report that it failed.
 */
export function DialogForm({
  open,
  onOpenChange,
  title,
  description,
  error,
  pending,
  submitLabel,
  onSubmit,
  size = 'md',
  children,
}: DialogFormProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next)
      }}
      title={title}
      description={description}
      size={size}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSubmit} loading={pending}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
        className="space-y-4"
        noValidate
      >
        {error ? <FormAlert message={error} /> : null}
        {children}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          Save
        </button>
      </form>
    </Dialog>
  )
}

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** The consequence, spelled out. A confirm that explains nothing is just a speed bump. */
  children?: React.ReactNode
  confirmLabel: string
  onConfirm: () => void
  pending: boolean
  variant?: 'danger' | 'primary'
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  onConfirm,
  pending,
  variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next)
      }}
      size="sm"
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/* Row controls                                                               */
/* -------------------------------------------------------------------------- */

export interface RowButtonsProps {
  /** Names the thing being acted on, for the screen reader: "Edit Women's Fashion". */
  label: string
  onEdit: () => void
  onDelete: () => void
  disabled?: boolean
}

// 44px — the minimum comfortable touch target. Tailwind 4's preflight no longer sets
// `cursor: pointer` on <button>, so it has to be asked for explicitly.
const iconButton =
  'inline-flex size-11 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2'

export function RowButtons({ label, onEdit, onDelete, disabled }: RowButtonsProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        aria-label={`Edit ${label}`}
        className={cn(
          iconButton,
          'text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:ring-brand-500',
        )}
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        aria-label={`Delete ${label}`}
        className={cn(
          iconButton,
          'text-ink-muted hover:bg-danger-soft hover:text-danger focus-visible:ring-danger',
        )}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
