import Dexie, { type EntityTable } from 'dexie'

/**
 * IndexedDB client (Constitution I: local-first primary write, Principle IV:
 * batch/expiry/stock queries). No domain tables are defined yet — this
 * bootstrap feature only wires up the client; future inventory features add
 * their own `.version(n).stores({...})` schema and typed tables here.
 */
export const db = new Dexie('inDENToryDB') as Dexie & {
  // Future domain tables (e.g., insumos, lotes) are added here as
  // `EntityTable<...>` and declared via `db.version(n).stores({...})`.
}

export type { EntityTable }
