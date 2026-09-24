import type { Insumo, Lote, Movimiento } from '../../../lib/db'
import { computeInsumosStockBajo } from '../../alertas/lib/stockBajo'
import { computeAlertasCaducidad } from '../../alertas/lib/caducidad'

/** data-model.md's ItemSugerido view-model — never persisted, always recomputed. */
export interface ItemSugerido {
  insumo: Insumo
  stockBajo: boolean
  caducado: boolean
}

/**
 * Une `computeInsumosStockBajo` y `computeAlertasCaducidad` (nivel
 * `'caducado'`) por `insumo.id` (spec 009 FR-004/FR-005/FR-006,
 * research.md R5) — sin reimplementar ninguna regla de alerta. Un insumo
 * dado de baja nunca aparece porque `insumos` ya viene filtrado por
 * `inventoryStore` (FR-008).
 */
export function computeItemsSugeridos(
  insumos: Insumo[],
  lotes: Lote[],
  movimientos: Movimiento[],
): ItemSugerido[] {
  const stockBajoIds = new Set(
    computeInsumosStockBajo(insumos, lotes, movimientos).map(
      ({ insumo }) => insumo.id,
    ),
  )
  // `nivelesAvisoDias: []` — el nivel 'caducado' de computeAlertasCaducidad
  // depende solo de `diasRestantes < 0`, nunca de los niveles configurados
  // (ver caducidad.ts's nivelAplicable), así que no hace falta leer
  // `alertasStore` aquí para quedarnos solo con los ya vencidos.
  const caducadoIds = new Set(
    computeAlertasCaducidad(insumos, lotes, movimientos, [])
      .filter((alerta) => alerta.nivel === 'caducado')
      .map((alerta) => alerta.insumo.id),
  )

  const items: ItemSugerido[] = []
  for (const insumo of insumos) {
    const stockBajo = stockBajoIds.has(insumo.id)
    const caducado = caducadoIds.has(insumo.id)
    if (stockBajo || caducado) items.push({ insumo, stockBajo, caducado })
  }
  return items
}
