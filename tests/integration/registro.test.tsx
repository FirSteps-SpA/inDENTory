import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Insumo, Lote, Movimiento } from '../../src/lib/db'

const insumosAdd = vi.fn(async (insumo: Insumo) => void insumo)
const lotesAdd = vi.fn(async (lote: Lote) => void lote)
const movimientosAdd = vi.fn(async (movimiento: Movimiento) => void movimiento)

vi.mock('../../src/lib/db', () => ({
  db: {
    insumos: {
      add: (...args: Parameters<typeof insumosAdd>) => insumosAdd(...args),
    },
    lotes: {
      add: (...args: Parameters<typeof lotesAdd>) => lotesAdd(...args),
    },
    movimientos: {
      add: (...args: Parameters<typeof movimientosAdd>) =>
        movimientosAdd(...args),
    },
  },
}))

vi.mock('../../src/stores/authStore', () => ({
  getUsuarioActualId: () => 'user-1',
}))

import { RegistroForm } from '../../src/features/insumos/components/RegistroForm'
import { useInventoryStore } from '../../src/stores/inventoryStore'

const insumoExistente: Insumo = {
  id: 'insumo-1',
  nombre: 'Guantes de nitrilo',
  categoria: 'Protección',
  unidadMedida: 'caja',
  permiteDecimales: false,
  caduca: true,
  codigoFabricante: null,
  creadoEn: new Date().toISOString(),
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
}

afterEach(() => {
  vi.clearAllMocks()
  useInventoryStore.setState({ insumos: [], lotes: [], isReady: true })
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

    await waitFor(() => expect(lotesAdd).toHaveBeenCalledTimes(1))
    expect(movimientosAdd).toHaveBeenCalledTimes(1)

    const loteGuardado = lotesAdd.mock.calls[0][0]
    expect(loteGuardado).toMatchObject({
      insumoId: 'insumo-1',
      numeroLote: 'L-100',
      proveedor: 'Proveedor X',
      fechaCaducidad: '2027-01-01',
      estado: 'activo',
    })

    const movimientoGuardado = movimientosAdd.mock.calls[0][0]
    expect(movimientoGuardado).toMatchObject({
      tipo: 'ingreso',
      loteId: loteGuardado.id,
      cantidad: 2,
      usuarioId: 'user-1',
    })

    expect(await screen.findByText(/registrado/)).toBeInTheDocument()
  })

  it('crea un insumo nuevo inline cuando la búsqueda no encuentra coincidencias (FR-003)', async () => {
    useInventoryStore.setState({ insumos: [], lotes: [], isReady: true })

    render(<RegistroForm />)

    fireEvent.change(screen.getByLabelText('Buscar insumo'), {
      target: { value: 'Alginato' },
    })
    expect(
      await screen.findByText(/No se encontraron insumos/),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Crear insumo nuevo' }))
    fireEvent.change(screen.getByLabelText('Categoría'), {
      target: { value: 'Materiales' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar insumo' }))

    await waitFor(() => expect(insumosAdd).toHaveBeenCalledTimes(1))
    expect(insumosAdd.mock.calls[0][0]).toMatchObject({
      nombre: 'Alginato',
      categoria: 'Materiales',
    })

    // Selecting the newly created insumo moves straight into the lote
    // fields, without leaving the form (FR-003).
    expect(await screen.findByLabelText('Número de lote')).toBeInTheDocument()
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

    await waitFor(() => expect(lotesAdd).toHaveBeenCalledTimes(1))
    expect(lotesAdd.mock.calls[0][0]).toMatchObject({
      insumoId: 'insumo-2',
      numeroLote: 'L-200',
      fechaCaducidad: null,
    })
  })
})
