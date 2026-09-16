import { db, type Insumo, type Lote, type Movimiento } from '../../../lib/db'
import { computeStockLote } from '../../insumos/lib/stock'

/** data-model.md's AlertaRevision view-model — never persisted, always recomputed. */
export interface AlertaRevision {
  lote: Lote
  insumo: Insumo
  stockDerivado: number
}

/**
 * One entry per lote flagged `estado: 'revision'` by feature 002's overdraft
 * reconciliation (FR-009), with its current (possibly negative) derived
 * stock for display of "the overdraft that caused this".
 */
export function lotesEnRevision(
  insumos: Insumo[],
  lotes: Lote[],
  movimientos: Movimiento[],
): AlertaRevision[] {
  const insumosPorId = new Map(insumos.map((insumo) => [insumo.id, insumo]))
  const alertas: AlertaRevision[] = []

  for (const lote of lotes) {
    if (lote.estado !== 'revision') continue
    const insumo = insumosPorId.get(lote.insumoId)
    if (!insumo) continue

    const movimientosDelLote = movimientos.filter(
      (movimiento) => movimiento.loteId === lote.id,
    )
    alertas.push({
      lote,
      insumo,
      stockDerivado: computeStockLote(movimientosDelLote),
    })
  }

  return alertas
}

/**
 * Marks a lote en revisión as resuelto (FR-010), returning it to `'activo'`.
 * Only callable from an administrador-gated UI (`AlertasView`) — this
 * function itself performs no role check (research.md's client-side gating
 * decision). Assumes the administrador already corrected the stock via an
 * `ajuste` movimiento (spec 002, FR-015) before calling this.
 */
export async function marcarLoteResuelto(loteId: string): Promise<void> {
  await db.lotes.update(loteId, { estado: 'activo' })
}
