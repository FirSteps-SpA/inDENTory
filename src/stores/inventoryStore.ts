import { create } from 'zustand'
import { liveQuery } from 'dexie'
import {
  db,
  type CambioInsumo,
  type Categoria,
  type Insumo,
  type Lote,
  type Movimiento,
} from '../lib/db'
import type { Estado, EstadoInsumo } from '../features/insumos/lib/estado'
import { claveCategoria } from '../features/insumos/lib/categorias'

/**
 * Reactive in-memory cache of the insumo/lote catalog (Constitution II),
 * kept in sync with Dexie via `liveQuery` — no manual invalidation needed
 * when RegistroForm/ConsumoForm write new rows. Shared by both forms'
 * search and FEFO/scan lookups (research.md), and by feature 004's alert
 * calculators, which is why `movimientos` is also subscribed here rather
 * than in a second store (research.md's "extend, don't duplicate" decision).
 *
 * `insumos` holds only **activos** (feature 007 FR-020, research.md R10):
 * insumos dados de baja are filtered here, once, so every consumer (listado,
 * alertas, SearchPicker, validación de nombres) excludes them without code
 * of its own. Their lotes stay in `lotes`, but every alert calculator skips
 * lotes whose insumo isn't in the array. `categorias` (feature 008) holds
 * only categories created by administrators — the precargadas and "Sin
 * categoría" are constants in `categorias.ts`, never rows here.
 */
interface InventoryState {
  insumos: Insumo[]
  lotes: Lote[]
  movimientos: Movimiento[]
  cambiosInsumo: CambioInsumo[]
  categorias: Categoria[]
  isReady: boolean
  subscribe: () => () => void
}

export const useInventoryStore = create<InventoryState>((set) => ({
  insumos: [],
  lotes: [],
  movimientos: [],
  cambiosInsumo: [],
  categorias: [],
  isReady: false,
  subscribe: () => {
    const insumosSub = liveQuery(() => db.insumos.toArray()).subscribe({
      next: (insumos) =>
        set({
          insumos: insumos.filter((insumo) => !insumo.dadoDeBajaEn),
          isReady: true,
        }),
    })
    const lotesSub = liveQuery(() => db.lotes.toArray()).subscribe({
      next: (lotes) => set({ lotes, isReady: true }),
    })
    const movimientosSub = liveQuery(() => db.movimientos.toArray()).subscribe({
      next: (movimientos) => set({ movimientos, isReady: true }),
    })
    const cambiosSub = liveQuery(() => db.cambiosInsumo.toArray()).subscribe({
      next: (cambiosInsumo) => set({ cambiosInsumo }),
    })
    const categoriasSub = liveQuery(() => db.categorias.toArray()).subscribe({
      next: (categorias) => set({ categorias }),
    })
    return () => {
      cambiosSub.unsubscribe()
      insumosSub.unsubscribe()
      lotesSub.unsubscribe()
      movimientosSub.unsubscribe()
      categoriasSub.unsubscribe()
    }
  },
}))

/** Búsqueda por texto libre (FR-001/004/010). */
export function searchInsumosPorTexto(
  insumos: Insumo[],
  texto: string,
): Insumo[] {
  const q = texto.trim().toLowerCase()
  if (!q) return insumos
  return insumos.filter((insumo) => insumo.nombre.toLowerCase().includes(q))
}

/**
 * Búsqueda por categoría (FR-001/004/010). Compara por `claveCategoria`
 * (spec 008 research.md R2) para que "fresas" caiga bajo el chip "Fresas".
 */
export function searchInsumosPorCategoria(
  insumos: Insumo[],
  categoria: string,
): Insumo[] {
  if (!categoria) return insumos
  const clave = claveCategoria(categoria)
  return insumos.filter((insumo) => claveCategoria(insumo.categoria) === clave)
}

/** Selección rápida: los insumos dados de alta más recientemente. */
export function insumosRecientes(insumos: Insumo[], limite = 8): Insumo[] {
  return [...insumos]
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
    .slice(0, limite)
}

export function lotesDeInsumo(lotes: Lote[], insumoId: string): Lote[] {
  return lotes.filter((lote) => lote.insumoId === insumoId)
}

/**
 * Filtro por estado de salud (spec 006 FR-008): `estados.length === 0`
 * devuelve todo sin filtrar; en otro caso conserva las entradas cuyo estado
 * está incluido en `estados` — un arreglo, no un valor único, porque el
 * resumen (FR-004) puede activar `['caducado', 'proximo-a-caducar']` a la
 * vez con un solo toque (spec 006's Analysis F1/A1).
 */
export function searchInsumosPorEstado(
  estadosInsumo: EstadoInsumo[],
  estados: Estado[],
): EstadoInsumo[] {
  if (estados.length === 0) return estadosInsumo
  return estadosInsumo.filter((e) => estados.includes(e.estado))
}

/** Coincidencia por código de fabricante/lote para el flujo de escaneo (FR-010). */
export function findInsumoPorCodigo(
  insumos: Insumo[],
  codigo: string,
): Insumo | undefined {
  return insumos.find((insumo) => insumo.codigoFabricante === codigo)
}

export function findLotePorCodigo(
  lotes: Lote[],
  codigo: string,
): Lote | undefined {
  return lotes.find((lote) => lote.codigoFabricante === codigo)
}
