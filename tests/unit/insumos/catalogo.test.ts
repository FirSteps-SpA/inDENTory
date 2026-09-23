import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  CambioInsumo,
  Insumo,
  Movimiento,
  UsuarioActual,
} from '../../../src/lib/db'
import type { MemoryTable } from '../../helpers/memoryDb'

vi.mock('../../../src/lib/db', async () => {
  const { createMemoryDb, MemoryTable } = await import('../../helpers/memoryDb')
  return {
    db: createMemoryDb({
      insumos: new MemoryTable(),
      cambiosInsumo: new MemoryTable(),
      lotes: new MemoryTable(),
      movimientos: new MemoryTable(),
      usuarioActual: new MemoryTable(),
    }),
  }
})

import { db } from '../../../src/lib/db'
import { useAuthStore } from '../../../src/stores/authStore'
import {
  darDeBajaInsumo,
  editarInsumo,
  validarEdicionInsumo,
} from '../../../src/features/insumos/lib/catalogo'

const insumosT = db.insumos as unknown as MemoryTable<Insumo>
const cambiosT = db.cambiosInsumo as unknown as MemoryTable<CambioInsumo>
const movimientosT = db.movimientos as unknown as MemoryTable<Movimiento>

function insumo(overrides: Partial<Insumo>): Insumo {
  return {
    id: 'i1',
    nombre: 'Anestesia',
    categoria: 'Cirugía',
    unidadMedida: 'caja',
    permiteDecimales: false,
    caduca: true,
    codigoFabricante: null,
    creadoEn: '2026-01-01T00:00:00.000Z',
    stockMinimo: null,
    dadoDeBajaEn: null,
    dadoDeBajaPor: null,
    ...overrides,
  }
}

const admin: UsuarioActual = {
  id: 'admin-1',
  email: 'a@x.cl',
  nombre: 'Admin',
  rol: 'administrador',
  autenticadoEn: '2026-01-01T00:00:00.000Z',
}
const personal: UsuarioActual = { ...admin, id: 'personal-1', rol: 'personal' }

const a = insumo({ id: 'i1', nombre: 'Anestesia' })
const b = insumo({ id: 'i2', nombre: 'Fresa Diamante', categoria: 'Fresas' })

beforeEach(() => {
  insumosT.seed([a, b])
  cambiosT.seed([])
  movimientosT.seed([])
  useAuthStore.setState({ usuario: admin, isReady: true })
})

describe('validarEdicionInsumo (FR-014)', () => {
  const activos = [a, b]

  it('rejects an empty name', () => {
    const r = validarEdicionInsumo(a, { nombre: '   ' }, activos)
    expect(r.valido === false && r.errores.nombre).toBeTruthy()
  })

  it('rejects a name used by another active insumo, ignoring case and spaces', () => {
    const r = validarEdicionInsumo(a, { nombre: '  fresa diamante ' }, activos)
    expect(r.valido === false && r.errores.nombre).toMatch(/Ya existe/)
  })

  it('ignores insumos dados de baja for uniqueness', () => {
    const r = validarEdicionInsumo(a, { nombre: 'Fresa Diamante' }, [a])
    expect(r.valido === false && 'nombre' in r.errores).toBe(false)
  })

  it('rejects a negative or (for countable units) decimal stock mínimo', () => {
    const neg = validarEdicionInsumo(a, { stockMinimo: -1 }, activos)
    const dec = validarEdicionInsumo(a, { stockMinimo: 1.5 }, activos)
    const ml = validarEdicionInsumo(
      a,
      { stockMinimo: 1.5, unidadMedida: 'mL' },
      activos,
    )
    expect(neg.valido === false && neg.errores.stockMinimo).toBeTruthy()
    expect(dec.valido === false && dec.errores.stockMinimo).toBeTruthy()
    expect(ml.valido).toBe(true)
  })

  it('rejects an unknown categoría', () => {
    const r = validarEdicionInsumo(a, { categoria: 'Inventada' }, activos)
    expect(r.valido === false && r.errores.categoria).toBeTruthy()
  })
})

describe('editarInsumo (FR-012/FR-013/FR-015)', () => {
  it('throws for personal and writes nothing', async () => {
    useAuthStore.setState({ usuario: personal })
    await expect(editarInsumo('i1', { nombre: 'Otro' })).rejects.toThrow(
      /administrador/,
    )
    expect(cambiosT.all()).toHaveLength(0)
  })

  it('writes one cambio per changed field and reprojects the row', async () => {
    await editarInsumo('i1', {
      nombre: ' Anestesia X ',
      stockMinimo: 4,
      categoria: 'Cirugía',
    })

    const cambios = cambiosT.all()
    expect(cambios.map((c) => c.campo).sort()).toEqual([
      'nombre',
      'stockMinimo',
    ])
    expect(cambios.find((c) => c.campo === 'nombre')).toMatchObject({
      valorAnterior: 'Anestesia',
      valorNuevo: 'Anestesia X',
      usuarioId: 'admin-1',
      sincronizado: false,
      rechazadoEn: null,
    })
    expect(await db.insumos.get('i1')).toMatchObject({
      nombre: 'Anestesia X',
      stockMinimo: 4,
    })
    expect(movimientosT.all()).toHaveLength(0)
  })

  it('writes nothing when nothing changed', async () => {
    await editarInsumo('i1', { nombre: 'Anestesia', stockMinimo: null })
    expect(cambiosT.all()).toHaveLength(0)
  })

  it('rejects an invalid edit', async () => {
    await expect(
      editarInsumo('i1', { nombre: 'Fresa Diamante' }),
    ).rejects.toThrow()
    expect(cambiosT.all()).toHaveLength(0)
  })
})

describe('darDeBajaInsumo (FR-018, Clarification Q5)', () => {
  it('throws for personal', async () => {
    useAuthStore.setState({ usuario: personal })
    await expect(darDeBajaInsumo('i1')).rejects.toThrow(/administrador/)
  })

  it('writes one baja cambio, sets the baja fields and no movimientos; idempotent', async () => {
    await darDeBajaInsumo('i1')
    await darDeBajaInsumo('i1')

    expect(cambiosT.all()).toEqual([
      expect.objectContaining({ campo: 'baja', valorNuevo: true }),
    ])
    expect(await db.insumos.get('i1')).toMatchObject({
      dadoDeBajaPor: 'admin-1',
      dadoDeBajaEn: expect.any(String),
    })
    expect(movimientosT.all()).toHaveLength(0)
  })
})
