import type { Insumo, Lote, Movimiento } from '../../../lib/db'
import { computeStockLote } from '../../insumos/lib/stock'

/** data-model.md's AlertaStockBajo view-model — never persisted, always recomputed. */
export interface AlertaStockBajo {
  insumo: Insumo
  stockActual: number
}

/**
 * One entry per insumo whose stock (summed across all its lotes, reusing
 * feature 002's `computeStockLote` per lote) is below its own `stockMinimo`.
 * Insumos with `stockMinimo: null` never appear (FR-002, FR-003, FR-004).
 */
export function computeInsumosStockBajo(
  insumos: Insumo[],
  lotes: Lote[],
  movimientos: Movimiento[],
): AlertaStockBajo[] {
  const alertas: AlertaStockBajo[] = []

  for (const insumo of insumos) {
    if (insumo.stockMinimo === null) continue

    const lotesDelInsumo = lotes.filter((lote) => lote.insumoId === insumo.id)
    const stockActual = lotesDelInsumo.reduce((total, lote) => {
      const movimientosDelLote = movimientos.filter(
        (movimiento) => movimiento.loteId === lote.id,
      )
      return total + computeStockLote(movimientosDelLote)
    }, 0)

    if (stockActual < insumo.stockMinimo) {
      alertas.push({ insumo, stockActual })
    }
  }

  return alertas
}
