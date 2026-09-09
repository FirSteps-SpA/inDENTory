# Contract: Supabase Schema Additions for Alertas

Extends `specs/002-registro-consumo-insumos/contracts/supabase-schema.md`'s `insumos` table with
one column, and adds one new single-row table. Same convention as prior features: this is the
contract future changes must keep in sync with the Dexie schema (`data-model.md`) and the sync
mapping code (`src/lib/sync/index.ts`).

```sql
-- Extends the existing insumos table (specs/002-registro-consumo-insumos) — additive, no data
-- migration needed since existing rows simply get stock_minimo = null (no alert).
alter table insumos add column stock_minimo numeric;

create table configuracion_alertas (
  id text primary key default 'global',
  niveles_aviso_dias integer[] not null default '{30,7,1}',
  constraint configuracion_alertas_singleton check (id = 'global')
);
```

## Row Level Security

- **`insumos.stock_minimo`**: no new restriction. `insumos` has no RLS enabled
  (`specs/002-registro-consumo-insumos/contracts/supabase-schema.md`) — this column follows the
  same open-to-any-authenticated-user write access as the rest of that table (research.md's
  role-gating decision: admin-only is enforced client-side for this column, consistent with how
  feature 002 already leaves the whole table DB-unrestricted).
- **`configuracion_alertas`**: brand-new table, so a real DB-level check is added since
  `perfiles.rol` (feature 003) already exists to check against.

```sql
alter table configuracion_alertas enable row level security;

create policy "configuracion_alertas: leer todos los autenticados"
  on configuracion_alertas for select
  to authenticated
  using (true);

create policy "configuracion_alertas: solo administrador escribe"
  on configuracion_alertas for all
  to authenticated
  using (
    exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'administrador')
  )
  with check (
    exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'administrador')
  );
```

## Sync contract

- **Push**: `insumos` upserts already include every column (feature 002's `pushInsumos`) — this
  feature adds `stock_minimo` to that same row mapping, no new push function needed.
  `configuracion_alertas` gets its own push, but only when the local row exists and was changed
  locally (an administrador saved new niveles) — same `upsert`-by-`id` shape as every other table.
- **Pull**: `configuracion_alertas` gets its own pull (`select * … limit 1`), merged into Dexie's
  single-row `configuracionAlertas` table by `id`. If the table is empty (no administrador has
  ever saved a value on any device), the client falls back to the in-code default `[30, 7, 1]`
  (data-model.md's "Bootstrapping") rather than writing a row itself.
- **`lotes.estado`**: feature 002 already documents this as the one mutable field, written by
  overdraft reconciliation. This feature adds a second writer of the same field — an
  administrador's "marcar como resuelto" action, writing `estado = 'activo'` — no schema change,
  same push path (`pushLotes`) picks it up like any other local `lotes` write.
