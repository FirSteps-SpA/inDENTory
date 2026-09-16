/**
 * Shared UTC-safe day-difference helper — extracted from feature 004's
 * `src/features/alertas/lib/caducidad.ts` (feature 005, FR-002a, data-model.md)
 * so this exact timezone-sensitive calculation isn't duplicated.
 *
 * `fechaCaducidad` is a date-only ISO string, which `new Date(...)` parses
 * as UTC midnight. Comparing it against `hoy` must stay in that same UTC
 * frame — using `Date#setHours` (local time) here would shift the result by
 * a day in any timezone other than UTC (e.g. America/Santiago, UTC-3).
 */
export function diasEntre(fechaCaducidad: string, hoy: Date): number {
  const fin = new Date(fechaCaducidad)
  const inicio = new Date(
    Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()),
  )
  const msPorDia = 24 * 60 * 60 * 1000
  return Math.round((fin.getTime() - inicio.getTime()) / msPorDia)
}

/**
 * "Vida útil restante estimada" (feature 005, FR-002a) — a render-time-only
 * derived display, never persisted. Returns `null` for an empty/invalid
 * fecha de caducidad rather than throwing, since the caller renders it
 * against an in-progress form field.
 */
export function mesesRestantes(
  fechaCaducidad: string,
  hoy: Date = new Date(),
): number | null {
  if (!fechaCaducidad) return null
  const dias = diasEntre(fechaCaducidad, hoy)
  if (Number.isNaN(dias)) return null
  return Math.round(dias / 30)
}
