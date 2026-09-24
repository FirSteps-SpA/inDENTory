import type { Insumo, Lote, Movimiento } from '../../../lib/db'
import { computeInsumosStockBajo } from './stockBajo'
import { computeAlertasCaducidad } from './caducidad'

export interface PreferenciasNotificacion {
  stockBajo: boolean
  caducidad: boolean
}

/**
 * Cuenta insumos con alertas pendientes de los tipos habilitados (spec 010
 * FR-025/026), para el indicador de la navegación inferior. Reutiliza sin
 * cambios `computeInsumosStockBajo`/`computeAlertasCaducidad` (spec 004);
 * un mismo insumo con, por ejemplo, dos lotes próximos a caducar o con
 * ambos tipos de alerta a la vez cuenta una sola vez.
 */
export function contarAlertasPendientes(
  insumos: Insumo[],
  lotes: Lote[],
  movimientos: Movimiento[],
  nivelesAvisoDias: number[],
  preferencias: PreferenciasNotificacion,
): number {
  const idsConAlerta = new Set<string>()

  if (preferencias.stockBajo) {
    for (const { insumo } of computeInsumosStockBajo(insumos, lotes, movimientos)) {
      idsConAlerta.add(insumo.id)
    }
  }

  if (preferencias.caducidad) {
    for (const { insumo } of computeAlertasCaducidad(
      insumos,
      lotes,
      movimientos,
      nivelesAvisoDias,
    )) {
      idsConAlerta.add(insumo.id)
    }
  }

  return idsConAlerta.size
}
