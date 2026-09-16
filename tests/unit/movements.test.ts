import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Movimiento } from '../../src/lib/db'

const addMock = vi.fn(async (movimiento: Movimiento) => void movimiento)
let usuarioActualId: string | undefined = 'user-1'

vi.mock('../../src/lib/db', () => ({
  db: {
    movimientos: {
      add: (...args: Parameters<typeof addMock>) => addMock(...args),
    },
  },
}))

vi.mock('../../src/stores/authStore', () => ({
  getUsuarioActualId: () => usuarioActualId,
}))

import * as movementsModule from '../../src/features/insumos/lib/movements'
import { crearMovimiento } from '../../src/features/insumos/lib/movements'

afterEach(() => {
  vi.clearAllMocks()
  usuarioActualId = 'user-1'
})

describe('movements module', () => {
  it('exposes no update/delete/edit function (append-only ledger, FR-015)', () => {
    const exportedNames = Object.keys(movementsModule)
    expect(exportedNames).toContain('crearMovimiento')
    for (const name of exportedNames) {
      expect(name.toLowerCase()).not.toMatch(
        /update|delete|edit|eliminar|actualizar|borrar/,
      )
    }
  })

  it('creates an unsynced movimiento attributed to the current local user', async () => {
    const movimiento = await crearMovimiento({
      tipo: 'ingreso',
      loteId: 'lote-1',
      cantidad: 3,
    })

    expect(movimiento.usuarioId).toBe('user-1')
    expect(movimiento.tipo).toBe('ingreso')
    expect(movimiento.loteId).toBe('lote-1')
    expect(movimiento.cantidad).toBe(3)
    expect(movimiento.movimientoOrigenId).toBeNull()
    expect(movimiento.sincronizado).toBe(false)
    expect(addMock).toHaveBeenCalledWith(movimiento)
  })

  it('sets movimientoOrigenId for an ajuste correcting a prior movimiento', async () => {
    const movimiento = await crearMovimiento({
      tipo: 'ajuste',
      loteId: 'lote-1',
      cantidad: -2,
      movimientoOrigenId: 'movimiento-original',
    })

    expect(movimiento.movimientoOrigenId).toBe('movimiento-original')
  })

  it('throws instead of writing when there is no authenticated local user', async () => {
    usuarioActualId = undefined

    await expect(
      crearMovimiento({ tipo: 'consumo', loteId: 'lote-1', cantidad: 1 }),
    ).rejects.toThrow()
    expect(addMock).not.toHaveBeenCalled()
  })
})
