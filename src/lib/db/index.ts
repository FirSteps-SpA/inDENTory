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

/**
 * IndexedDB client (Constitution I: local-first primary write, Principle IV:
 * batch/expiry/stock queries). Future inventory features add their own
 * domain tables here via `db.version(n).stores({...})`.
 */
export const db = new Dexie('inDENToryDB') as Dexie & {
  usuarioActual: EntityTable<UsuarioActual, 'id'>
}

db.version(1).stores({
  usuarioActual: 'id',
})

export type { EntityTable }
