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
  /**
   * Feature 007 (FR-018) — baja lógica. `null` = activo. Projected from the
   * earliest `CambioInsumo` with `campo: 'baja'` (data-model.md), never
   * written directly.
   */
  dadoDeBajaEn: string | null
  dadoDeBajaPor: string | null
}

/** Campos de `Insumo` que un administrador puede editar (feature 007 FR-013). */
export type CampoEditableInsumo =
  | 'nombre'
  | 'categoria'
  | 'unidadMedida'
  | 'stockMinimo'
  | 'codigoFabricante'
  | 'caduca'

/**
 * Feature 007 data-model.md — CambioInsumo. Append-only per-field ledger:
 * one row per field changed by an edit (or one `'baja'` row), so concurrent
 * edits resolve per field (FR-021a) and every overwritten value stays
 * auditable. The `Insumo` row is a projection of this ledger
 * (`proyectarInsumo`). Only the local `sincronizado`/`rechazadoEn` flags are
 * ever updated after creation.
 */
export interface CambioInsumo {
  id: string
  insumoId: string
  campo: CampoEditableInsumo | 'baja'
  valorAnterior: string | number | boolean | null
  valorNuevo: string | number | boolean | null
  usuarioId: string
  creadoEn: string
  sincronizado: boolean
  /** Local-only: set when the server rejected it for lack of permissions (FR-021b). */
  rechazadoEn: string | null
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
  cambiosInsumo: EntityTable<CambioInsumo, 'id'>
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

// version(4): feature 007 (data-model.md) — new append-only `cambiosInsumo`
// ledger; existing insumos get the baja fields as `null` (activo). No new
// index on insumos: the activos filter runs in memory (≤300 rows).
db.version(4)
  .stores({
    cambiosInsumo: 'id, insumoId, campo, creadoEn, sincronizado',
  })
  .upgrade((tx) =>
    tx
      .table('insumos')
      .toCollection()
      .modify((insumo: Partial<Insumo>) => {
        insumo.dadoDeBajaEn ??= null
        insumo.dadoDeBajaPor ??= null
      }),
  )

export type { EntityTable }
