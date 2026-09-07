# Contract: Supabase Postgres Schema

Supabase is external to this codebase (backend-as-a-service, per constitution) — these are the
Postgres tables the background sync layer (`src/lib/sync/`) reads from and writes to. They mirror
the Dexie schema in `data-model.md` field-for-field so the sync mapping is a straight passthrough,
not a transformation layer.

This is the contract future changes must keep in sync: if a column is added/renamed here, the
Dexie schema and the sync mapping code must change together.

```sql
-- Drops in dependency order (movimientos → lotes → insumos) so the FK
-- references below don't block the drop. Dev-project convenience only —
-- this destroys all rows in these tables; never run against a project with
-- real data you need to keep.
drop table if exists movimientos;
drop table if exists lotes;
drop table if exists insumos;

create table insumos (
  id uuid primary key,
  nombre text not null,
  categoria text not null,
  unidad_medida text not null,
  permite_decimales boolean not null,
  caduca boolean not null default true,
  codigo_fabricante text,
  creado_en timestamptz not null default now()
);

create table lotes (
  id uuid primary key,
  insumo_id uuid not null references insumos(id),
  numero_lote text not null,
  proveedor text not null,
  fecha_caducidad date, -- null only when insumos.caduca = false for this lote's insumo (FR-002b)
  codigo_fabricante text,
  estado text not null default 'activo' check (estado in ('activo', 'revision')),
  creado_en timestamptz not null default now()
);

create table movimientos (
  id uuid primary key,
  tipo text not null check (tipo in ('ingreso', 'consumo', 'ajuste')),
  lote_id uuid not null references lotes(id),
  cantidad numeric not null,
  usuario_id uuid not null references auth.users(id),
  movimiento_origen_id uuid references movimientos(id),
  creado_en timestamptz not null
  -- no "sincronizado" column: that flag is local-only Dexie sync bookkeeping,
  -- not part of the server's source-of-truth row
);

-- Read/query indexes matching the Dexie indexes in data-model.md
create index idx_lotes_insumo_fecha on lotes (insumo_id, fecha_caducidad);
create index idx_movimientos_lote on movimientos (lote_id);
create index idx_movimientos_usuario on movimientos (usuario_id);
```

## Row Level Security

`usuario_id` on `movimientos` must equal the authenticated caller's `auth.uid()` on insert (a
Supabase RLS policy) — this is the server-side backstop for FR-013's attribution requirement,
since a client-only check can't be trusted for who performed an action. Read access to all three
tables is open to any authenticated user (single-clinic-team scope, no per-row visibility rules
needed per spec Assumptions on roles/permissions).

## Sync contract

- **Push**: rows with local `sincronizado: false` are inserted via `upsert` (on `id`) — an insert
  never becomes an update to an existing server row's business fields, since movimientos are
  append-only and insumos/lotes are only ever appended-to via new rows referencing them, not
  mutated (except `lotes.estado`, see below).
- **`lotes.estado` is the one mutable field** or, since sync happens in the background from
  possibly-offline clients, is a **computed** value: the reconciliation described in
  research.md's "overdraft reconciliation" runs as a decision made from the full movement history,
  and writes `estado = 'revision'` as a plain field update — this is the single intentional
  exception to "everything is append-only", scoped to one non-authoritative status field that
  doesn't affect quantity math.
- **Pull**: the client subscribes to or polls `movimientos`/`lotes`/`insumos` changes to catch
  what other devices/users wrote, merging into the local Dexie tables by `id` (insert-if-absent).
