import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { useClinicaStore } from '../stores/clinicaStore'
import { APP_NAME } from '../lib/branding'
import { Tooth } from '../components/icons'

function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Shared authenticated-shell header (feature 005, FR-004, contracts/design-system.md):
 * logo mark, a pill showing the configured clinic name (spec 010 FR-020,
 * `useClinicaStore` — falls back to "Gabinete" until one is set), a binary
 * connection indicator reading the *existing* `useAppStore().isBackendConnected`
 * flag (not a pending-operations counter — spec Clarifications excludes
 * that), and an avatar-initials chip. Identical on every authenticated screen.
 *
 * No renderiza sesión/cerrar sesión (spec 011 FR-006/FR-007) — esa
 * información y acción viven únicamente en Ajustes → Perfil
 * (`PerfilSection.tsx`) para evitar duplicación.
 */
export function AppHeader() {
  const usuario = useAuthStore((s) => s.usuario)
  const isBackendConnected = useAppStore((s) => s.isBackendConnected)
  const nombreClinica = useClinicaStore((s) => s.nombreClinica)

  return (
    <div className="flex w-full items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-primary-dark">
        <Tooth size={20} className="text-white" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-extrabold tracking-tight text-text">
          {APP_NAME}
        </span>
        <span className="inline-flex w-fit items-center rounded-full border border-primary bg-primary-soft px-2 py-px text-[10px] font-bold text-primary">
          {nombreClinica ?? 'Gabinete'}
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
  )
}
