import { db } from '../db'
import { computeStockLote } from '../../features/insumos/lib/stock'

/**
 * Recomputes a lot's derived stock from its full movement history and flags
 * it for manual review if negative (FR-014). Never rejects or reverts a
 * movement — this is the sole reconciliation action, run after every sync
 * batch for each lot touched by a `consumo` movement.
 */
export async function reconcileOverdraft(loteId: string): Promise<void> {
  const movimientos = await db.movimientos
    .where('loteId')
    .equals(loteId)
    .toArray()
  const stock = computeStockLote(movimientos)
  if (stock < 0) {
    await db.lotes.update(loteId, { estado: 'revision' })
  }
}
