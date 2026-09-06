# Phase 1 Data Model: Registro y Consumo de Insumos con Búsqueda Manual y Escaneo Opcional

Three entities, all written locally to Dexie first (Constitution I) and synced in the background
to the matching Supabase tables in `contracts/supabase-schema.md`. IDs are client-generated UUIDs
(`crypto.randomUUID()`) so offline-created rows never need a server round-trip to get an id
before they can be referenced by other local writes (e.g., a Movimiento referencing a Lote created
in the same offline session).

## Insumo

Represents a type of dental supply managed by the inventory (spec Key Entities).

| Field | Type | Notes |
|---|---|---|
| `id` | `string` (UUID) | Primary key |
| `nombre` | `string` | Searched by free text (FR-001/004/010) |
| `categoria` | `string` | Searched by category (FR-001/004/010) |
| `unidadMedida` | `string` | e.g. `"pieza"`, `"caja"`, `"mL"`, `"g"` |
| `permiteDecimales` | `boolean` | Derived from `unidadMedida` at creation; drives FR-016 validation (research.md) |
| `codigoFabricante` | `string \| null` | Optional manufacturer barcode/DataMatrix payload, for scan matching (FR-010) — an insumo may have none if only lot-level codes exist |
| `creadoEn` | `string` (ISO datetime) | |

**Validation**: `nombre` and `categoria` non-empty; `unidadMedida` from a small fixed set (this
feature's set: `pieza`, `caja`, `mL`, `g` — extending the set is a future concern, not a schema
change, since `permiteDecimales` is stored per-row).

## Lote

Represents one received batch of an Insumo (spec Key Entities).

| Field | Type | Notes |
|---|---|---|
| `id` | `string` (UUID) | Primary key |
| `insumoId` | `string` (UUID) | FK → Insumo |
| `numeroLote` | `string` | Manufacturer/internal lot number (FR-002) |
| `fechaCaducidad` | `string` (ISO date) | Drives FEFO ordering (FR-006) and the future alerts feature |
| `codigoFabricante` | `string \| null` | Optional lot-specific barcode/DataMatrix payload (FR-010) |
| `estado` | `"activo" \| "revision"` | `"revision"` set by the overdraft reconciliation (FR-014); never blocks further writes, just surfaces for manual follow-up |
| `creadoEn` | `string` (ISO datetime) | |

**Available stock is derived, not stored**: a lot's available quantity is
`SUM(movimientos.cantidad WHERE tipo='ingreso') - SUM(movimientos.cantidad WHERE tipo='consumo') + SUM(ajuste deltas)`
computed from its Movimiento history — see research.md's "Append-only movement ledger" decision.
There is no mutable `cantidadDisponible` column to avoid the destructive-overwrite failure mode
FR-014 rules out.

**Uniqueness**: `(insumoId, numeroLote)` is expected to be unique in normal operation, but the
spec does not require the system to hard-block a duplicate registration (out of scope here,
documented as a future refinement) — a duplicate simply creates a second Lote row distinguishable
by `id` and `creadoEn`.

## Movimiento

An append-only ledger entry — a registration, a consumption, or a correction (spec Key Entities;
FR-005, FR-013, FR-015).

| Field | Type | Notes |
|---|---|---|
| `id` | `string` (UUID) | Primary key |
| `tipo` | `"ingreso" \| "consumo" \| "ajuste"` | |
| `loteId` | `string` (UUID) | FK → Lote |
| `cantidad` | `number` | Signed for `ajuste` (can be positive or negative); always positive for `ingreso`/`consumo` — validated per Insumo's `permiteDecimales` (FR-016) |
| `usuarioId` | `string` | Supabase auth user id — see research.md's authenticated-identity dependency note; **required**, never null |
| `movimientoOrigenId` | `string \| null` | Set only for `tipo: 'ajuste'`, referencing the Movimiento it corrects (FR-015) |
| `creadoEn` | `string` (ISO datetime) | Client timestamp at creation, not sync time |
| `sincronizado` | `boolean` | Local-only flag: has this row been pushed to Supabase yet (drives background sync, not part of the Supabase row itself) |

**Immutability**: no code path updates or deletes a `Movimiento` row after creation (FR-015) — this
is enforced at the application layer (no `update`/`delete` function is exposed for this table),
not by a database-level trigger, to keep the local-first Dexie writes simple.

## Dexie schema (local)

```ts
db.version(1).stores({
  insumos: 'id, nombre, categoria, codigoFabricante',
  lotes: 'id, insumoId, fechaCaducidad, codigoFabricante, estado',
  movimientos: 'id, loteId, tipo, usuarioId, creadoEn, sincronizado',
})
```

Indexes chosen to serve: text/category search (`insumos.nombre`/`categoria`), FEFO ordering
(`lotes.fechaCaducidad` scoped by `insumoId`), scan-match lookups
(`insumos.codigoFabricante`/`lotes.codigoFabricante`), and the background sync's "find
unsynced rows" query (`movimientos.sincronizado`).

## Relationships

```
Insumo (1) ──< Lote (many) ──< Movimiento (many)
```

A Movimiento always references exactly one Lote; a Lote always references exactly one Insumo. No
Movimiento spans multiple lots — a consumption that would otherwise need to draw from two lots
(rare, since most consumptions are small relative to lot size) is out of scope here and would be
recorded as two separate Movimiento rows in a future refinement.
