# UI Contracts: Acciones Rápidas — Consumo Directo y Edición/Eliminación

Contratos de props/comportamiento entre componentes y de las funciones de dominio que los
respaldan, en el mismo formato que `specs/006-navegacion-inventario-dashboard/contracts/ui-contracts.md`.
El contrato con Supabase está en [supabase-schema.md](./supabase-schema.md).

## Funciones de dominio (`src/features/insumos/lib/`)

```ts
// consumoRapido.ts
type DisponibilidadConsumoRapido =
  | { ok: true; lote: Lote }
  | { ok: false; motivo: 'sin-stock' | 'solo-caducado' }

function selectLoteConsumoRapido(
  lotesConStock: LoteConStock[],   // de fefo.ts
  hoy?: Date,                      // default new Date()
): DisponibilidadConsumoRapido

async function consumirUno(insumo: Insumo): Promise<Movimiento | null>
// Dentro de una transacción Dexie rw (lotes + movimientos): recalcula selectLoteConsumoRapido
// desde Dexie; si ya no hay lote vigente con ≥ 1 unidad devuelve null sin escribir (evita
// sobregiro por toques repetidos). Si hay, crearMovimiento({ tipo: 'consumo', cantidad: 1 }).
// Tras el commit: vibrarLeve() + avisosStore.agregar(...). Lanza si no hay usuario autenticado.

async function deshacerConsumo(movimientoConsumoId: string): Promise<Movimiento | null>
// Escribe el ajuste +1 con movimientoOrigenId; devuelve null (sin escribir) si ya existe una
// reversión para ese consumo.

// catalogo.ts
type CampoEditable = 'nombre' | 'categoria' | 'unidadMedida' | 'stockMinimo'
  | 'codigoFabricante' | 'caduca'
type CambiosInsumoInput = Partial<Pick<Insumo, CampoEditable>>

function validarEdicionInsumo(
  insumo: Insumo, cambios: CambiosInsumoInput, insumosActivos: Insumo[],
): { valido: true } | { valido: false; errores: Partial<Record<CampoEditable, string>> }

async function editarInsumo(insumoId: string, cambios: CambiosInsumoInput): Promise<void>
async function darDeBajaInsumo(insumoId: string): Promise<void>
// Ambas: lanzan si rol !== 'administrador' (FR-012) o si la validación falla; escriben
// CambioInsumo + reproyección en una sola transacción Dexie; sin red.

// proyeccion.ts
function proyectarInsumo(insumo: Insumo, cambios: CambioInsumo[]): Insumo  // pura, determinista
async function reproyectarInsumos(insumoIds?: string[]): Promise<void>     // aplica a Dexie
```

## `InsumoCard` (modificado)

```ts
interface InsumoCardProps {
  estadoInsumo: EstadoInsumo
  disponibilidad: DisponibilidadConsumoRapido
  onOpen: (insumoId: string) => void        // área principal
  onConsumirUno: (insumoId: string) => void // botón "Consumir 1"
  onAbrirMenu: (insumoId: string) => void   // botón "⋮" y toque largo
}
```

- Raíz: `Card` como contenedor (`div`), no como botón (research.md R5). Tres controles hermanos,
  todos ≥48x48px (FR-022).
- Botón "Consumir 1": etiqueta `Consumir 1`; `aria-label="Consumir 1 <unidadMedida> de <nombre>"`.
  Si `disponibilidad.ok === false` → `disabled` y el texto visible cambia a "Sin stock" o
  "Solo stock caducado" (FR-003) — nunca solo color.
- Botón "⋮": `aria-label="Más opciones de <nombre>"`, `aria-haspopup="dialog"`.
- Área principal: `onClick` → `onOpen`; toque largo (500 ms, research.md R6) y `contextmenu` →
  `onAbrirMenu`; un toque largo no dispara además `onOpen`.
- El badge de estado, nombre, lote y stock se mantienen como en la spec 006.

## `InsumoAccionesMenu` (nuevo)

```ts
interface InsumoAccionesMenuProps {
  insumo: Insumo
  rol: UsuarioActual['rol']
  onVerDetalle: () => void
  onConsumirOtraCantidad: () => void
  onEditar: () => void
  onEliminar: () => void
  onClose: () => void
}
```

- Se renderiza dentro de `BottomSheet` con título = nombre del insumo.
- Opciones, en este orden: "Ver detalle", "Consumir otra cantidad" (todos los roles); "Editar",
  "Eliminar" (solo `rol === 'administrador'` — para `personal` no se renderizan, FR-012).
  "Eliminar" con variante de peligro.
- Elegir una opción cierra el menú y abre el overlay correspondiente.

## `BottomSheet` (nuevo, `src/components/ui/`)

```ts
interface BottomSheetProps {
  titulo: string
  onClose: () => void
  children: ReactNode
}
```

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → título. Cierra con clic en el fondo,
  Escape, o botón "Cerrar" (≥48x48px). Foco inicial en el primer control; al cerrar, el foco
  vuelve al control que lo abrió.
- Panel anclado abajo, ancho máximo del contenedor de la app (`max-w-md`), tokens de la spec 005.

## `ConsumoForm` (extendido, retrocompatible)

```ts
interface ConsumoFormProps {
  insumoInicial?: Insumo  // nuevo: preselecciona y oculta el SearchPicker
  onDone?: () => void     // nuevo: llamado tras un consumo exitoso
}
```

- Sin props: comportamiento idéntico al actual (lo sigue usando `MasView`).
- Con `insumoInicial`: permite elegir cantidad y lote manualmente, **incluidos lotes
  caducados** — la vía explícita de la Clarification Q1.

## `EditarInsumoForm` (nuevo)

```ts
interface EditarInsumoFormProps {
  insumo: Insumo
  onGuardado: () => void
  onCancelar: () => void
}
```

- Campos precargados (FR-013): Nombre comercial (texto), Categoría (select de
  `categoriasDisponibles`), Unidad de medida (mismas opciones que el alta), Stock mínimo
  (numérico con botones `−`/`+` ≥48px; vacío = sin alerta), Código de fabricante (texto +
  `ScanButton` explícito, FR-023), "¿Caduca?" (switch). "Admite decimales" es texto derivado de
  la unidad (research.md R8).
- Si la unidad cambia respecto a la original, muestra el aviso: "Las cantidades ya registradas
  no se convierten a la nueva unidad."
- Si "¿Caduca?" cambia y el insumo tiene lotes, aviso: "Los lotes existentes no se modifican."
- Errores de `validarEdicionInsumo` se muestran bajo cada campo (`aria-describedby`), sin
  limpiar lo escrito. "Guardar" deshabilitado mientras no haya cambios.
- "Cancelar" descarta todo sin escribir (FR-017).

## `ConfirmarBajaDialog` (nuevo)

```ts
interface ConfirmarBajaDialogProps {
  insumo: Insumo
  stockTotal: number
  onConfirmar: () => void
  onCancelar: () => void
}
```

- Texto: "¿Eliminar «<nombre>»? Dejará de aparecer en el inventario, las alertas y los
  formularios. Su historial de movimientos se conserva."
- Si `stockTotal > 0`: advertencia adicional destacada (color + ícono + texto): "Aún quedan
  <stockTotal> <unidadMedida> en stock." (FR-019, Clarification Q5). No bloquea la confirmación.
- Botones: "Cancelar" (secundario) y "Eliminar" (peligro), ambos ≥48px.

## `AvisosConsumo` (nuevo, `src/app/`) + `avisosStore`

```ts
interface AvisosState {
  avisos: Aviso[]                               // ver data-model.md
  agregar: (a: Omit<Aviso, 'id' | 'estado' | 'expiraEn'>) => void  // a.tipo: 'consumo' | 'cambio-rechazado'
  deshacer: (avisoId: string) => Promise<void>  // llama deshacerConsumo
  descartar: (avisoId: string) => void
}
```

- Montado una vez en `App.tsx` (visible en cualquier sección). Región `role="status"`,
  `aria-live="polite"`.
- Cada aviso: "Consumido 1 <unidad> de <nombre>" + botón "Deshacer" (≥48x48px). Expira a los
  8 s (Clarification Q2); máx. 3 apilados. Tras deshacer: "Consumo revertido" y se retira ~2 s
  después.
- Aviso `cambio-rechazado` (spec FR-021b): "Tu cambio en «<nombre>» no se guardó: ya no tienes
  permisos de administrador.", sin botón "Deshacer", misma duración y misma pila.

## `InventarioView` (modificado)

- Calcula `disponibilidad` por tarjeta con `selectLoteConsumoRapido` sobre el snapshot de
  `inventoryStore` (sin lecturas extra a Dexie por tarjeta) — solo para habilitar/deshabilitar
  el botón; la decisión definitiva del lote la toma `consumirUno` dentro de su transacción.
- Dueño del estado `overlay` (data-model.md); abrir/cerrar overlays no toca los filtros.
- Cierra el detalle/overlay si su insumo ya no está entre los activos.

## `inventoryStore` (modificado)

- `insumos`: solo activos (`dadoDeBajaEn === null`) — research.md R10.
- Nuevo `cambiosInsumo: CambioInsumo[]` suscrito vía `liveQuery` (para auditoría/pruebas; la UI
  de esta spec no lo muestra).
