/**
 * Minimal in-memory stand-in for the Dexie `db` (feature 007 tests) — the
 * project mocks `src/lib/db` per test instead of using fake-indexeddb, so
 * this covers only the table API feature 007's domain code uses. Rows are
 * cloned on read/write like IndexedDB's structured clone, and
 * `transaction()` serializes callers so concurrent `rw` transactions don't
 * interleave — the property Dexie gives the double-tap guard (T009).
 */
type Row = { id: string }

function clone<T>(value: T): T {
  return structuredClone(value)
}

let listener: (() => void) | null = null

/**
 * Called after every write — lets an integration test mirror Dexie's
 * `liveQuery` by copying tables into the Zustand store.
 */
export function onMemoryDbChange(fn: (() => void) | null): void {
  listener = fn
}

export class MemoryTable<T extends Row> {
  rows = new Map<string, T>()

  private changed() {
    listener?.()
  }

  async toArray(): Promise<T[]> {
    return [...this.rows.values()].map(clone)
  }

  async get(id: string): Promise<T | undefined> {
    const row = this.rows.get(id)
    return row ? clone(row) : undefined
  }

  async add(row: T): Promise<string> {
    if (this.rows.has(row.id)) throw new Error(`Duplicate key ${row.id}`)
    this.rows.set(row.id, clone(row))
    this.changed()
    return row.id
  }

  async put(row: T): Promise<string> {
    this.rows.set(row.id, clone(row))
    this.changed()
    return row.id
  }

  async bulkPut(rows: T[]): Promise<void> {
    for (const row of rows) this.rows.set(row.id, clone(row))
    this.changed()
  }

  async bulkAdd(rows: T[]): Promise<void> {
    for (const row of rows) await this.add(row)
  }

  async update(id: string, changes: Partial<T>): Promise<number> {
    const row = this.rows.get(id)
    if (!row) return 0
    this.rows.set(id, { ...row, ...clone(changes) })
    this.changed()
    return 1
  }

  async bulkUpdate(
    updates: { key: string; changes: Partial<T> }[],
  ): Promise<number> {
    let n = 0
    for (const { key, changes } of updates) n += await this.update(key, changes)
    return n
  }

  async clear(): Promise<void> {
    this.rows.clear()
    this.changed()
  }

  async delete(id: string): Promise<void> {
    this.rows.delete(id)
    this.changed()
  }

  where(campo: keyof T & string) {
    return {
      equals: (valor: unknown) => ({
        toArray: async () =>
          [...this.rows.values()]
            .filter((row) => (row as Record<string, unknown>)[campo] === valor)
            .map(clone),
      }),
    }
  }

  filter(fn: (row: T) => boolean) {
    return {
      toArray: async () => [...this.rows.values()].filter(fn).map(clone),
    }
  }

  seed(rows: T[]): void {
    this.rows = new Map(rows.map((row) => [row.id, clone(row)]))
  }

  all(): T[] {
    return [...this.rows.values()].map(clone)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMemoryDb<Tables extends Record<string, MemoryTable<any>>>(
  tables: Tables,
) {
  let cola: Promise<unknown> = Promise.resolve()
  return {
    ...tables,
    /**
     * Snapshots every table before running `fn` and restores them if it
     * rejects — mirroring the atomic rollback a real Dexie `rw` transaction
     * gives `darDeAltaMaterial` (spec 008 research.md R3), so a simulated
     * write failure partway through leaves nothing behind in tests.
     */
    transaction(...args: unknown[]) {
      const fn = args[args.length - 1] as () => Promise<unknown>
      const resultado = cola.then(async () => {
        const snapshot = Object.entries(tables).map(
          ([nombre, tabla]) => [nombre, new Map(tabla.rows)] as const,
        )
        try {
          return await fn()
        } catch (error) {
          for (const [nombre, filas] of snapshot) {
            tables[nombre].rows = filas
          }
          throw error
        }
      })
      cola = resultado.catch(() => undefined)
      return resultado
    },
  }
}
