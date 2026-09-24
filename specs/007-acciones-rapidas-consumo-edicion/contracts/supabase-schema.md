# Contract: Supabase Schema Additions for Acciones Rápidas

Extiende `specs/002-registro-consumo-insumos/contracts/supabase-schema.md` (tabla `insumos`) y
agrega una tabla de solo-apéndice. Mismo criterio que la spec 004: este es el contrato que debe
mantenerse en sincronía con Dexie (`data-model.md`) y con el mapeo de `src/lib/sync/index.ts`.

```sql
-- Baja lógica (FR-018). Aditivo: filas existentes quedan activas (null).
alter table insumos add column dado_de_baja_en timestamptz;
alter table insumos add column dado_de_baja_por uuid references auth.users (id);

-- Ledger de cambios por campo (FR-021a, research.md R9). Solo-apéndice.
create table cambios_insumo (
  id uuid primary key,
  insumo_id uuid not null references insumos (id),
  campo text not null check (campo in (
    'nombre', 'categoria', 'unidadMedida', 'stockMinimo', 'codigoFabricante', 'caduca', 'baja'
  )),
  valor_anterior jsonb,
  valor_nuevo jsonb,
  usuario_id uuid not null references auth.users (id),
  creado_en timestamptz not null
);

create index cambios_insumo_insumo_id_idx on cambios_insumo (insumo_id);
```

- `movimientos`: **sin cambios**. El deshacer usa `tipo = 'ajuste'` + `movimiento_origen_id`,
  ya existentes.
- `valor_anterior`/`valor_nuevo` son `jsonb` porque el tipo depende del `campo`
  (texto, número, booleano o null).

## Row Level Security

- **`insumos.dado_de_baja_*`**: sin restricción nueva — `insumos` sigue sin RLS (deuda de la
  spec 002, mismo criterio que `stock_minimo` en la spec 004). El rol se controla en el cliente
  y, del lado servidor, a través del ledger (abajo), que es la fuente de verdad de la proyección.
- **`cambios_insumo`**: tabla nueva → RLS real, mismo patrón que `configuracion_alertas`:

```sql
alter table cambios_insumo enable row level security;

create policy "cambios_insumo: leer todos los autenticados"
  on cambios_insumo for select
  to authenticated
  using (true);

create policy "cambios_insumo: solo administrador inserta, como sí mismo"
  on cambios_insumo for insert
  to authenticated
  with check (
    usuario_id = auth.uid()
    and exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'administrador')
  );

-- Sin políticas de update/delete: el ledger es inmutable para los clientes.
```

- Consecuencia: si un cliente no-administrador lograra escribir una fila `insumos` modificada,
  la próxima reproyección en cualquier dispositivo la corrige desde el ledger para los campos
  que tengan cambios registrados. Cerrar `insumos` con RLS queda para la spec 010.

## Sync contract (extensión de `runSyncBatch`)

Orden del ciclo (research.md R9):

1. `pushInsumos` (existente, ahora incluye `dado_de_baja_en`/`dado_de_baja_por` en
   `toInsumoRow`). Sube `filaParaSubir(insumo, cambios)`: la fila local con los cambios aún no
   sincronizados deshechos, para que la fila remota nunca adelante un cambio que el servidor
   todavía no aceptó (o que rechazará por RLS). Va **primero** para que todo insumo local exista en Supabase antes de subir
   sus cambios (`cambios_insumo.insumo_id` es FK): un insumo creado y editado sin conexión
   sincroniza todo en el mismo ciclo. Subir primero puede dejar momentáneamente en Supabase una
   fila con una proyección vieja; es inocuo, porque todo dispositivo la recalcula desde
   `cambios_insumo` (paso 5).
2. `pushCambiosInsumo`: `upsert` por `id` de los `cambiosInsumo` con `sincronizado = false` y
   `rechazadoEn = null`; se marcan `sincronizado = true` localmente **solo si el upsert no
   devolvió error**. Rechazo por permisos (spec FR-021b):
   - Si el lote falla con un error de RLS (código Postgres `42501`, o mensaje
     `new row violates row-level security policy`), se reintenta **fila por fila** para que un
     cambio rechazado no bloquee a los válidos.
   - Cada fila que falla individualmente con ese error se marca `rechazadoEn = now()` (sigue
     `sincronizado = false`, nunca se vuelve a subir, no se borra); sus insumos se reproyectan y
     se emite un aviso `cambio-rechazado` por insumo afectado.
   - Cualquier otro error (red, 5xx, FK) no marca nada: se reintenta en el siguiente ciclo.
   - Tras detectar un rechazo, se refresca el rol local con `fetchPerfilPropio`
     (`src/lib/supabase/perfiles.ts`) y se actualiza `authStore`, de modo que la UI deje de
     ofrecer "Editar"/"Eliminar". Sin conexión se conserva el rol cacheado (spec 003).
3. `pullCambiosInsumo`: `select *` → `bulkPut` en Dexie con `sincronizado = true`.
4. `pullInsumos` (existente, `fromInsumoRow` mapea los campos nuevos; ausentes → `null`).
5. `reproyectarInsumos()` una sola vez sobre todos los insumos con cambios, corrigiendo
   cualquier fila (local o recién bajada) desactualizada respecto del ledger.
6. Resto del ciclo sin cambios (lotes, configuración, movimientos, `reconcileOverdraft`).

- Nunca lanza; un backend ausente simplemente omite el ciclo (Principio I, sin cambios).
- Convergencia: dos dispositivos con el mismo conjunto de `cambios_insumo` producen la misma
  fila `insumos` (la proyección es pura y el desempate por `(creado_en, id)` es total).
