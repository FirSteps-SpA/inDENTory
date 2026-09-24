export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}

/**
 * Interruptor on/off accesible (research.md R5) — `role="switch"` nativo,
 * ≥48×48px de área táctil aunque su marca visual sea más chica. Sin
 * dependencias nuevas: solo Tailwind + ARIA.
 */
export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`touch-target flex w-14 items-center rounded-full border-[1.5px] px-1 transition-colors ${
        checked
          ? 'border-primary bg-primary justify-end'
          : 'border-border bg-surface justify-start'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow" />
    </button>
  )
}
