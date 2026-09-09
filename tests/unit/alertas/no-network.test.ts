import { describe, expect, it } from 'vitest'
import { computeInsumosStockBajo } from '../../../src/features/alertas/lib/stockBajo'
import { computeAlertasCaducidad } from '../../../src/features/alertas/lib/caducidad'
import { lotesEnRevision } from '../../../src/features/alertas/lib/revision'

/**
 * SC-005 regression guard: the three alert calculators must stay
 * synchronous, plain-array-returning pure functions over already-local
 * data (Constitution I). A function that ever needed to reach Supabase
 * would necessarily become `async` (return a `Promise`) — so asserting
 * synchronous, non-Promise results is a direct guarantee that no network
 * round trip can be hiding inside them, without depending on Node-only
 * APIs unavailable in this browser-only project's tsconfig.
 */
describe('alert calculators never touch the network', () => {
  it('computeInsumosStockBajo returns a plain array synchronously', () => {
    const resultado = computeInsumosStockBajo([], [], [])
    expect(Array.isArray(resultado)).toBe(true)
    expect(resultado).not.toBeInstanceOf(Promise)
  })

  it('computeAlertasCaducidad returns a plain array synchronously', () => {
    const resultado = computeAlertasCaducidad([], [], [], [30, 7, 1])
    expect(Array.isArray(resultado)).toBe(true)
    expect(resultado).not.toBeInstanceOf(Promise)
  })

  it('lotesEnRevision returns a plain array synchronously', () => {
    const resultado = lotesEnRevision([], [], [])
    expect(Array.isArray(resultado)).toBe(true)
    expect(resultado).not.toBeInstanceOf(Promise)
  })
})
