import type { Lote, Movimiento } from '../../../lib/db'
import { computeStockLote } from './stock'
import { selectFefoLot, type LoteConStock } from './fefo'

/**
 * Lote con stock disponible que expira antes, para mostrar en la tarjeta del
 * listado (spec 006 FR-009). Reutiliza `selectFefoLot` (feature 002) con
 * `cantidadNecesaria = 0`: con ese umbral, el primer resultado que cumple
 * `stockDisponible >= 0` es siempre el lote con stock que expira antes,
 * exactamente el mismo orden que ya usa y prueba el flujo de consumo FEFO —
 * evita reimplementar `compareFechaCaducidad` (research.md).
 */
export function loteMasProximoAVencer(
  lotes: Lote[],
  movimientos: Movimiento[],
): Lote | null {
  const lotesConStock: LoteConStock[] = lotes.map((lote) => ({
    lote,
    stockDisponible: computeStockLote(
      movimientos.filter((movimiento) => movimiento.loteId === lote.id),
    ),
  }))

  const seleccionado = selectFefoLot(lotesConStock, 0)
  return seleccionado?.lote ?? null
}
