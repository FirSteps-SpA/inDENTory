import { create } from 'zustand'
import { liveQuery } from 'dexie'
import { db, type Insumo, type Lote } from '../lib/db'

/**
 * Reactive in-memory cache of the insumo/lote catalog (Constitution II),
 * kept in sync with Dexie via `liveQuery` — no manual invalidation needed
 * when RegistroForm/ConsumoForm write new rows. Shared by both forms'
 * search and FEFO/scan lookups (research.md).
 */
interface InventoryState {
  insumos: Insumo[]
  lotes: Lote[]
  isReady: boolean
  subscribe: () => () => void
}

export const useInventoryStore = create<InventoryState>((set) => ({
  insumos: [],
  lotes: [],
  isReady: false,
  subscribe: () => {
    const insumosSub = liveQuery(() => db.insumos.toArray()).subscribe({
      next: (insumos) => set({ insumos, isReady: true }),
    })
    const lotesSub = liveQuery(() => db.lotes.toArray()).subscribe({
      next: (lotes) => set({ lotes, isReady: true }),
    })
    return () => {
      insumosSub.unsubscribe()
      lotesSub.unsubscribe()
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

/** Búsqueda por categoría (FR-001/004/010). */
export function searchInsumosPorCategoria(
  insumos: Insumo[],
  categoria: string,
): Insumo[] {
  if (!categoria) return insumos
  return insumos.filter((insumo) => insumo.categoria === categoria)
}

export function categoriasDisponibles(insumos: Insumo[]): string[] {
  return Array.from(new Set(insumos.map((insumo) => insumo.categoria))).sort()
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
