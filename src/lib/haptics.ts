/**
 * Vibración leve tras un consumo rápido (spec 007 FR-006, research.md R4).
 * Safari iOS no implementa la Vibration API y algunos navegadores la
 * bloquean fuera de un gesto del usuario — nunca debe fallar ni bloquear.
 */
export function vibrarLeve(): void {
  try {
    navigator.vibrate?.(15)
  } catch {
    // Sin soporte: no-op.
  }
}
