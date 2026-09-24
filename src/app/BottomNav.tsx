import { Package, Bell, ShoppingCart, Settings } from '../components/icons'

export type Vista = 'inventario' | 'compras' | 'alertas' | 'mas'

export interface BottomNavProps {
  active: Vista
  onChange: (vista: Vista) => void
  /** spec 010 FR-026 — total de alertas pendientes según preferencias; burbuja oculta si es 0/undefined. */
  alertasBadge?: number
}

const TABS: { vista: Vista; label: string; Icon: typeof Package }[] = [
  { vista: 'inventario', label: 'Inventario', Icon: Package },
  { vista: 'compras', label: 'Compras', Icon: ShoppingCart },
  { vista: 'alertas', label: 'Alertas', Icon: Bell },
  { vista: 'mas', label: 'Más', Icon: Settings },
]

/**
 * Shared bottom navigation — 4 secciones (Inventario/Compras/Alertas/Más,
 * spec 006 FR-001/FR-002), reemplazando la navegación de 3 pestañas
 * (Registrar/Consumir/Alertas) de la spec 005. Purely presentational;
 * `App.tsx` keeps owning the `vista` state.
 */
export function BottomNav({ active, onChange, alertasBadge }: BottomNavProps) {
  return (
    <div className="flex gap-2 rounded-2xl border border-border bg-surface p-2">
      {TABS.map(({ vista, label, Icon }) => (
        <button
          key={vista}
          type="button"
          onClick={() => onChange(vista)}
          aria-pressed={active === vista}
          className={`touch-target relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold ${
            active === vista ? 'bg-primary text-white' : 'text-text-muted'
          }`}
        >
          <span className="relative">
            <Icon size={20} />
            {vista === 'alertas' && !!alertasBadge && alertasBadge > 0 && (
              <span
                aria-label={`${alertasBadge} alertas pendientes`}
                className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white"
              >
                {alertasBadge}
              </span>
            )}
          </span>
          {label}
        </button>
      ))}
    </div>
  )
}
