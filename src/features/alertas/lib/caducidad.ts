import type { Insumo, Lote, Movimiento } from '../../../lib/db'
import { computeStockLote } from '../../insumos/lib/stock'

/** data-model.md's AlertaCaducidad view-model — never persisted, always recomputed. */
export interface AlertaCaducidad {
  lote: Lote
  insumo: Insumo
  diasRestantes: number
  nivel: number | 'caducado'
}

/**
 * `fechaCaducidad` is a date-only ISO string, which `new Date(...)` parses
 * as UTC midnight. Comparing it against `hoy` must stay in that same UTC
 * frame — using `Date#setHours` (local time) here would shift the result by
 * a day in any timezone other than UTC (e.g. America/Santiago, UTC-3).
 */
function diasEntre(fechaCaducidad: string, hoy: Date): number {
  const fin = new Date(fechaCaducidad)
  const inicio = new Date(
    Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()),
  )
  const msPorDia = 24 * 60 * 60 * 1000
  return Math.round((fin.getTime() - inicio.getTime()) / msPorDia)
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
