import type { ReactNode } from 'react'

export interface IconFieldProps {
  label: string
  /** Omit for fields with no natural icon match — the label still renders. */
  icon?: ReactNode
  htmlFor: string
  hint?: string
  error?: string
  /** The `<input>`/`<select>` itself — style it as a plain, borderless,
   * transparent-background control; this wrapper provides the border,
   * padding, and >=48px touch target (FR-003). */
  children: ReactNode
}

/**
 * Shared label + icon + input wrapper (feature 005, contracts/design-system.md).
 * One place enforces the >=48px minimum height (Constitution III, FR-003) so
 * no restyled field can accidentally ship under it.
 */
export function IconField({
  label,
  icon,
  htmlFor,
  hint,
  error,
  children,
}: IconFieldProps) {
  return (
    <div className="flex flex-col gap-1.5 text-sm font-bold text-text">
      <label htmlFor={htmlFor} className="flex items-center gap-1.5">
        {icon && <span className="text-primary">{icon}</span>}
        {label}
      </label>
      <div className="touch-target flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 focus-within:border-primary">
        {children}
      </div>
      {hint && <p className="text-xs text-text-faint">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
