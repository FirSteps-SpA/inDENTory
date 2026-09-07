import { describe, expect, it } from 'vitest'
import { validateQuantity } from '../../src/features/insumos/lib/quantity'

describe('validateQuantity', () => {
  it('accepts a decimal quantity for a mL unit', () => {
    expect(validateQuantity(2.5, 'mL')).toEqual({ valid: true })
  })

  it('accepts a decimal quantity for a g unit', () => {
    expect(validateQuantity(0.75, 'g')).toEqual({ valid: true })
  })

  it('rejects a decimal quantity for a pieza unit', () => {
    const result = validateQuantity(2.5, 'pieza')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/no admite cantidades decimales/)
  })

  it('rejects a decimal quantity for a caja unit', () => {
    const result = validateQuantity(1.2, 'caja')
    expect(result.valid).toBe(false)
  })

  it('accepts an integer quantity for a pieza unit', () => {
    expect(validateQuantity(3, 'pieza')).toEqual({ valid: true })
  })

  it('rejects zero and negative quantities regardless of unit', () => {
    expect(validateQuantity(0, 'mL').valid).toBe(false)
    expect(validateQuantity(-1, 'mL').valid).toBe(false)
  })

  it('rejects non-finite quantities', () => {
    expect(validateQuantity(Number.NaN, 'mL').valid).toBe(false)
    expect(validateQuantity(Number.POSITIVE_INFINITY, 'mL').valid).toBe(false)
  })
})
