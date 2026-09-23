import type { EstadoInsumo, Estado } from '../lib/estado'
import { AlertTriangle, PackageMinus, Check, ChevronRight } from '../../../components/icons'
import { Badge, type BadgeVariant } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'

export interface InsumoCardProps {
  estadoInsumo: EstadoInsumo
  onOpen: (insumoId: string) => void
}

const BADGE_POR_ESTADO: Record<
  Estado,
  { variant: BadgeVariant; Icon: typeof Check; label: string }
> = {
  ok: { variant: 'success', Icon: Check, label: 'Ok' },
  'bajo-stock': { variant: 'warning-30', Icon: PackageMinus, label: 'Bajo Stock' },
  'proximo-a-caducar': {
    variant: 'urgent-7',
    Icon: AlertTriangle,
    label: 'Próximo a caducar',
  },
  caducado: { variant: 'danger', Icon: AlertTriangle, label: 'Caducado' },
}

/**
 * Tarjeta de listado de solo lectura (spec 006 FR-009/FR-010): el estado de
 * salud combina color + ícono + etiqueta de texto, nunca solo color (spec
 * Clarifications). Sin acciones de consumo/edición/eliminación — llegan en
 * la spec 007 (Assumptions).
 */
export function InsumoCard({ estadoInsumo, onOpen }: InsumoCardProps) {
  const { insumo, estado, stockTotal, loteMasProximoAVencer } = estadoInsumo
  const badge = BADGE_POR_ESTADO[estado]

  return (
    <Card
      as="button"
      type="button"
      onClick={() => onOpen(insumo.id)}
      className="touch-target flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
    >
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-text-muted">{insumo.categoria}</span>
          <Badge variant={badge.variant}>
            <badge.Icon size={12} />
            {badge.label}
          </Badge>
        </div>
        <span className="text-sm font-bold text-text">{insumo.nombre}</span>
        {loteMasProximoAVencer?.fechaCaducidad && (
          <span className="text-xs text-text-faint">
            Lote {loteMasProximoAVencer.numeroLote} — vence{' '}
            {loteMasProximoAVencer.fechaCaducidad}
          </span>
        )}
        <span className="text-sm font-bold text-text-muted">
          {stockTotal} {insumo.unidadMedida}
        </span>
      </div>
      <ChevronRight size={18} className="shrink-0 text-text-faint" />
    </Card>
  )
}
