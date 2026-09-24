# Contract: Supabase Schema Additions for Ajustes y Configuración Global

Extiende `specs/009-gestion-lista-compras/contracts/supabase-schema.md`. Debe mantenerse en
sincronía con Dexie ([data-model.md](../data-model.md)) y con el mapeo de `src/lib/sync/index.ts`.
Cierra la deuda anotada como "para la spec 010" en las specs 002/006/007/008/009: RLS de
`insumos`/`lotes`/`movimientos`, y habilita `update` sobre `categorias` (research.md R1/R3).

```sql
-- Función auxiliar compartida (evita repetir el exists(...) inline que ya usan
-- configuracion_alertas/cambios_insumo/categorias).
create or replace function es_administrador(uid uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from perfiles p where p.id = uid and p.rol = 'administrador'
  );
$$;

-- Categorías: nueva columna, ya no inmutables (renombrar/fusionar/(des)activar, R3).
alter table categorias add column desactivado_en timestamptz;

-- Configuración de clínica: fila única global, mismo patrón que configuracion_alertas.
create table configuracion_clinica (
  id text primary key default 'global',
  nombre text,
  constraint configuracion_clinica_singleton check (id = 'global')
);
```

- `insumos`, `lotes`, `movimientos`: **sin columnas nuevas** — solo ganan RLS + los triggers de R1.
- `preferencias_notificaciones`: **no existe en Supabase** — es local al dispositivo, nunca se
  sincroniza (FR-027, data-model.md).

## Row Level Security

### `insumos` / `lotes`: RLS abierta + trigger protector (research.md R1)

```sql
create or replace function proteger_catalogo_insumo() returns trigger
language plpgsql as $$
begin
  if not es_administrador(auth.uid()) then
    new.nombre := old.nombre;
    new.categoria := old.categoria;
    new.unidad_medida := old.unidad_medida;
    new.stock_minimo := old.stock_minimo;
    new.codigo_fabricante := old.codigo_fabricante;
    new.caduca := old.caduca;
    new.dado_de_baja_en := old.dado_de_baja_en;
    new.dado_de_baja_por := old.dado_de_baja_por;
  end if;
  return new;
end;
$$;

create trigger insumos_proteger_catalogo
  before update on insumos
  for each row execute function proteger_catalogo_insumo();

alter table insumos enable row level security;

create policy "insumos: leer todos los autenticados"
  on insumos for select to authenticated using (true);
create policy "insumos: cualquiera da de alta"
  on insumos for insert to authenticated with check (true);
create policy "insumos: cualquiera resincroniza, protegido por trigger"
  on insumos for update to authenticated using (true) with check (true);
-- Sin policy de delete: nunca se borra físicamente (spec 007).

create or replace function proteger_resolucion_lote() returns trigger
language plpgsql as $$
begin
  if old.estado = 'revision' and new.estado = 'activo'
     and not es_administrador(auth.uid()) then
    new.estado := old.estado;
  end if;
  return new;
end;
$$;

create trigger lotes_proteger_resolucion
  before update on lotes
  for each row execute function proteger_resolucion_lote();

alter table lotes enable row level security;

create policy "lotes: leer todos los autenticados"
  on lotes for select to authenticated using (true);
create policy "lotes: cualquiera crea"
  on lotes for insert to authenticated with check (true);
create policy "lotes: cualquiera resincroniza, protegido por trigger"
  on lotes for update to authenticated using (true) with check (true);
-- Sin policy de delete.
```

`insumos`/`lotes` mantienen sus políticas de escritura abiertas a propósito (research.md R1):
`pushInsumos`/`pushLotes` reenvían la tabla local completa cada ciclo, no solo las filas que
cambiaron; una política restrictiva por rol rechazaría de raíz el `upsert` de cualquier
dispositivo no-administrador. El trigger es quien impide que un cambio de catálogo o una baja/
restauración no autorizados persistan — el mismo resultado observable, sin ese efecto colateral.

### `movimientos`: RLS real de INSERT (nunca se reenvía una fila ya sincronizada)

```sql
alter table movimientos enable row level security;

create policy "movimientos: leer todos los autenticados"
  on movimientos for select to authenticated using (true);
create policy "movimientos: insertar como uno mismo"
  on movimientos for insert to authenticated with check (usuario_id = auth.uid());
-- Sin policy de update ni delete: ledger de solo-apéndice (spec 002); `pushMovimientos` solo
-- sube filas con sincronizado = false, nunca reenvía una ya sincronizada.
```

### `categorias`: nueva policy de `update` (antes inmutable)

```sql
create policy "categorias: solo administrador actualiza"
  on categorias for update
  to authenticated
  using (es_administrador(auth.uid()))
  with check (es_administrador(auth.uid()));
```

`categorias` no reenvía la tabla completa (`pushCategorias` solo sube filas con
`sincronizado = false` y `rechazado_en is null`, spec 008) — a diferencia de `insumos`/`lotes`, una
policy de `update` restringida por rol no rompe la resincronización rutinaria de nadie, porque
nadie sin permisos vuelve a subir una fila que no tocó.

### `configuracion_clinica`: mismo patrón que `configuracion_alertas`

```sql
alter table configuracion_clinica enable row level security;

create policy "configuracion_clinica: leer todos los autenticados"
  on configuracion_clinica for select to authenticated using (true);
create policy "configuracion_clinica: solo administrador escribe"
  on configuracion_clinica for all to authenticated
  using (es_administrador(auth.uid()))
  with check (es_administrador(auth.uid()));
```

## Sync contract (extensión de `runSyncBatch`)

Ningún push/pull existente cambia de forma — se agregan dos funciones nuevas y se extienden dos
mapeos:

- **`toCategoriaRow`/`fromCategoriaRow`** (`src/lib/sync/index.ts`): incluyen
  `desactivado_en`/`desactivadoEn`. Sin cambios en `pushCategorias`/`pullCategorias`: renombrar,
  fusionar, desactivar o reactivar una categoría simplemente pone `sincronizado = false` en la fila
  local (igual que crearla), y el push/pull ya existente la recoge, reintenta fila por fila ante un
  rechazo de RLS, y la corrige igual que hoy (spec 008).
- **`pushConfiguracionClinica`/`pullConfiguracionClinica`** (nuevas): mismo cuerpo que
  `pushConfiguracionAlertas`/`pullConfiguracionAlertas` (spec 004), apuntando a
  `configuracion_clinica`/`db.configuracionClinica`. Se agregan al mismo bloque de
  `runSyncBatch` que la configuración de alertas.
- **Restaurar un insumo (User Story 6) y la cascada de renombrar categoría (User Story 4)** no
  agregan ninguna función de sync nueva: ambas escriben `CambioInsumo` filas ordinarias
  (`campo: 'baja'` / `campo: 'categoria'`), que ya viajan por `pushCambiosInsumo`/
  `pullCambiosInsumo` y se resuelven con la reproyección existente (`reproyectarInsumos`) — solo
  cambia, del lado del cliente, qué gana la proyección (research.md R2), no el transporte.
- **`preferencias_notificaciones`**: no participa de `runSyncBatch` — es local al dispositivo
  (FR-027) y no tiene tabla remota.

Orden dentro de `runSyncBatch`: `pushConfiguracionClinica`/`pullConfiguracionClinica` se agregan
junto al bloque existente de `pushConfiguracionAlertas`/`pullConfiguracionAlertas` (sin
dependencia con ninguna otra tabla, igual que hoy).
