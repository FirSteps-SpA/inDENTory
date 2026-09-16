import { db } from '../../../lib/db'
import { permiteDecimales } from '../../insumos/lib/quantity'

export interface StockMinimoValidation {
  valid: boolean
  error?: string
}

/**
 * Validates a proposed `stockMinimo` against the insumo's `unidadMedida`
 * (data-model.md's Validation): finite and `>= 0` always — unlike movement
 * quantities (`validateQuantity`), zero is a legitimate mínimo (alert only
 * once fully out of stock) — and only whole numbers for non-decimal units.
 */
export function validateStockMinimo(
  value: number,
  unidadMedida: string,
): StockMinimoValidation {
  if (!Number.isFinite(value) || value < 0) {
    return { valid: false, error: 'Ingresa un stock mínimo mayor o igual a cero.' }
  }
  if (!permiteDecimales(unidadMedida) && !Number.isInteger(value)) {
    return {
      valid: false,
      error: `La unidad "${unidadMedida}" no admite cantidades decimales.`,
    }
  }
  return { valid: true }
}

/**
 * Sets (or clears, with `null`) an insumo's stock mínimo (FR-001). Only
 * callable from an administrador-gated UI (`AlertasView`) — this function
 * itself performs no role check (research.md's client-side gating decision).
 */
export async function actualizarStockMinimo(
  insumoId: string,
  stockMinimo: number | null,
): Promise<void> {
  if (stockMinimo !== null) {
    const insumo = await db.insumos.get(insumoId)
    if (!insumo) {
      throw new Error('El insumo no existe.')
    }
    const validation = validateStockMinimo(stockMinimo, insumo.unidadMedida)
    if (!validation.valid) {
      throw new Error(validation.error)
    }
  }
  await db.insumos.update(insumoId, { stockMinimo })
}

/**
 * Sets the global caducidad-warning day-levels (FR-005). Only callable from
 * an administrador-gated UI (`AlertasView`) — this function itself performs
 * no role check (research.md's client-side gating decision).
 */
export async function actualizarNivelesAviso(dias: number[]): Promise<void> {
  const niveles = dias.filter((dia) => Number.isInteger(dia) && dia > 0)
  if (niveles.length === 0) {
    throw new Error('Ingresa al menos un nivel de aviso válido (días > 0).')
  }
  await db.configuracionAlertas.put({ id: 'global', nivelesAvisoDias: niveles })
}
