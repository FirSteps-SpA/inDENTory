import Dexie, { type EntityTable } from 'dexie'

/**
 * The locally-cached authenticated identity that gates offline app access
 * (spec 003 FR-002/FR-006; data-model.md). `id` is the Supabase Auth user id
 * (`auth.users.id`) — the same id feature 002's `Movimiento.usuarioId`
 * references. At most one row exists at a time (single active local user per
 * device): the store clears the table before writing a new row on login.
 */
export interface UsuarioActual {
  id: string
  email: string
  nombre: string
  rol: 'administrador' | 'personal'
  autenticadoEn: string
}

/** Feature 002 data-model.md — Insumo. */
export interface Insumo {
  id: string
  nombre: string
  categoria: string
  unidadMedida: string
  permiteDecimales: boolean
  /** Whether this type of supply expires at all (FR-002b) — false for e.g. reusable instruments. */
  caduca: boolean
  codigoFabricante: string | null
  creadoEn: string
  /** Feature 004 (FR-001) — optional; `null`/unset never generates a stock-bajo alert (FR-004). */
  stockMinimo: number | null
}

/** Feature 002 data-model.md — Lote. */
export interface Lote {
  id: string
  insumoId: string
  numeroLote: string
  proveedor: string
  /** `null` only when the parent Insumo has `caduca: false` (FR-002b) — never a sentinel date. */
  fechaCaducidad: string | null
  codigoFabricante: string | null
  estado: 'activo' | 'revision'
  creadoEn: string
}

/** Feature 002 data-model.md — Movimiento (append-only ledger entry). */
export interface Movimiento {
  id: string
  tipo: 'ingreso' | 'consumo' | 'ajuste'
  loteId: string
  cantidad: number
  usuarioId: string
  movimientoOrigenId: string | null
  creadoEn: string
  sincronizado: boolean
}

/**
 * Feature 004 data-model.md — ConfiguracionAlertas. Single global row (fixed
 * id `'global'`) holding the caducidad warning day-levels (FR-005) — never
 * per-insumo (spec Clarifications). Absence of a row means the in-code
 * default `[30, 7, 1]` applies (data-model.md's Bootstrapping).
 */
export interface ConfiguracionAlertas {
  id: 'global'
  nivelesAvisoDias: number[]
}

/**
 * IndexedDB client (Constitution I: local-first primary write, Principle IV:
 * batch/expiry/stock queries). Future inventory features add their own
 * domain tables here via `db.version(n).stores({...})`.
 */
export const db = new Dexie('inDENToryDB') as Dexie & {
  usuarioActual: EntityTable<UsuarioActual, 'id'>
  insumos: EntityTable<Insumo, 'id'>
  lotes: EntityTable<Lote, 'id'>
  movimientos: EntityTable<Movimiento, 'id'>
  configuracionAlertas: EntityTable<ConfiguracionAlertas, 'id'>
}

db.version(1).stores({
  usuarioActual: 'id',
})

// version(2): feature 002 (data-model.md) — version(1) is already claimed by
// 003-login-personal-clinico's usuarioActual table, carried forward unchanged.
db.version(2).stores({
  insumos: 'id, nombre, categoria, codigoFabricante',
  lotes: 'id, insumoId, fechaCaducidad, codigoFabricante, estado',
  movimientos: 'id, loteId, tipo, usuarioId, creadoEn, sincronizado',
})

// version(3): feature 004 (data-model.md) — insumos/lotes/movimientos carried
// forward unchanged; `Insumo.stockMinimo` needs no new index (nothing queries
// by it, data-model.md).
db.version(3).stores({
  configuracionAlertas: 'id',
})

export type { EntityTable }
