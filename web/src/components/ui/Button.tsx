'use client'

import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'gradient' | 'outline' | 'ghost' | 'destructive'
export type ButtonState = 'idle' | 'signing' | 'submitting'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant
  state?: ButtonState
  children: React.ReactNode
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-white text-bg hover:bg-white/90',
  gradient: 'bg-brand text-white shadow-glow',
  outline: 'bg-transparent text-white border border-white/25 hover:border-white/40',
  ghost: 'bg-transparent text-ink-muted hover:text-white',
  destructive: 'bg-transparent text-bad border border-bad hover:bg-bad/10',
}

const STATE_LABEL: Record<Exclude<ButtonState, 'idle'>, string> = {
  signing: 'Waiting for your signature…',
  submitting: 'Submitting to the ledger…',
}

export default function Button({
  variant = 'primary',
  state = 'idle',
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const isBusy = state !== 'idle'
  return (
    <button
      {...rest}
      disabled={disabled || isBusy}
      className={`h-[52px] px-6 rounded-full font-medium text-[15px] transition-colors
        disabled:bg-surface-raised disabled:text-ink-faint disabled:border-0 disabled:cursor-not-allowed
        ${!disabled && !isBusy ? VARIANT_CLASS[variant] : ''} ${className}`}
    >
      {isBusy ? STATE_LABEL[state] : children}
    </button>
  )
}
