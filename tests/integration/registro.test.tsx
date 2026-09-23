import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Categoria, Insumo, Lote, Movimiento, UsuarioActual } from '../../src/lib/db'
import type { MemoryTable } from '../helpers/memoryDb'

vi.mock('../../src/lib/db', async () => {
  const { createMemoryDb, MemoryTable } = await import('../helpers/memoryDb')
  return {
    db: createMemoryDb({
      insumos: new MemoryTable(),
      categorias: new MemoryTable(),
      lotes: new MemoryTable(),
      movimientos: new MemoryTable(),
      borradores: new MemoryTable(),
      cambiosInsumo: new MemoryTable(),
      usuarioActual: new MemoryTable(),
    }),
  }
})

import { db } from '../../src/lib/db'
import { RegistroForm } from '../../src/features/insumos/components/RegistroForm'
import { useInventoryStore } from '../../src/stores/inventoryStore'
import { useAuthStore } from '../../src/stores/authStore'

const insumosT = db.insumos as unknown as MemoryTable<Insumo>
const categoriasT = db.categorias as unknown as MemoryTable<Categoria>
const lotesT = db.lotes as unknown as MemoryTable<Lote>
const movimientosT = db.movimientos as unknown as MemoryTable<Movimiento>

const insumoExistente: Insumo = {
  id: 'insumo-1',
  nombre: 'Guantes de nitrilo',
  categoria: 'Protección',
  unidadMedida: 'caja',
  permiteDecimales: false,
  caduca: true,
  codigoFabricante: null,
  creadoEn: new Date().toISOString(),
  stockMinimo: null,
  dadoDeBajaEn: null,
  dadoDeBajaPor: null,
  creadoPor: null,
}

const insumoNoCaduca: Insumo = {
  id: 'insumo-2',
  nombre: 'Espejo bucal',
  categoria: 'Instrumental',
  unidadMedida: 'pieza',
  permiteDecimales: false,
  caduca: false,
  codigoFabricante: null,
  creadoEn: new Date().toISOString(),
  stockMinimo: null,
  dadoDeBajaEn: null,
  dadoDeBajaPor: null,
  creadoPor: null,
}

const personal: UsuarioActual = {
  id: 'user-1',
  email: 'p@x.cl',
  nombre: 'Personal',
  rol: 'personal',
  autenticadoEn: '2026-01-01T00:00:00.000Z',
}

beforeEach(() => {
  insumosT.seed([])
  categoriasT.seed([])
  lotesT.seed([])
  movimientosT.seed([])
  useAuthStore.setState({ usuario: personal, isReady: true })
})

afterEach(() => {
  vi.clearAllMocks()
  useInventoryStore.setState({ insumos: [], lotes: [], categorias: [], isReady: true })
})

describe('RegistroForm (User Story 1, quickstart Scenario 1)', () => {
  it('busca un insumo existente, completa el lote, y lo guarda sin tocar el escaneo', async () => {
    useInventoryStore.setState({
      insumos: [insumoExistente],
      lotes: [],
      isReady: true,
    })

    render(<RegistroForm />)

    fireEvent.change(screen.getByLabelText('Buscar insumo'), {
      target: { value: 'Guantes' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Guantes de nitrilo/ }))

    fireEvent.change(screen.getByLabelText('Número de lote'), {
      target: { value: 'L-100' },
    })
    fireEvent.change(screen.getByLabelText('Proveedor'), {
      target: { value: 'Proveedor X' },
    })
    fireEvent.change(screen.getByLabelText('Fecha de caducidad'), {
      target: { value: '2027-01-01' },
    })
    fireEvent.change(screen.getByLabelText(/Cantidad/), {
      target: { value: '2' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Guardar lote' }))

    await waitFor(() => expect(lotesT.all()).toHaveLength(1))
    expect(movimientosT.all()).toHaveLength(1)

    const loteGuardado = lotesT.all()[0]
    expect(loteGuardado).toMatchObject({
      insumoId: 'insumo-1',
      numeroLote: 'L-100',
      proveedor: 'Proveedor X',
      fechaCaducidad: '2027-01-01',
      estado: 'activo',
    })

    const movimientoGuardado = movimientosT.all()[0]
    expect(movimientoGuardado).toMatchObject({
      tipo: 'ingreso',
      loteId: loteGuardado.id,
      cantidad: 2,
      usuarioId: 'user-1',
    })

    expect(await screen.findByText(/registrado/)).toBeInTheDocument()
  })

  it('abre "Nuevo Material" con el nombre prefilled cuando la búsqueda no encuentra coincidencias (FR-003/FR-004)', async () => {
    useInventoryStore.setState({
      insumos: [],
      lotes: [],
      categorias: [],
      isReady: true,
    })

    render(<RegistroForm />)

    fireEvent.change(screen.getByLabelText('Buscar insumo'), {
      target: { value: 'Alginato' },
    })
    expect(
      await screen.findByText(/No se encontraron insumos/),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Crear insumo nuevo' }))

    expect(
      await screen.findByRole('heading', { name: 'Nuevo Material' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre del material')).toHaveValue('Alginato')

    fireEvent.change(screen.getByLabelText('Categoría'), {
      target: { value: 'Fresas' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(insumosT.all()).toHaveLength(1))
    expect(insumosT.all()[0]).toMatchObject({
      nombre: 'Alginato',
      categoria: 'Fresas',
    })

    // Selecting the newly created insumo moves straight into the lote
    // fields, without leaving the form (FR-003).
    expect(await screen.findByLabelText('Número de lote')).toBeInTheDocument()
  })

  it('con stock inicial muestra el mensaje de éxito y vuelve a la búsqueda (spec 008 R7)', async () => {
    useInventoryStore.setState({
      insumos: [],
      lotes: [],
      categorias: [],
      isReady: true,
    })

    render(<RegistroForm />)

    fireEvent.change(screen.getByLabelText('Buscar insumo'), {
      target: { value: 'Hilo sutura' },
    })
    await screen.findByText(/No se encontraron insumos/)
    fireEvent.click(screen.getByRole('button', { name: 'Crear insumo nuevo' }))
    await screen.findByRole('heading', { name: 'Nuevo Material' })

    fireEvent.change(screen.getByLabelText('Categoría'), {
      target: { value: 'Fresas' },
    })
    // Stock mínimo's Stepper renders first, then Stock inicial's.
    fireEvent.click(screen.getAllByRole('button', { name: 'Sumar uno' })[1])
    fireEvent.change(screen.getByLabelText('Número de lote'), {
      target: { value: 'L-1' },
    })
    fireEvent.change(screen.getByLabelText('Proveedor'), {
      target: { value: 'Prov' },
    })
    fireEvent.change(screen.getByLabelText('Fecha de vencimiento'), {
      target: { value: '2027-01-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar e Ingresar' }))

    expect(
      await screen.findByText('Lote de "Hilo sutura" registrado.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Buscar insumo')).toBeInTheDocument()
  })

  it('no pide fecha de caducidad para un insumo marcado como que no caduca (FR-002b)', async () => {
    useInventoryStore.setState({
      insumos: [insumoNoCaduca],
      lotes: [],
      isReady: true,
    })

    render(<RegistroForm />)

    fireEvent.change(screen.getByLabelText('Buscar insumo'), {
      target: { value: 'Espejo' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Espejo bucal/ }))

    expect(
      screen.queryByLabelText('Fecha de caducidad'),
    ).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Número de lote'), {
      target: { value: 'L-200' },
    })
    fireEvent.change(screen.getByLabelText('Proveedor'), {
      target: { value: 'Proveedor Y' },
    })
    fireEvent.change(screen.getByLabelText(/Cantidad/), {
      target: { value: '5' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Guardar lote' }))

    await waitFor(() => expect(lotesT.all()).toHaveLength(1))
    expect(lotesT.all()[0]).toMatchObject({
      insumoId: 'insumo-2',
      numeroLote: 'L-200',
      fechaCaducidad: null,
    })
  })
})
