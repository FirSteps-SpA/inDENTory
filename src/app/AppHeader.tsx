import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { Tooth } from '../components/icons'
import { TouchButton } from '../components/ui/TouchButton'

function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('')
}

export interface AppHeaderProps {
  /** When provided, renders the existing "Sesión iniciada como X" / "Cerrar
   * sesión" row (spec FR-002/FR-007 — exact text preserved from before this
   * redesign) below the identity bar. */
  onSignOut?: () => void
}

/**
 * Shared authenticated-shell header (feature 005, FR-004, contracts/design-system.md):
 * logo mark, "Gabinete" pill, a binary connection indicator reading the
 * *existing* `useAppStore().isBackendConnected` flag (not a pending-operations
 * counter — spec Clarifications excludes that), and an avatar-initials chip.
 * Identical on every authenticated screen.
 */
export function AppHeader({ onSignOut }: AppHeaderProps) {
  const usuario = useAuthStore((s) => s.usuario)
  const isBackendConnected = useAppStore((s) => s.isBackendConnected)

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-primary-dark">
          <Tooth size={20} className="text-white" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-extrabold tracking-tight text-text">
            inDENTory
          </span>
          <span className="inline-flex w-fit items-center rounded-full border border-primary bg-primary-soft px-2 py-px text-[10px] font-bold text-primary">
            Gabinete
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${isBackendConnected ? 'bg-success-dot' : 'bg-text-faint'}`}
          />
          <span className="text-[11px] font-semibold text-text-muted">
            {isBackendConnected ? 'Sincronizado' : 'Sin conexión'}
          </span>
        </div>
        {usuario && (
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
            {iniciales(usuario.nombre)}
          </div>
        )}
      </div>

      {usuario && onSignOut && (
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="min-w-0 truncate text-sm text-text-muted">
            Sesión iniciada como {usuario.nombre}
          </p>
          <TouchButton
            variant="ghost"
            onClick={onSignOut}
            className="shrink-0 whitespace-nowrap text-sm"
          >
            Cerrar sesión
          </TouchButton>
        </div>
      )}
    </div>
  )
}
