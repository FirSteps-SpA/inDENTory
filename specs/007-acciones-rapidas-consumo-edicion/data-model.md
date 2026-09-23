# Phase 1 Data Model: Acciones Rápidas — Consumo Directo y Edición/Eliminación

Dexie pasa a `version(4)`. `Lote` y `Movimiento` **no cambian** de forma; `Insumo` gana dos
campos y se agrega una tabla nueva de solo-apéndice.

## Insumo (modificado)

Definido en `src/lib/db/index.ts` (spec 002, extendido por 004). Campos nuevos:

| Campo | Tipo | Descripción |
|---|---|---|
| `dadoDeBajaEn` | `string \| null` | ISO datetime de la baja lógica; `null` = activo. Proyectado desde el primer `CambioInsumo` con `campo: 'baja'`. |
| `dadoDeBajaPor` | `string \| null` | `usuarioId` de quien dio la baja; `null` si activo. |

- **Migración** (`version(4).upgrade`): toda fila existente recibe `dadoDeBajaEn = null`,
  `dadoDeBajaPor = null`. Sin índice nuevo sobre `insumos` (el filtro de activos se hace en
  memoria, ≤300 filas).
- **Proyección**: la fila `Insumo` es el resultado de `proyectarInsumo(filaBase, cambios)`
  (research.md R9). Los campos editables son: `nombre`, `categoria`, `unidadMedida`,
  `stockMinimo`, `codigoFabricante`, `caduca`. `permiteDecimales` se recalcula siempre desde
  `unidadMedida` al proyectar (research.md R8) — no tiene cambio propio.
- **Validación (edición, FR-014)**:
  - `nombre`: `trim()` no vacío; único entre insumos **activos** comparando
    `trim().toLocaleLowerCase('es')`, excluyendo el propio insumo.
  - `stockMinimo`: `null` (sin alerta) o número finito `>= 0`; si la unidad no admite
    decimales, entero.
  - `categoria`: una de `categoriasDisponibles(insumos)` (no se crean categorías aquí).
  - `unidadMedida`: una de las unidades ya soportadas por el alta (spec 002).
  - `codigoFabricante`: `trim()`; vacío → `null`.
- **Ciclo de vida**: `activo` → (baja) → `dado de baja`. No hay transición de vuelta en esta spec.

## CambioInsumo (nuevo, solo-apéndice)

Tabla Dexie `cambiosInsumo`, índices `'id, insumoId, campo, creadoEn, sincronizado'`.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` | `crypto.randomUUID()`; desempate determinista del LWW. |
| `insumoId` | `string` | FK a `Insumo.id`. |
| `campo` | `'nombre' \| 'categoria' \| 'unidadMedida' \| 'stockMinimo' \| 'codigoFabricante' \| 'caduca' \| 'baja'` | Campo afectado. |
| `valorAnterior` | `string \| number \| boolean \| null` | Valor local visto por el autor al guardar (auditoría). `null` para `baja`. |
| `valorNuevo` | `string \| number \| boolean \| null` | Valor escrito. Para `baja`: `true`. |
| `usuarioId` | `string` | Autor (Principio VI), de `getUsuarioActualId()`. |
| `creadoEn` | `string` | ISO datetime del dispositivo (ver research.md R9, "Reloj"). |
| `sincronizado` | `boolean` | Solo local; `false` al crear, `true` tras push. |
| `rechazadoEn` | `string \| null` | Solo local; ISO datetime en que el servidor rechazó el cambio por falta de permisos (spec FR-021b); `null` en otro caso. Un cambio rechazado nunca se vuelve a subir y no participa en la proyección. |

- **Escritura**: solo vía `editarInsumo()` / `darDeBajaInsumo()` (`catalogo.ts`), dentro de una
  transacción Dexie `rw` sobre `insumos` + `cambiosInsumo`: se agregan los cambios (uno por
  campo realmente distinto; un guardado sin diferencias no escribe nada) y se reproyecta la fila.
  Nunca se borra un `CambioInsumo`; los únicos campos que cambian después de crearlo son los
  locales `sincronizado` y `rechazadoEn`.
- **Regla de resolución** (determinista; se ignoran los cambios con `rechazadoEn !== null`):
  - Campos de datos: gana el cambio con mayor `(creadoEn, id)`.
  - `baja`: si existe ≥ 1, el insumo está dado de baja; `dadoDeBajaEn/Por` = `creadoEn/usuarioId`
    del **menor** `(creadoEn, id)`.
  - Los cambios perdedores permanecen en el ledger = "valores sobrescritos registrados" (spec
    FR-021a).

## Movimiento (sin cambio de forma — nuevo uso)

- **Consumo rápido**: `tipo: 'consumo'`, `cantidad: 1`, `loteId` = resultado de
  `selectLoteConsumoRapido`, `movimientoOrigenId: null`. Indistinguible de un consumo del
  formulario completo (FR-004).
- **Reversión (Deshacer)**: `tipo: 'ajuste'`, `cantidad: +1`, mismo `loteId`,
  `movimientoOrigenId` = id del consumo revertido. A lo sumo una reversión por consumo
  (idempotencia, research.md R2).

## Estado transitorio (no persistido)

### Aviso — `avisosStore` (Zustand)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` | Id del aviso. |
| `tipo` | `'consumo' \| 'cambio-rechazado'` | `consumo`: aviso de consumo rápido con "Deshacer". `cambio-rechazado`: aviso informativo de FR-021b, sin "Deshacer". |
| `movimientoId` | `string \| null` | Consumo a revertir (`null` en `cambio-rechazado`). |
| `loteId` | `string \| null` | Lote afectado (`null` en `cambio-rechazado`). |
| `insumoNombre` | `string` | Texto del aviso. |
| `estado` | `'pendiente' \| 'revertido'` | `revertido` tras "Deshacer" (se retira ~2 s después). |
| `expiraEn` | `number` | `Date.now() + 8000` al crear. |

Máximo 3 simultáneos; al agregar un 4º se descarta el más antiguo.

### Resultado de disponibilidad de "Consumir 1"

`{ ok: true, lote: Lote } | { ok: false, motivo: 'sin-stock' | 'solo-caducado' }` —
calculado por tarjeta en render a partir del snapshot de `inventoryStore` (no persistido).

### Estado de UI en `InventarioView` (extiende el de la spec 006)

| Campo | Tipo | Descripción |
|---|---|---|
| `overlay` | `null \| { tipo: 'menu' \| 'consumir' \| 'editar' \| 'baja', insumoId: string }` | Panel inferior abierto. Convive con `texto`/`categoria`/`estado`, que no se tocan al abrir o cerrar overlays (FR-017). |

Si el `insumoId` del detalle o de un overlay deja de estar entre los insumos activos (baja
local o remota), el overlay/detalle se cierra (spec Edge Cases).
