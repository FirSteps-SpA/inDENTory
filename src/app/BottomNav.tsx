import { Package, PackageMinus, Bell } from '../components/icons'

export type Vista = 'registro' | 'consumo' | 'alertas'

export interface BottomNavProps {
  active: Vista
  onChange: (vista: Vista) => void
}

const TABS: { vista: Vista; label: string; Icon: typeof Package }[] = [
  { vista: 'registro', label: 'Registrar', Icon: Package },
  { vista: 'consumo', label: 'Consumir', Icon: PackageMinus },
  { vista: 'alertas', label: 'Alertas', Icon: Bell },
]

/**
 * Shared bottom navigation (feature 005, FR-003/FR-004, contracts/design-system.md) —
 * purely presentational; `App.tsx` keeps owning the `vista` state exactly as
 * it does today.
 */
export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <div className="flex gap-2 rounded-2xl border border-border bg-surface p-2">
      {TABS.map(({ vista, label, Icon }) => (
        <button
          key={vista}
          type="button"
          onClick={() => onChange(vista)}
          aria-pressed={active === vista}
          className={`touch-target flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold ${
            active === vista ? 'bg-primary text-white' : 'text-text-muted'
          }`}
        >
          <Icon size={20} />
          {label}
        </button>
      ))}
    </div>
  )
}
