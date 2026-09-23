# Contract: Supabase Schema Additions for Alta de Material

Extiende `specs/007-acciones-rapidas-consumo-edicion/contracts/supabase-schema.md`. Debe
mantenerse en sincronía con Dexie ([data-model.md](../data-model.md)) y con el mapeo de
`src/lib/sync/index.ts`.

```sql
-- Autoría del alta (R10). Aditivo: filas existentes quedan en null.
alter table insumos add column creado_por uuid references auth.users (id);

-- Categorías creadas por administradores (R1/R4). Las precargadas y
-- 'Sin categoría' viven en el cliente y NO se insertan aquí.
create table categorias (
  id uuid primary key,
  nombre text not null check (char_length(trim(nombre)) between 1 and 40),
  creado_por uuid not null references auth.users (id),
  creado_en timestamptz not null
);
-- Sin unique sobre el nombre: dos altas sin conexión de la misma categoría
-- son válidas y el cliente las funde por clave normalizada (research.md R2).
```

- `lotes`, `movimientos`, `cambios_insumo`: **sin cambios**.
- `insumos.categoria` sigue siendo `text` con el nombre de la categoría.

## Row Level Security

```sql
alter table categorias enable row level security;

create policy "categorias: leer todos los autenticados"
  on categorias for select
  to authenticated
  using (true);

create policy "categorias: solo administrador inserta, como sí mismo"
  on categorias for insert
  to authenticated
  with check (
    creado_por = auth.uid()
    and exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'administrador')
  );

-- Sin update/delete: inmutables para los clientes en esta spec.
```

- `insumos` sigue sin RLS (deuda de la 002, anotada para la 010): el alta de materiales está
  abierta a todo el personal por diseño (Clarifications), así que no introduce una excepción
  nueva.

## Sync contract (extensión de `runSyncBatch`)

Orden del ciclo (se inserta el paso 0; el resto es el de la 007):

0. **`pushCategorias`**: `upsert` por `id` de `categorias` con `sincronizado = false` y
   `rechazadoEn = null`; marca `sincronizado = true` solo sin error. Ante un error de RLS
   (`esRechazoDePermisos`, existente) reintenta fila por fila; cada fila rechazada:
   - `rechazadoEn = now()` (no se borra, no se vuelve a subir);
   - los insumos locales cuya `claveCategoria(categoria)` coincida y que ninguna otra fuente
     válida cubra pasan a `categoria = 'Sin categoría'` (escritura directa de la fila, research.md R4);
   - aviso `categoria-rechazada` (uno por categoría) y refresco de rol con `fetchPerfilPropio`.
   Otros errores: sin marca, reintento en el siguiente ciclo.
1. `pushInsumos` (existente; `toInsumoRow` incluye `creado_por`).
2. `pushCambiosInsumo` … 6. (sin cambios respecto de la 007).
7. **`pullCategorias`**: `select *` → `bulkPut` con `sincronizado = true`, `rechazadoEn = null`,
   sin pisar filas locales con `rechazadoEn` distinto de `null`.

- `fromInsumoRow`: `creado_por` ausente → `null`.
- Nunca lanza; sin backend el paso se omite (Principio I).
