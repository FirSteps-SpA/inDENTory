import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { BottomNav, type Vista } from '../../src/app/BottomNav'
import { InventarioView } from '../../src/features/insumos/components/InventarioView'
import { ComprasPlaceholder } from '../../src/features/compras/components/ComprasPlaceholder'
import { AlertasView } from '../../src/features/alertas/components/AlertasView'
import { MasView } from '../../src/features/mas/components/MasView'
import { useInventoryStore } from '../../src/stores/inventoryStore'
import { useAuthStore } from '../../src/stores/authStore'

vi.mock('../../src/lib/db', () => ({
  db: {
    insumos: { add: vi.fn() },
    lotes: { add: vi.fn() },
    movimientos: { add: vi.fn() },
    configuracionAlertas: { get: async () => undefined, put: async () => undefined },
  },
}))

vi.mock('../../src/stores/authStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/stores/authStore')>()
  return { ...actual, getUsuarioActualId: () => 'user-1' }
})

/**
 * Reproduce el switch de 4 secciones que `App.tsx` monta tras el arranque de
 * autenticación (spec 006 FR-001/FR-002) — se prueba aquí sin el envoltorio
 * de auth/hidratación de `App.tsx` (ya cubierto por `tests/unit/App.test.tsx`
 * y las pruebas de `authStore`), para aislar la navegación en sí.
 */
function NavHarness() {
  const [vista, setVista] = useState<Vista>('inventario')
  return (
    <div>
      <BottomNav active={vista} onChange={setVista} />
      {vista === 'inventario' && <InventarioView />}
      {vista === 'compras' && <ComprasPlaceholder />}
      {vista === 'alertas' && <AlertasView />}
      {vista === 'mas' && <MasView />}
    </div>
  )
}

afterEach(() => {
  useInventoryStore.setState({ insumos: [], lotes: [], movimientos: [], isReady: true })
  useAuthStore.setState({ usuario: null, isReady: true })
})

describe('4-tab navigation (User Story 4)', () => {
  it('defaults to Inventario and highlights the active tab', () => {
    render(<NavHarness />)

    expect(screen.getByRole('button', { name: /Inventario/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('El inventario está en buen estado')).toBeInTheDocument()
  })

  it('navigates to each tab and marks it active (FR-001, FR-002)', () => {
    render(<NavHarness />)

    fireEvent.click(screen.getByRole('button', { name: /Alertas/ }))
    expect(screen.getByRole('button', { name: /Alertas/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Stock bajo')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Compras/ }))
    expect(screen.getByRole('button', { name: /Compras/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('heading', { name: 'Compras' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Más/ }))
    expect(screen.getByRole('button', { name: /Más/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('shows a recognizable placeholder for Compras instead of an error or blank screen (FR-015)', () => {
    render(<NavHarness />)

    fireEvent.click(screen.getByRole('button', { name: /Compras/ }))

    expect(screen.getByRole('heading', { name: 'Compras' })).toBeInTheDocument()
    expect(
      screen.getByText(/próximamente/),
    ).toBeInTheDocument()
  })

  it('shows the bridge actions in Más and opens RegistroForm/ConsumoForm unchanged (FR-015)', () => {
    render(<NavHarness />)

    fireEvent.click(screen.getByRole('button', { name: /Más/ }))

    expect(screen.getByText('Registrar insumo')).toBeInTheDocument()
    expect(screen.getByText('Consumir insumo')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Registrar insumo'))
    expect(screen.getByText('Buscar insumo')).toBeInTheDocument()
  })
})
