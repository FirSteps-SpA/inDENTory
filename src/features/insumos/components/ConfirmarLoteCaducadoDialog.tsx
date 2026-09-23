import { BottomSheet } from '../../../components/ui/BottomSheet'
import { TouchButton } from '../../../components/ui/TouchButton'

export interface ConfirmarLoteCaducadoDialogProps {
  fechaCaducidad: string
  onConfirmar: () => void
  onCancelar: () => void
}

function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio}`
}

/**
 * Confirmación de lote ya caducado (spec 008 FR-017/FR-018). Modelado en
 * `ConfirmarBajaDialog.tsx`: no bloquea, solo exige un toque explícito antes
 * de que el ingreso quede registrado con una fecha pasada.
 */
export function ConfirmarLoteCaducadoDialog({
  fechaCaducidad,
  onConfirmar,
  onCancelar,
}: ConfirmarLoteCaducadoDialogProps) {
  return (
    <BottomSheet titulo="Este lote ingresaría ya caducado" onClose={onCancelar}>
      <p className="text-sm text-text">
        La fecha de vencimiento ({formatearFecha(fechaCaducidad)}) ya pasó.
        Aparecerá de inmediato en Alertas.
      </p>
      <div className="flex gap-2">
        <TouchButton
          type="button"
          variant="ghost"
          onClick={onCancelar}
          className="flex-1"
        >
          Revisar fecha
        </TouchButton>
        <TouchButton type="button" onClick={onConfirmar} className="flex-1">
          Guardar igual
        </TouchButton>
      </div>
    </BottomSheet>
  )
}
