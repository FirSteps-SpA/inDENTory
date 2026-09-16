# Phase 1 Data Model: Alertas de Caducidad y Stock Mínimo

Extends feature 002's Dexie schema (`db.version(2)`) with one new field and one new table, both
written locally to Dexie first (Constitution I) and synced in the background to the matching
Supabase objects in `contracts/supabase-schema.md`.

## Insumo (extended)

Adds one field to the entity already defined in `specs/002-registro-consumo-insumos/data-model.md`.

| Field | Type | Notes |
|---|---|---|
| `stockMinimo` | `number \| null` | **New.** Optional, in the insumo's own `unidadMedida` (spec FR-001). `null`/unset means this insumo never generates a stock-bajo alert (FR-004). Editable only by an administrador (spec Clarifications). |

All other fields (`id`, `nombre`, `categoria`, `unidadMedida`, `permiteDecimales`, `caduca`,
`codigoFabricante`, `creadoEn`) are unchanged from feature 002.

**Validation**: when set, `stockMinimo` must be a finite number `>= 0`; validated with the same
per-`unidadMedida` decimal rule feature 002 already applies to movement quantities
(`permiteDecimales`) via `validateQuantity` — a `pieza`/`caja` insumo cannot have a fractional
`stockMinimo`.

## Lote (unchanged)

No structural change. This feature reads `fechaCaducidad` and `estado` (`'activo' | 'revision'`),
both already defined in feature 002's data-model.md, as the source of the caducidad and revisión
alerts defined here. `estado` transitions `'revision' → 'activo'` gain one new trigger: an
administrador marking the lote resuelto (FR-010), in addition to feature 002's own overdraft
reconciliation writing `'activo' → 'revision'`.

## ConfiguracionAlertas (new)

A single global row — never per-insumo (spec Clarifications) — holding the caducidad warning
day-levels.

| Field | Type | Notes |
|---|---|---|
| `id` | `'global'` (fixed literal) | Primary key; exactly one row ever exists. |
| `nivelesAvisoDias` | `number[]` | Days-before-`fechaCaducidad` thresholds, e.g. `[30, 7, 1]` (spec default, FR-005). Not required to stay sorted in storage — calculators sort as needed (research.md's urgency-tier algorithm). Each value a positive integer; editable only by an administrador. |

**Bootstrapping**: if no row exists yet (fresh install, or a device that hasn't synced since this
feature was deployed), the app treats the default `[30, 7, 1]` as the effective value without
writing a row — a row is only written once an administrador explicitly saves a change (FR-005's
"valor por defecto ... si no se configuran otros").

## Derived alert view-models (not persisted)

These are never written to Dexie or Supabase — they're recomputed on every read from the
entities above (FR-011), by the pure functions in `src/features/alertas/lib/` (research.md).

- **AlertaStockBajo**: `{ insumo: Insumo, stockActual: number }` — one entry per `Insumo` whose
  derived stock (sum across all its lotes, via feature 002's `computeStockLote` per lote) is
  below its own `stockMinimo`. Insumos with `stockMinimo: null` never appear.
- **AlertaCaducidad**: `{ lote: Lote, insumo: Insumo, diasRestantes: number, nivel: number |
  'caducado' }` — one entry per `Lote` with stock disponible `> 0` whose parent `Insumo.caduca`
  is `true` and whose `diasRestantes` is negative (`nivel: 'caducado'`) or falls within a
  configured `nivelesAvisoDias` tier (research.md's urgency-tier algorithm).
- **AlertaRevision**: `{ lote: Lote, insumo: Insumo, stockDerivado: number }` — one entry per
  `Lote` with `estado: 'revision'`, `stockDerivado` being its current (possibly negative)
  computed stock, for display of "the overdraft that caused this".

## Dexie schema (local)

`002-registro-consumo-insumos` claimed `db.version(2)` for `insumos`/`lotes`/`movimientos` — this
feature adds `version(3)`; Dexie carries every prior table forward automatically.

```ts
db.version(3).stores({
  configuracionAlertas: 'id',
})
```

`insumos.stockMinimo` needs no new index (nothing queries by it — every alert calculation reads
the full `insumos` array already loaded by `inventoryStore`), so it's added to the `Insumo`
TypeScript interface without changing the `insumos` index string from feature 002's
`'id, nombre, categoria, codigoFabricante'`.

## Relationships

```
Insumo (1) ──< Lote (many) ──< Movimiento (many)     [unchanged from feature 002]

ConfiguracionAlertas (0..1 global row) ── read by every AlertaCaducidad computation
Insumo.stockMinimo ── read by every AlertaStockBajo computation for that Insumo
```

No new foreign keys: `ConfiguracionAlertas` has no relationship to any other entity (it's a
single global row consulted, not joined), and `Insumo.stockMinimo` is a plain field addition, not
a new relationship.
