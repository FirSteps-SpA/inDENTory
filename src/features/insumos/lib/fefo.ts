import type { Lote } from '../../../lib/db'

export interface LoteConStock {
  lote: Lote
  stockDisponible: number
}

/**
 * Orders by `fechaCaducidad` ascending, treating `null` (insumo marked as
 * not expiring, FR-002b) as sorting after every dated value — a lote with
 * no fecha de caducidad is a last resort, never picked ahead of a dated one.
 */
export function compararFefo(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a.localeCompare(b)
}

/**
 * FEFO (First-Expire-First-Out) default lot pick (FR-006): among lots with
 * stock available, prefers the earliest-expiring lot that can fully cover
 * `cantidadNecesaria`; if none can, falls back to the earliest-expiring lot
 * with any stock (so a manual override or an explicit over-consumption
 * rejection has a concrete lot to reason about). Lotes without a fecha de
 * caducidad (FR-002b) are always ordered last — consumed only once every
 * dated lote of the same insumo is exhausted. Returns `null` only when no
 * lot has any stock at all. Pure function — no Dexie/React dependency, so
 * it's directly unit-testable and reusable to validate a manual override.
 */
export function selectFefoLot(
  lotesConStock: LoteConStock[],
  cantidadNecesaria: number,
): LoteConStock | null {
  const conStock = [...lotesConStock]
    .filter((entry) => entry.stockDisponible > 0)
    .sort((a, b) => compararFefo(a.lote.fechaCaducidad, b.lote.fechaCaducidad))

  if (conStock.length === 0) return null

  return (
    conStock.find((entry) => entry.stockDisponible >= cantidadNecesaria) ??
    conStock[0]
  )
}
