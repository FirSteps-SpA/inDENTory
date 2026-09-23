# Phase 1 Data Model: Rediseño de Navegación e Vista Principal de Insumos (Dashboard & Listado)

## No hay entidades nuevas persistidas

Esta spec no agrega tabla, columna ni campo nuevo a Dexie. Reutiliza sin modificar las entidades
ya definidas en specs anteriores:

- **Insumo** (`src/lib/db.ts`, spec 002) — `id`, `nombre`, `categoria`, `unidadMedida`,
  `permiteDecimales`, `caduca`, `codigoFabricante`, `creadoEn`, `stockMinimo`.
- **Lote** (spec 002) — `id`, `insumoId`, `numeroLote`, `proveedor`, `fechaCaducidad`,
  `codigoFabricante`, `estado`, `creadoEn`.
- **Movimiento** (spec 002) — ledger de solo-apéndice usado para derivar el stock disponible por
  lote (`computeStockLote`, sin cambios).
- **ConfiguracionAlertas** (spec 004) — `nivelesAvisoDias`, consumida sin cambios para calcular
  qué tan próximo a caducar está un lote.

## Vistas derivadas nuevas (no persistidas, recalculadas siempre)

### EstadoInsumo

Valor calculado en el momento de renderizar el listado, uno por `Insumo`. Nunca se guarda en
Dexie ni en Supabase.

| Campo | Tipo | Descripción |
|---|---|---|
| `insumo` | `Insumo` | El insumo al que corresponde el estado. |
| `estado` | `'ok' \| 'bajo-stock' \| 'proximo-a-caducar' \| 'caducado'` | Resultado único tras aplicar la prioridad `caducado > proximo-a-caducar > bajo-stock > ok` sobre los resultados de `computeInsumosStockBajo`/`computeAlertasCaducidad` (research.md). |
| `stockTotal` | `number` | Suma de `computeStockLote` sobre todos los lotes del insumo. |
| `loteMasProximoAVencer` | `Lote \| null` | Resultado de `loteMasProximoAVencer` (research.md); `null` si el insumo no caduca o no tiene lotes con stock. |

Producida por `computeEstadoInsumo` (`src/features/insumos/lib/estado.ts`), consumida por
`InsumoCard` (badge) y por el resumen superior (conteos ya provistos directamente por
`computeInsumosStockBajo.length` / `computeAlertasCaducidad.length`, sin pasar por
`EstadoInsumo`).

### Filtro de Inventario (estado de UI, no una entidad)

Vive como estado local de `InventarioView` (research.md), no en una store ni en Dexie:

| Campo | Tipo | Descripción |
|---|---|---|
| `texto` | `string` | Búsqueda por nombre comercial (FR-005). |
| `categoria` | `string \| ''` | Categoría seleccionada; `''` = todas (FR-007). |
| `estado` | `EstadoInsumo['estado'][]` | Estados activos; `[]` = todos (FR-008). Normalmente un solo elemento (chip individual); el resumen (FR-004) puede poner `['caducado', 'proximo-a-caducar']` a la vez. |
| `insumoSeleccionadoId` | `string \| null` | Insumo cuyo detalle está abierto (FR-010/FR-011); `null` = listado visible. |

## Contratos de componentes (presentación, sin forma de datos propia)

Los componentes nuevos de esta spec (`InventarioView`, `ResumenAlertasBanner`, `InsumoFiltros`,
`InsumoCard`, `InsumoDetalle`, `ComprasPlaceholder`, `MasView`) se documentan como contratos de
props/comportamiento en `contracts/ui-contracts.md`, no aquí — no cargan un modelo de datos
propio, solo muestran y filtran datos ya cargados por `inventoryStore`/`alertasStore`.
