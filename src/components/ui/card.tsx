import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lifts the card and adds a hover shadow — for clickable cards (product tiles). */
  interactive?: boolean
}

export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-line bg-surface',
        interactive &&
          'transition-shadow duration-200 hover:border-line-strong hover:shadow-md focus-within:border-brand-500',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-4 sm:p-5', className)} {...props} />
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h2' | 'h3' | 'h4'
}

export function CardTitle({ className, as: Tag = 'h3', ...props }: CardTitleProps) {
  return (
    <Tag className={cn('text-base font-semibold tracking-tight text-ink', className)} {...props} />
  )
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-ink-muted', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 pt-0 sm:p-5 sm:pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-2 border-t border-line p-4 sm:p-5', className)}
      {...props}
    />
  )
}
