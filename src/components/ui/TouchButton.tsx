import type { ButtonHTMLAttributes } from 'react'

export interface TouchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
}

const VARIANT_CLASSES: Record<NonNullable<TouchButtonProps['variant']>, string> = {
  primary: 'bg-primary text-white disabled:opacity-50',
  secondary: 'border-[1.5px] border-primary bg-primary-soft text-primary',
  ghost: 'border border-border bg-surface text-text',
}

/**
 * Shared button (feature 005, contracts/design-system.md) — bakes in the
 * >=48x48px touch target (Constitution III, FR-003) so no call site has to
 * remember the `touch-target` utility individually.
 */
export function TouchButton({
  variant = 'primary',
  className = '',
  ...props
}: TouchButtonProps) {
  return (
    <button
      {...props}
      className={`touch-target flex items-center justify-center gap-2 rounded-xl px-4 font-bold ${VARIANT_CLASSES[variant]} ${className}`}
    />
  )
}
