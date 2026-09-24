# Contract: Supabase Schema Additions for Gestión de Lista de Compras

Extiende `specs/008-formulario-alta-material/contracts/supabase-schema.md`. Debe mantenerse en
sincronía con Dexie ([data-model.md](../data-model.md)) y con el mapeo de `src/lib/sync/index.ts`.

```sql
-- Ítems de compra manuales (FR-015). Nunca se borran físicamente: 'estado' es la única
-- transición (research.md R1). insumo_id no tiene "on delete" especial porque insumos nunca
-- se borra físicamente tampoco (baja lógica, spec 007) — la fila referenciada siempre existe.
create table items_compra (
  id uuid primary key,
  nombre text not null check (char_length(trim(nombre)) > 0),
  cantidad numeric,
  nota text,
  insumo_id uuid references insumos(id),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'comprado', 'eliminado')),
  creado_por uuid not null references auth.users(id),
  creado_en timestamptz not null,
  comprado_por uuid references auth.users(id),
  comprado_en timestamptz
);

create index idx_items_compra_estado on items_compra (estado);
create index idx_items_compra_insumo on items_compra (insumo_id);
```

- `insumos`, `lotes`, `movimientos`, `categorias`, `cambios_insumo`, `configuracion_alertas`:
  **sin cambios**.

## Row Level Security

```sql
alter table items_compra enable row level security;

create policy "items_compra: leer todos los autenticados"
  on items_compra for select
  to authenticated
  using (true);

create policy "items_compra: insertar como uno mismo"
  on items_compra for insert
  to authenticated
  with check (creado_por = auth.uid());

-- Update abierto a cualquier autenticado (lista colaborativa, spec Clarifications): agregar,
-- vincular, marcar comprado o eliminar un ítem de otra persona son operaciones válidas para
-- todo el personal, no solo para su autor.
create policy "items_compra: actualizar cualquiera"
  on items_compra for update
  to authenticated
  using (true)
  with check (true);

-- Sin policy de delete: la fila nunca se borra (research.md R1).
```

`items_compra` es la primera tabla de esta feature con RLS habilitada desde su creación —
`insumos`/`lotes`/`movimientos` siguen sin RLS (deuda heredada de la 002, anotada para la 010),
pero eso no impide que una tabla nueva la tenga cuando corresponde (aquí sí hay una regla real que
aplicar: `creado_por = auth.uid()` en el insert).

## Sync contract (extensión de `runSyncBatch`)

Se agrega junto al bloque de `lotes` (mismo patrón, sin bandera de reintento por fila —
research.md R2):

- **`pushItemsCompra`**: sube **todas** las filas locales de `itemsCompra` con `upsert` por `id`,
  cada ciclo — igual que `pushLotes`. Sin filtrar por ningún campo `sincronizado` (esta tabla no lo
  tiene). Nunca falla por RLS de rol: `creado_por` siempre es el usuario que creó la fila
  localmente, y las actualizaciones (vincular, marcar comprado, eliminar) están abiertas a
  cualquier autenticado.
- **`pullItemsCompra`**: `select *` → `bulkPut` en `db.itemsCompra`, igual que `pullLotes`.

Orden: después de `pushLotes`/`pullLotes` (mismo bloque del ciclo), sin dependencia especial más
allá de que `insumos` ya se haya empujado antes (para que `insumo_id` pueda resolver su FK si el
insumo vinculado también es nuevo en este ciclo).

- `fromItemCompraRow`: `cantidad`/`nota`/`insumo_id`/`comprado_por`/`comprado_en` ausentes o
  `null` → `null` en Dexie.
- Nunca lanza; sin backend el paso se omite (Principio I), igual que el resto de `runSyncBatch`.
