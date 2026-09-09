import type { Insumo, Lote, Movimiento } from '../../../lib/db'
import { computeStockLote } from '../../insumos/lib/stock'
import { diasEntre } from '../../../lib/dateMath'

/** data-model.md's AlertaCaducidad view-model — never persisted, always recomputed. */
export interface AlertaCaducidad {
  lote: Lote
  insumo: Insumo
  diasRestantes: number
  nivel: number | 'caducado'
}

/**
 * research.md's urgency-tier algorithm: `'caducado'` when `diasRestantes` is
 * negative; otherwise the smallest configured nivel that is `>= diasRestantes`
 * (the tightest bound the lote currently falls within); `null` when
 * `diasRestantes` exceeds every configured nivel (no alert yet).
 */
function nivelAplicable(
  diasRestantes: number,
  nivelesAvisoDias: number[],
): number | 'caducado' | null {
  if (diasRestantes < 0) return 'caducado'
  const nivelesQueCubren = nivelesAvisoDias.filter(
    (nivel) => nivel >= diasRestantes,
  )
  if (nivelesQueCubren.length === 0) return null
  return Math.min(...nivelesQueCubren)
}

/**
 * One entry per lote with stock disponible whose insumo caduca and whose
 * fecha de caducidad falls within a configured nivel de aviso or has already
 * passed (FR-005, FR-006, FR-007, FR-008).
 */
export function computeAlertasCaducidad(
  insumos: Insumo[],
  lotes: Lote[],
  movimientos: Movimiento[],
  nivelesAvisoDias: number[],
  hoy: Date = new Date(),
): AlertaCaducidad[] {
  const insumosPorId = new Map(insumos.map((insumo) => [insumo.id, insumo]))
  const alertas: AlertaCaducidad[] = []

  for (const lote of lotes) {
    if (!lote.fechaCaducidad) continue

    const insumo = insumosPorId.get(lote.insumoId)
    if (!insumo || !insumo.caduca) continue

    const movimientosDelLote = movimientos.filter(
      (movimiento) => movimiento.loteId === lote.id,
    )
    const stockDisponible = computeStockLote(movimientosDelLote)
    if (stockDisponible <= 0) continue

    const diasRestantes = diasEntre(lote.fechaCaducidad, hoy)
    const nivel = nivelAplicable(diasRestantes, nivelesAvisoDias)
    if (nivel === null) continue

    alertas.push({ lote, insumo, diasRestantes, nivel })
  }

  return alertas
}
