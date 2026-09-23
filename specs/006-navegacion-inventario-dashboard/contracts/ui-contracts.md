# UI Contracts: Rediseño de Navegación e Vista Principal de Insumos (Dashboard & Listado)

Sin backend nuevo — esta spec no expone API ni endpoints. Los "contratos" aquí son de
props/comportamiento entre componentes, análogo a `specs/005-overhaul-diseno-visual/contracts/
design-system.md`, extendido para los componentes nuevos de esta spec.

## `BottomNav` (extendido)

```ts
type Vista = 'inventario' | 'compras' | 'alertas' | 'mas'

interface BottomNavProps {
  active: Vista
  onChange: (vista: Vista) => void
}
```

- 4 tabs en este orden: Inventario (`Package`), Compras (`ShoppingCart`, nuevo), Alertas (`Bell`),
  Más (`Settings`, nuevo).
- `App.tsx` sigue siendo el único dueño del estado `vista` (patrón de la spec 005) — `BottomNav`
  sigue siendo puramente presentacional.
- Default de `App.tsx`: `vista = 'inventario'` (antes `'registro'`).

## `InventarioView`

```ts
// Sin props — lee inventoryStore/alertasStore directamente, igual que AlertasView hoy.
function InventarioView(): JSX.Element
```

- Dueño del estado de filtros y de la selección de detalle (research.md): `texto`, `categoria`,
  `estado`, `insumoSeleccionadoId`.
- Compone, en este orden: `ResumenAlertasBanner`, `InsumoFiltros`, la lista de `InsumoCard`, y
  condicionalmente `InsumoDetalle` (overlay/vista condicional sobre el mismo árbol, nunca
  desmontando el listado — así FR-011 se cumple sin lógica extra de "restaurar filtros").
- Estado vacío (FR-012): si `texto`/`categoria`/`estado` combinados no producen resultados,
  renderiza un `Card` con el mensaje y un botón "Limpiar filtros" que resetea los tres a su valor
  vacío.

## `ResumenAlertasBanner`

```ts
interface ResumenAlertasBannerProps {
  totalCaducidad: number   // computeAlertasCaducidad(...).length
  totalStockBajo: number   // computeInsumosStockBajo(...).length
  onFiltrarCaducidad: () => void   // setEstado(['caducado', 'proximo-a-caducar'])
  onFiltrarStockBajo: () => void   // setEstado(['bajo-stock'])
}
```

- Dos indicadores lado a lado (grid de 2 columnas), cada uno con color + ícono + conteo + etiqueta
  de texto (nunca solo color, spec Clarifications).
- `totalCaducidad === 0 && totalStockBajo === 0` → banner muestra un estado "en buen estado" en
  vez de dos ceros (User Story 1, escenario 3).

## `InsumoFiltros`

```ts
interface InsumoFiltrosProps {
  texto: string
  onTextoChange: (valor: string) => void
  categorias: string[]           // categoriasDisponibles(insumos), sin cambios
  categoria: string
  onCategoriaChange: (valor: string) => void
  estado: EstadoInsumo['estado'][]
  onEstadoChange: (valor: EstadoInsumo['estado'][]) => void
  onSelectDesdeEscaneo: (insumo: Insumo) => void   // abre el detalle del insumo escaneado
}
```

- El campo de texto busca solo por `Insumo.nombre` (FR-005) — nunca por código de fabricante ni
  número de lote.
- `ScanButton` (spec 002, sin cambios) se monta al final del campo de búsqueda; su `onSelect` abre
  directamente el detalle del insumo encontrado, sin activar la cámara automáticamente
  (Constitution V).
- Los chips de categoría reutilizan el mismo patrón visual que `SearchPicker` (scroll horizontal,
  `touch-target`, `aria-pressed`).
- Los badges de estado (`Ok`/`Bajo Stock`/`Próximo a caducar`/`Caducado`) son single-select desde
  la UI de chips — activar uno reemplaza el arreglo por `[esa estado]` — pero el `estado` que
  gobierna el filtro es un arreglo, para permitir que el resumen (FR-004) active dos a la vez sin
  que `InsumoFiltros` necesite volverse multi-select; se combina con `texto` y `categoria` (FR-008).

## `InsumoCard`

```ts
interface InsumoCardProps {
  estadoInsumo: EstadoInsumo
  onOpen: (insumoId: string) => void
}
```

- Muestra: categoría, badge de estado (color + ícono + texto), nombre comercial, lote más próximo
  a vencer (si `estadoInsumo.loteMasProximoAVencer` no es `null`), stock total con la unidad de
  medida del insumo.
- Toda la tarjeta es el objetivo táctil (`Card as="button"`, `touch-target`, ≥48px) — tocar en
  cualquier punto llama a `onOpen` (FR-010). El ícono `ChevronRight` (nuevo) es solo decorativo,
  indicando que la tarjeta es interactiva.
- Sin acciones de consumo/edición/eliminación en esta spec (Assumptions — llegan en la spec 007).

## `InsumoDetalle`

```ts
interface InsumoDetalleProps {
  insumo: Insumo
  lotes: Lote[]           // ya filtrados por insumoId
  movimientos: Movimiento[]
  onClose: () => void
}
```

- Lista cada lote con su `numeroLote`, `fechaCaducidad` (u "No caduca" si el insumo no aplica), y
  su stock individual (`computeStockLote`); muestra el stock total agregado.
- Solo lectura: ningún botón de editar/eliminar/consumir (FR-010, Assumptions).
- `onClose` (ícono `X`, nuevo) regresa a `InventarioView` sin tocar su estado de filtros (FR-011).

## `ComprasPlaceholder`

```ts
function ComprasPlaceholder(): JSX.Element  // sin props
```

- Contenido mínimo reconocible (FR-015): título "Compras", ícono `ShoppingCart`, y un mensaje de
  que la gestión completa de reabastecimiento llega próximamente (spec 009). Ningún dato real ni
  interacción persistente.

## `MasView`

```ts
function MasView(): JSX.Element  // sin props
```

- Puente temporal (research.md): lista dos acciones — "Registrar insumo" y "Consumir insumo" —
  que al tocarse muestran `RegistroForm`/`ConsumoForm` (sin modificar) dentro de la misma pantalla.
  Se retira cuando la spec 010 introduzca la pantalla de ajustes real.

## `src/features/insumos/lib/estado.ts`

```ts
export type Estado = 'ok' | 'bajo-stock' | 'proximo-a-caducar' | 'caducado'

export interface EstadoInsumo {
  insumo: Insumo
  estado: Estado
  stockTotal: number
  loteMasProximoAVencer: Lote | null
}

export function computeEstadoInsumo(
  insumos: Insumo[],
  lotes: Lote[],
  movimientos: Movimiento[],
  nivelesAvisoDias: number[],
  hoy?: Date, // opcional, por defecto new Date() — mismo patrón que computeAlertasCaducidad (spec 004), para tests deterministas
): EstadoInsumo[]
```

## `src/features/insumos/lib/proximoLote.ts`

```ts
export function loteMasProximoAVencer(
  lotes: Lote[],
  movimientos: Movimiento[],
): Lote | null
```

## `src/stores/inventoryStore.ts` (adición)

```ts
export function searchInsumosPorEstado(
  estadosInsumo: EstadoInsumo[],
  estados: Estado[],
): EstadoInsumo[]
```

- Sigue el mismo estilo que `searchInsumosPorTexto`/`searchInsumosPorCategoria` ya existentes en
  este archivo: función pura; `estados.length === 0` devuelve todo sin filtrar, en otro caso
  conserva las entradas cuyo `estado` está incluido en `estados`.
