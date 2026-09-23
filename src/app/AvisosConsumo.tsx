import { useAvisosStore, type Aviso } from '../stores/avisosStore'
import { AlertTriangle, Check, Undo } from '../components/icons'
import { TouchButton } from '../components/ui/TouchButton'

function textoAviso(aviso: Aviso): string {
  if (aviso.tipo === 'cambio-rechazado') {
    return `Tu cambio en «${aviso.insumoNombre}» no se guardó: ya no tienes permisos de administrador.`
  }
  if (aviso.estado === 'revertido') return 'Consumo revertido'
  return `Consumido 1 ${aviso.unidadMedida ?? ''} de ${aviso.insumoNombre}`.replace(
    '  ',
    ' ',
  )
}

/**
 * Pila de avisos temporales (spec 007 FR-006/FR-009/FR-021b), montada una
 * sola vez en `App.tsx` fuera de las vistas para que sobreviva a la
 * navegación entre secciones. Máx. 3 avisos (avisosStore); "Deshacer" solo
 * en avisos de consumo pendientes.
 */
export function AvisosConsumo() {
  const avisos = useAvisosStore((s) => s.avisos)
  const deshacer = useAvisosStore((s) => s.deshacer)

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 px-4"
    >
      {avisos.map((aviso) => (
        <div
          key={aviso.id}
          className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[14px] bg-text px-3.5 py-1.5 text-left text-sm text-white shadow-lg"
        >
          {aviso.tipo === 'cambio-rechazado' ? (
            <AlertTriangle size={18} className="shrink-0" />
          ) : (
            <Check size={18} className="shrink-0" />
          )}
          <span className="flex-1 py-2">{textoAviso(aviso)}</span>
          {aviso.tipo === 'consumo' && aviso.estado === 'pendiente' && (
            <TouchButton
              type="button"
              variant="ghost"
              onClick={() => void deshacer(aviso.id).catch(() => undefined)}
              aria-label={`Deshacer consumo de ${aviso.insumoNombre}`}
              className="shrink-0 border-white/30 bg-transparent text-white"
            >
              <Undo size={16} />
              Deshacer
            </TouchButton>
          )}
        </div>
      ))}
    </div>
  )
}
