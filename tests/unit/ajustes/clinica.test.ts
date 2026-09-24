import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConfiguracionClinica } from '../../../src/lib/db'
import type { MemoryTable } from '../../helpers/memoryDb'

vi.mock('../../../src/lib/db', async () => {
  const { createMemoryDb, MemoryTable } = await import('../../helpers/memoryDb')
  return {
    db: createMemoryDb({
      configuracionClinica: new MemoryTable(),
    }),
  }
})

import { db } from '../../../src/lib/db'
import { useAuthStore } from '../../../src/stores/authStore'
import { guardarNombreClinica } from '../../../src/features/ajustes/lib/clinica'

const configT = db.configuracionClinica as unknown as MemoryTable<ConfiguracionClinica>

beforeEach(() => {
  useAuthStore.setState({
    usuario: {
      id: 'admin-1',
      email: 'a@x.cl',
      nombre: 'Admin',
      rol: 'administrador',
      autenticadoEn: 'x',
    },
    isReady: true,
  })
})

afterEach(() => {
  configT.rows.clear()
  useAuthStore.setState({ usuario: null, isReady: true })
})

describe('guardarNombreClinica (FR-020/021)', () => {
  it('saves a valid name', async () => {
    await guardarNombreClinica('Clínica Dental Sonrisas')

    expect(configT.all()[0]).toMatchObject({
      id: 'global',
      nombre: 'Clínica Dental Sonrisas',
    })
  })

  it('trims surrounding whitespace', async () => {
    await guardarNombreClinica('  Clínica X  ')

    expect(configT.all()[0].nombre).toBe('Clínica X')
  })

  it('rejects an empty or whitespace-only name without writing', async () => {
    const resultado = await guardarNombreClinica('   ')

    expect(resultado).toMatchObject({ error: expect.any(String) })
    expect(configT.all()).toHaveLength(0)
  })

  it('requires an administrador', async () => {
    useAuthStore.setState({
      usuario: {
        id: 'p1',
        email: 'p@x.cl',
        nombre: 'P',
        rol: 'personal',
        autenticadoEn: 'x',
      },
      isReady: true,
    })

    await expect(guardarNombreClinica('Clínica X')).rejects.toThrow()
  })
})
