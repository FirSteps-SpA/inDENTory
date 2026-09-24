import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type {
  CambioInsumo,
  Categoria,
  ConfiguracionAlertas,
  Insumo,
  Lote,
  Movimiento,
  UsuarioActual,
} from '../../src/lib/db'
import type { MemoryTable } from '../helpers/memoryDb'

vi.mock('../../src/lib/db', async () => {
  const { createMemoryDb, MemoryTable } = await import('../helpers/memoryDb')
  return {
    db: createMemoryDb({
      insumos: new MemoryTable(),
      lotes: new MemoryTable(),
      movimientos: new MemoryTable(),
      cambiosInsumo: new MemoryTable(),
      configuracionAlertas: new MemoryTable(),
      categorias: new MemoryTable(),
      usuarioActual: new MemoryTable(),
      borradores: new MemoryTable(),
      configuracionClinica: new MemoryTable(),
      preferenciasNotificaciones: new MemoryTable(),
    }),
  }
})

import { db } from '../../src/lib/db'
import { onMemoryDbChange } from '../helpers/memoryDb'
import { useInventoryStore } from '../../src/stores/inventoryStore'
import { useAlertasStore } from '../../src/stores/alertasStore'
import { useClinicaStore } from '../../src/stores/clinicaStore'
import { useAuthStore } from '../../src/stores/authStore'
import { AjustesView } from '../../src/features/ajustes/components/AjustesView'
import { AppHeader } from '../../src/app/AppHeader'

const insumosT = db.insumos as unknown as MemoryTable<Insumo>
const lotesT = db.lotes as unknown as MemoryTable<Lote>
const movimientosT = db.movimientos as unknown as MemoryTable<Movimiento>
const cambiosT = db.cambiosInsumo as unknown as MemoryTable<CambioInsumo>
const configAlertasT = db.configuracionAlertas as unknown as MemoryTable<
  ConfiguracionAlertas & { id: string }
>
const categoriasT = db.categorias as unknown as MemoryTable<Categoria>
const configClinicaT = db.configuracionClinica as unknown as MemoryTable<{
  id: string
  nombre: string | null
}>
const prefNotifT = db.preferenciasNotificaciones as unknown as MemoryTable<{
  id: string
  stockBajo: boolean
  caducidad: boolean
}>

function insumo(id: string, nombre: string, overrides: Partial<Insumo> = {}): Insumo {
  return {
    id,
    nombre,
    categoria: 'Cirugía',
    unidadMedida: 'caja',
    permiteDecimales: false,
    caduca: true,
    codigoFabricante: null,
    creadoEn: '2026-01-01T00:00:00.000Z',
    stockMinimo: 5,
    dadoDeBajaEn: null,
    dadoDeBajaPor: null,
    creadoPor: null,
    ...overrides,
  }
}

function categoria(id: string, nombre: string, overrides: Partial<Categoria> = {}): Categoria {
  return {
    id,
    nombre,
    creadoPor: 'admin-1',
    creadoEn: '2026-01-01T00:00:00.000Z',
    sincronizado: true,
    rechazadoEn: null,
    desactivadoEn: null,
    ...overrides,
  }
}

const personal: UsuarioActual = {
  id: 'personal-1',
  email: 'p@x.cl',
  nombre: 'Personal Uno',
  rol: 'personal',
  autenticadoEn: 'x',
}
const admin: UsuarioActual = {
  ...personal,
  id: 'admin-1',
  email: 'admin@x.cl',
  nombre: 'Admin Uno',
  rol: 'administrador',
}

/** Mirrors inventoryStore's/alertasStore's liveQuery subscriptions. */
function reflejarStore() {
  useInventoryStore.setState({
    insumos: insumosT.all().filter((i) => !i.dadoDeBajaEn),
    insumosDadosDeBaja: insumosT.all().filter((i) => !!i.dadoDeBajaEn),
    lotes: lotesT.all(),
    movimientos: movimientosT.all(),
    cambiosInsumo: cambiosT.all(),
    categorias: categoriasT.all(),
    isReady: true,
  })
  const config = configAlertasT.all()[0]
  useAlertasStore.setState({
    nivelesAvisoDias: config?.nivelesAvisoDias ?? [30, 7, 1],
    isReady: true,
  })
  const clinica = configClinicaT.all()[0]
  useClinicaStore.setState({ nombreClinica: clinica?.nombre ?? null, isReady: true })
  const pref = prefNotifT.all()[0]
  useAlertasStore.setState({
    preferenciaStockBajo: pref?.stockBajo ?? true,
    preferenciaCaducidad: pref?.caducidad ?? true,
  })
}

function seed() {
  insumosT.seed([insumo('a', 'Anestesia local'), insumo('b', 'Bisturí')])
  lotesT.seed([])
  movimientosT.seed([])
  cambiosT.seed([])
  configAlertasT.seed([])
  categoriasT.seed([])
  configClinicaT.seed([])
  prefNotifT.seed([])
  reflejarStore()
}

beforeEach(() => {
  onMemoryDbChange(reflejarStore)
  useAlertasStore.setState({ nivelesAvisoDias: [30, 7, 1], isReady: true })
  seed()
})

afterEach(() => {
  onMemoryDbChange(null)
  useAuthStore.setState({ usuario: null, isReady: true })
})

describe('Ajustes — Configuración de Alertas (User Story 1)', () => {
  it('lets an administrador find and change stock mínimo / niveles de aviso from Ajustes, same behavior as before', async () => {
    useAuthStore.setState({ usuario: admin, isReady: true })
    render(<AjustesView />)

    expect(
      screen.getByText('Configurar stock mínimo por insumo'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Configurar niveles de aviso de caducidad'),
    ).toBeInTheDocument()

    const input = screen.getByLabelText('Stock mínimo de Anestesia local')
    expect(input).toHaveValue(5)
  })

  it('hides the config controls for a non-administrador', () => {
    useAuthStore.setState({ usuario: personal, isReady: true })
    render(<AjustesView />)

    expect(
      screen.queryByText('Configurar stock mínimo por insumo'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Configurar niveles de aviso de caducidad'),
    ).not.toBeInTheDocument()
  })
})

describe('Ajustes — Perfil (User Story 2)', () => {
  it('shows nombre/correo/rol and closes the session on "Cerrar sesión"', async () => {
    useAuthStore.setState({ usuario: personal, isReady: true })
    render(<AjustesView />)

    expect(screen.getByText('Personal Uno')).toBeInTheDocument()
    expect(screen.getByText('p@x.cl')).toBeInTheDocument()
    expect(screen.getByText('personal')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cerrar sesión'))

    await waitFor(() => {
      expect(useAuthStore.getState().usuario).toBeNull()
    })
  })
})

describe('Ajustes — Categorías (User Story 4)', () => {
  it('creates, renames (cascading to insumos), deactivates and reactivates a category', async () => {
    useAuthStore.setState({ usuario: admin, isReady: true })
    categoriasT.seed([categoria('c1', 'Ortodoncia')])
    insumosT.seed([insumo('a', 'Anestesia local', { categoria: 'Ortodoncia' })])
    reflejarStore()
    render(<AjustesView />)

    fireEvent.click(screen.getByRole('button', { name: /Nueva categoría/i }))
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Prótesis' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => {
      expect(screen.getByText('Prótesis')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Renombrar Ortodoncia/i }))
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Endodoncia' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(async () => {
      expect(screen.getByText('Endodoncia')).toBeInTheDocument()
      expect((await db.insumos.get('a'))!.categoria).toBe('Endodoncia')
    })

    fireEvent.click(screen.getByRole('button', { name: /Desactivar Endodoncia/i }))
    await waitFor(() => {
      expect(screen.getByText('Desactivada')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Reactivar Endodoncia/i }))
    await waitFor(() => {
      expect(screen.queryByText('Desactivada')).not.toBeInTheDocument()
    })
  })

  it('hides Categorías for a non-administrador', () => {
    useAuthStore.setState({ usuario: personal, isReady: true })
    render(<AjustesView />)

    expect(screen.queryByText('Categorías')).not.toBeInTheDocument()
  })
})

function AjustesConHeader() {
  return (
    <div>
      <AppHeader />
      <AjustesView />
    </div>
  )
}

describe('Ajustes — Clínica (User Story 5)', () => {
  it('saves a clinic name and replaces "Gabinete" in the header', async () => {
    useAuthStore.setState({ usuario: admin, isReady: true })
    render(<AjustesConHeader />)

    expect(screen.getByText('Gabinete')).toBeInTheDocument()

    fireEvent.blur(screen.getByLabelText('Nombre de la clínica o gabinete'), {
      target: { value: 'Clínica Dental Sonrisas' },
    })

    await waitFor(() => {
      expect(screen.getByText('Clínica Dental Sonrisas')).toBeInTheDocument()
    })
    expect(screen.queryByText('Gabinete')).not.toBeInTheDocument()
  })

  it('rejects an empty name and keeps "Gabinete"', async () => {
    useAuthStore.setState({ usuario: admin, isReady: true })
    render(<AjustesConHeader />)

    fireEvent.blur(screen.getByLabelText('Nombre de la clínica o gabinete'), {
      target: { value: '   ' },
    })

    await waitFor(() => {
      expect(screen.getByText('Ingresa un nombre de clínica.')).toBeInTheDocument()
    })
    expect(screen.getByText('Gabinete')).toBeInTheDocument()
  })

  it('hides Clínica for a non-administrador', () => {
    useAuthStore.setState({ usuario: personal, isReady: true })
    render(<AjustesView />)

    expect(screen.queryByText('Clínica')).not.toBeInTheDocument()
  })
})

describe('Ajustes — Insumos dados de baja (User Story 6)', () => {
  it('lists a dado-de-baja insumo and restores it', async () => {
    useAuthStore.setState({ usuario: admin, isReady: true })
    insumosT.seed([
      insumo('a', 'Anestesia local'),
      insumo('bajado', 'Composite Viejo', {
        dadoDeBajaEn: '2026-09-01T00:00:00.000Z',
        dadoDeBajaPor: 'admin-1',
      }),
    ])
    reflejarStore()
    render(<AjustesView />)

    expect(screen.getByText('Composite Viejo')).toBeInTheDocument()
    expect(
      screen.getByText(/Dado de baja el 2026-09-01/),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Restaurar/i }))

    await waitFor(async () => {
      expect((await db.insumos.get('bajado'))!.dadoDeBajaEn).toBeNull()
    })
    await waitFor(() => {
      expect(screen.getByText('Ningún insumo está dado de baja.')).toBeInTheDocument()
    })
  })

  it('shows an empty state when nothing is dado de baja', () => {
    useAuthStore.setState({ usuario: admin, isReady: true })
    render(<AjustesView />)

    expect(screen.getByText('Ningún insumo está dado de baja.')).toBeInTheDocument()
  })

  it('hides Insumos dados de baja for a non-administrador', () => {
    useAuthStore.setState({ usuario: personal, isReady: true })
    render(<AjustesView />)

    expect(screen.queryByText('Insumos dados de baja')).not.toBeInTheDocument()
  })
})

describe('Ajustes — Notificaciones (User Story 7)', () => {
  it('toggling each Switch persists and reflects on reopen, for any authenticated user', async () => {
    useAuthStore.setState({ usuario: personal, isReady: true })
    render(<AjustesView />)

    const stockBajoSwitch = screen.getByRole('switch', {
      name: 'Incluir stock bajo en el indicador de la navegación',
    })
    expect(stockBajoSwitch).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(stockBajoSwitch)

    await waitFor(() => {
      expect(prefNotifT.all()[0]).toMatchObject({ stockBajo: false, caducidad: true })
    })
    expect(useAlertasStore.getState().preferenciaStockBajo).toBe(false)

    const caducidadSwitch = screen.getByRole('switch', {
      name: 'Incluir caducidad en el indicador de la navegación',
    })
    fireEvent.click(caducidadSwitch)

    await waitFor(() => {
      expect(prefNotifT.all()[0]).toMatchObject({ stockBajo: false, caducidad: false })
    })
  })
})
