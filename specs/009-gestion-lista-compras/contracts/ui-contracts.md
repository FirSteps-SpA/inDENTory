# Contract: UI Components & Domain Functions — Gestión de Lista de Compras

Contratos de comportamiento (no implementación). Todos los controles interactivos usan
`TouchButton`, `Stepper` o `touch-target` (≥48×48px, FR-026), incluidos los checkboxes de
"Comprado / Recibido". Ningún componente de esta spec activa la cámara.

## Dominio — `src/features/compras/lib/sugeridos.ts` (nuevo)

```ts
export interface ItemSugerido {
  insumo: Insumo
  stockBajo: boolean
  caducado: boolean
}

/** Une computeInsumosStockBajo y computeAlertasCaducidad (nivel 'caducado') por insumo.id
 *  (FR-004/FR-005/FR-006). Un insumo dado de baja nunca aparece (insumos ya viene filtrado
 *  por inventoryStore, FR-008). */
export function computeItemsSugeridos(
  insumos: Insumo[],
  lotes: Lote[],
  movimientos: Movimiento[],
): ItemSugerido[]
```

## Dominio — `src/features/compras/lib/itemsManuales.ts` (nuevo)

```ts
export interface ItemManualInput {
  nombre: string
  cantidad: number | null
  nota: string
  insumoId: string | null
}

export type CampoItemManual = 'nombre' | 'cantidad'
export type ValidacionItemManual =
  | { valido: true }
  | { valido: false; errores: Partial<Record<CampoItemManual, string>> }

export function validarItemManual(input: ItemManualInput): ValidacionItemManual

/** Crea el ItemCompra ('pendiente'). Abierto a todo usuario autenticado (FR-015, sin guard de rol). */
export async function agregarItemManual(input: ItemManualInput): Promise<ItemCompra>

/** estado -> 'eliminado'. Abierto a todo usuario autenticado, sin importar quién lo creó (FR-018). */
export async function eliminarItemManual(itemId: string): Promise<void>

/** estado -> 'comprado', sin Lote/Movimiento (FR-012, segundo camino). */
export async function marcarCompradoSinInventario(itemId: string): Promise<void>

/** El Insumo vinculado si sigue activo; `null` si no hay vínculo o el insumo se dio de baja
 *  (FR-017, research.md R8) — derivado, nunca escribe `ItemCompra.insumoId`. */
export function insumoVinculado(item: ItemCompra, insumosActivos: Insumo[]): Insumo | null
```

`validarItemManual` reutiliza `sugerirMateriales(insumosActivos, texto)` de
`features/insumos/lib/alta.ts` (sin cambios) para las sugerencias de vínculo mientras se escribe
el nombre (FR-016) — sin duplicar esa lógica.

## Dominio — `src/features/compras/lib/recepcion.ts` (nuevo)

```ts
export interface RecepcionInput {
  cantidad: number
  numeroLote: string
  proveedor: string
  fechaCaducidad: string   // '' si insumo.caduca === false
  confirmarCaducado: boolean
}

export type CampoRecepcion = 'cantidad' | 'numeroLote' | 'proveedor' | 'fechaCaducidad'
export type ValidacionRecepcion =
  | { valido: true; advertencias: { loteCaducado: boolean } }
  | {
      valido: false
      errores: Partial<Record<CampoRecepcion, string>>
      advertencias: { loteCaducado: boolean }
    }

export function validarRecepcion(
  input: RecepcionInput,
  insumo: Insumo,
  hoy: string,
): ValidacionRecepcion

/** Atómica (FR-010): crea Lote + Movimiento de ingreso; si `itemCompraId` no es null, marca ese
 *  ItemCompra 'comprado' en la misma transacción. Lanza si inválida o si
 *  `loteCaducado && !confirmarCaducado`. Un único lote por llamada (research.md R4). */
export async function recibirEnInsumo(
  insumo: Insumo,
  input: RecepcionInput,
  itemCompraId: string | null,
): Promise<{ lote: Lote }>
```

## Dominio — `src/features/compras/lib/compartir.ts` (nuevo)

```ts
/** Un renglón por ítem pendiente (sugerido o manual), con cantidad si se indicó y su origen. */
export function construirTextoCompartir(
  sugeridos: ItemSugerido[],
  manuales: ItemCompra[],
): string

/** true si `navigator.share` existe en este runtime (FR-021). */
export function puedeCompartir(): boolean

/** navigator.clipboard.writeText con try/catch; false si no está disponible o falla (FR-023). */
export async function copiarAlPortapapeles(texto: string): Promise<boolean>
```

## `src/features/compras/components/ComprasView.tsx` (nuevo)

Vista principal (reemplaza `ComprasPlaceholder`). Lee `insumos`/`lotes`/`movimientos`/
`itemsCompra` de `inventoryStore`. Header con "Compartir Lista" (deshabilitado sin ítems
pendientes, FR-022) y "+ Añadir Ítem Manual". Dos secciones con su propio estado vacío
(FR-002): "Sugeridos por el Sistema" (`computeItemsSugeridos`, filtrando dados de baja ya
excluidos) y "Agregados Manualmente" (`itemsCompra` con `estado === 'pendiente'`). Overlays
propios (mismo patrón que `InventarioView`: un solo `overlay` de estado, nunca desmonta la lista):
`RecibirItemForm`, `AgregarItemManualForm`, `VincularOCrearDialog`.

## `ItemSugeridoCard.tsx` / `ItemManualCard.tsx` (nuevos)

Checkbox ≥48×48px que abre `RecibirItemForm` (sugerido, o manual con `insumoVinculado(...) !==
null`) o `VincularOCrearDialog` (manual sin vincular). `ItemManualCard` agrega un botón de menú
para "Eliminar" (FR-018, sin guard de rol). Badges con `Badge` existente: `warning-30` +
`PackageMinus` para "Stock Mínimo", `danger` + `AlertTriangle` para "Caducado" (mismos variant que
`InsumoCard`), `neutral` para "Manual".

## `RecibirItemForm.tsx` (nuevo, `BottomSheet`)

Cantidad (`Stepper`, `permiteDecimales` del insumo), número de lote y proveedor (`IconField`),
fecha de vencimiento solo si `insumo.caduca` — misma forma de campos que `RegistroForm` (que esta
spec reemplaza). Ante `validarRecepcion` con `advertencias.loteCaducado`, muestra
`ConfirmarLoteCaducadoDialog` (spec 008, sin cambios) antes de confirmar.

## `AgregarItemManualForm.tsx` (nuevo, `BottomSheet`)

Nombre (obligatorio, con sugerencias de `sugerirMateriales` para vincular), `Stepper` de cantidad
con `allowEmpty`, nota (texto libre). Al vincular una sugerencia, guarda `insumoId`.

## `VincularOCrearDialog.tsx` (nuevo, `BottomSheet`)

Se abre solo para un ítem manual sin vínculo marcado como recibido (FR-012). Dos acciones: "Crear
material" (abre `AltaMaterialView` con `nombreInicial: item.nombre`; en `onCreated` llama
`marcarCompradoSinInventario`-equivalente pero ya con el insumo creado — en la práctica, marca el
`ItemCompra` `'comprado'` porque `AltaMaterialView` ya recibió el stock inicial si lo hubo,
research.md R6) y "Marcar como comprado sin inventario" (`marcarCompradoSinInventario`).

## Cambios en componentes existentes

- `src/app/App.tsx`: `{vista === 'compras' && <ComprasView />}` en vez de `ComprasPlaceholder`.
- `src/features/mas/components/MasView.tsx`: se quita la opción "Registrar insumo" y su rama
  `accion === 'registrar'` (import de `RegistroForm` incluido); `ConsumoForm` sin cambios.
- `src/stores/inventoryStore.ts`: agrega `itemsCompra: ItemCompra[]` al estado y su suscripción
  `liveQuery(() => db.itemsCompra.toArray())`, siguiendo el mismo patrón que `categorias`.
- `src/components/icons/index.tsx`: agrega `Share` (líneas de flecha saliente, estilo
  `makeIcon` existente) y `Copy` (dos rectángulos superpuestos), para el botón "Compartir Lista" y
  su mensaje de fallback (FR-023).

## Componentes eliminados

- `src/features/insumos/components/RegistroForm.tsx` (research.md R3).
- `src/features/compras/components/ComprasPlaceholder.tsx`.
