import type { Movimiento } from '../../../lib/db'

/**
 * A lot's available stock is always derived from its full movement history,
 * never a mutable counter (data-model.md) — this is what makes the
 * "never lose a transaction" guarantee (FR-014) straightforward.
 */
export function computeStockLote(movimientos: Movimiento[]): number {
  return movimientos.reduce((total, movimiento) => {
    switch (movimiento.tipo) {
      case 'ingreso':
        return total + movimiento.cantidad
      case 'consumo':
        return total - movimiento.cantidad
      case 'ajuste':
        return total + movimiento.cantidad
      default:
        return total
    }
  }, 0)
}
