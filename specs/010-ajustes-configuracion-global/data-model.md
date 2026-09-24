# Data Model: Separación de Ajustes y Configuración Global

Extiende los modelos de las specs 002 (Insumo/Lote/Movimiento), 004 (ConfiguracionAlertas), 007
(CambioInsumo, baja lógica) y 008 (Categoria). Dexie pasa a **`version(7)`**. Contrato remoto en
[contracts/supabase-schema.md](./contracts/supabase-schema.md).

## ConfiguracionClinica (nueva, sincronizada)

Fila única global, mismo patrón que `ConfiguracionAlertas` (spec 004).

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `'global'` (literal fijo) | PK; exactamente una fila existe siempre |
| `nombre` | string \| null | `null` = sin configurar (el encabezado muestra "Gabinete"); si no es `null`, trim, no vacío |

Índices Dexie: `id`. Bootstrapping: sin fila → `nombreClinica` por defecto `null` en el store
(`useClinicaStore`), igual que `ConfiguracionAlertas` no escribe una fila hasta el primer guardado.

## Categoria (extendida)

Agrega un campo a la entidad de la spec 008 y deja de ser inmutable.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string (uuid) | PK (sin cambios) |
| `nombre` | string | sin cambios en su regla de validación; ahora puede reescribirse (renombrar, R3) |
| `creadoPor` | string | sin cambios |
| `creadoEn` | string (ISO) | sin cambios |
| `sincronizado` | boolean | sin cambios en su semántica: `false` tras crear **o** tras renombrar/fusionar/(des)activar |
| `rechazadoEn` | string \| null | sin cambios |
| `desactivadoEn` | string \| null (**nuevo**) | `null` = activa; con fecha = oculta del selector de materiales (FR-017/018), reversible |

Índices Dexie: `id, creadoEn, sincronizado` (sin cambios — `desactivadoEn` se filtra en memoria,
mismo criterio que el resto del catálogo, ≤300 filas).

- **Ya no inmutable** (a diferencia de la spec 008): `nombre` puede reescribirse
  (`renombrarCategoria`, research.md R3) y `desactivadoEn` puede alternarse
  (`desactivarCategoria`/`reactivarCategoria`). `creadoPor`/`creadoEn` siguen fijos desde su
  creación.
- Migración `version(7)`: filas existentes (specs 008/009) reciben `desactivadoEn: null` (activas).
- Las categorías precargadas y "Sin categoría" (`categorias.ts`) siguen siendo constantes de
  código — nunca ganan este campo porque nunca son filas.

### Vista derivada `CategoriaCatalogo` (sin cambios de forma, nueva regla de filtrado)

`catalogoCategorias` (spec 008) excluye además las filas con `desactivadoEn !== null` de las
opciones ofrecidas al dar de alta/editar un material, pero la sección "Categorías" de Ajustes
las sigue listando (con su estado) para poder reactivarlas.

## Insumo (sin cambios de esquema; nueva regla de proyección)

Ningún campo nuevo — `dadoDeBajaEn`/`dadoDeBajaPor` (spec 007) ahora son **reversibles**: la
proyección (`proyectarInsumo`, research.md R2) toma la `CambioInsumo` `campo: 'baja'` vigente **más
reciente** (antes: la más antigua) para decidir si el insumo queda dado de baja
(`valorNuevo: true`) o activo (`valorNuevo: null`).

## CambioInsumo (sin cambios de esquema; nuevo uso de `campo: 'baja'`)

- **Restaurar** (User Story 6): `{ campo: 'baja', valorAnterior: true, valorNuevo: null }` —
  simétrico a la baja original (`{ campo: 'baja', valorAnterior: null, valorNuevo: true }`, spec
  007). Requiere administrador (`exigirAdministrador`), igual que la baja.
- **Renombrar/fusionar categoría** (User Story 4): `{ campo: 'categoria', valorAnterior:
  <nombre anterior>, valorNuevo: <nombre resultante> }`, uno por cada insumo afectado, escrito en
  la misma transacción que actualiza la fila `Categoria` (research.md R3). Mismo campo y forma que
  ya usa `editarInsumo` (spec 007) para una edición manual — no es un tipo de cambio nuevo.

## PreferenciaNotificaciones (nueva, local, **nunca sincronizada**)

Fila única por dispositivo, mismo patrón que `Borrador` (spec 008): vive solo en Dexie, nunca se
sube ni se baja de Supabase (FR-019/027 — es del dispositivo, no de la cuenta).

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `'local'` (literal fijo) | PK; exactamente una fila existe siempre |
| `stockBajo` | boolean | Si cuenta para el indicador de la navegación. Por defecto `true` |
| `caducidad` | boolean | Si cuenta para el indicador de la navegación. Por defecto `true` |

Índices Dexie: `id`. Bootstrapping: sin fila → ambas preferencias `true` en el store
(`useAlertasStore`), igual que `ConfiguracionAlertas` con `NIVELES_AVISO_POR_DEFECTO`.

## Dexie `version(7)`

```ts
db.version(7)
  .stores({
    configuracionClinica: 'id',
    preferenciasNotificaciones: 'id',
  })
  .upgrade((tx) =>
    tx
      .table('categorias')
      .toCollection()
      .modify((categoria: Partial<Categoria>) => {
        categoria.desactivadoEn ??= null
      }),
  )
```

Ninguna tabla existente cambia su string de índices (`categorias` no gana un índice por
`desactivadoEn`, mismo criterio de filtrado en memoria ya usado en todo el catálogo).

## Diagrama de relaciones (incrementos de esta spec)

```text
ConfiguracionClinica (0..1 global row) ── leída por AppHeader (nombre o "Gabinete" por defecto)

Categoria.desactivadoEn ── filtrada por catalogoCategorias (selector de materiales)
Categoria.nombre (renombrado) ──cascada──> CambioInsumo[] (campo: 'categoria', uno por Insumo afectado)

CambioInsumo (campo: 'baja', última vigente) ── proyecta Insumo.dadoDeBajaEn/dadoDeBajaPor
  (null → activo; ver AjustesView "Insumos dados de baja" para listar/restaurar)

PreferenciaNotificaciones (0..1 fila local, nunca sincronizada) ── leída por
  contarAlertasPendientes (BottomNav badge)
```

Sin nuevas foreign keys: `ConfiguracionClinica` y `PreferenciaNotificaciones` son filas únicas sin
relación con otras entidades, igual que `ConfiguracionAlertas`; `Categoria.desactivadoEn` no
introduce relaciones nuevas (el vínculo `Insumo.categoria` sigue siendo texto libre, spec 008).
