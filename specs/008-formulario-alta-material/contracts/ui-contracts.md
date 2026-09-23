# Contract: UI Components & Domain Functions — Alta de Material

Contratos de comportamiento (no implementación). Todos los controles interactivos usan
`TouchButton` o `touch-target` (≥48×48px, FR-025). Ningún componente activa la cámara al montar
(Principio V, FR-003).

## Dominio — `src/features/insumos/lib/categorias.ts` (nuevo)

```ts
export const CATEGORIAS_PRECARGADAS: readonly string[]
export const SIN_CATEGORIA: 'Sin categoría'
export function claveCategoria(nombre: string): string
export interface CategoriaCatalogo { clave: string; nombre: string; origen: 'precargada' | 'sin-categoria' | 'creada' | 'texto-libre' }
/** Selector de alta/edición: todas, alfabético, "Sin categoría" al final (FR-009). */
export function catalogoCategorias(categorias: Categoria[], insumosActivos: Insumo[]): CategoriaCatalogo[]
/** Chips del Inventario: solo claves con ≥1 insumo activo, con nombre canónico. */
export function categoriasEnUso(categorias: Categoria[], insumosActivos: Insumo[]): CategoriaCatalogo[]
/** Nombre canónico si la clave existe; `null` si sería una categoría nueva (FR-012). */
export function resolverCategoria(nombre: string, catalogo: CategoriaCatalogo[]): string | null
```

`searchInsumosPorCategoria(insumos, categoria)` (inventoryStore) pasa a comparar por
`claveCategoria`. `categoriasDisponibles` queda reemplazada por `categoriasEnUso` en
`InventarioView`/`SearchPicker` y por `catalogoCategorias` en `EditarInsumoForm`/`validarEdicionInsumo`.

## Dominio — `src/features/insumos/lib/alta.ts` (nuevo)

```ts
export interface AltaMaterialInput {
  nombre: string
  categoria: string            // nombre elegido o escrito como nueva
  categoriaNueva: boolean      // true solo si se usó "+ Crear nueva categoría"
  unidadMedida: UnidadMedida
  codigoFabricante: string
  stockMinimo: number | null
  caduca: boolean
  stockInicial: number         // 0 por defecto
  lote: { numeroLote: string; proveedor: string; fechaCaducidad: string } // ignorado si stockInicial = 0
  confirmarCaducado: boolean
}
export type ValidacionAlta =
  | { valido: true; advertencias: { loteCaducado: boolean } }
  | { valido: false; errores: Partial<Record<CampoAlta, string>>; advertencias: { loteCaducado: boolean } }
export function validarAltaMaterial(input, insumosActivos, catalogo, hoy: string): ValidacionAlta
/** Atómica (R3). Lanza si inválida, si `loteCaducado && !confirmarCaducado`,
 *  o si `categoriaNueva` y el usuario no es administrador. */
export async function darDeAltaMaterial(input: AltaMaterialInput): Promise<{ insumo: Insumo; conLoteInicial: boolean }>
export function sugerirMateriales(insumosActivos: Insumo[], texto: string, limite?: number): Insumo[]
export function posiblesDuplicados(insumosActivos: Insumo[]): Set<string>
```

- `stockInicial = 0` → no crea lote ni movimiento; nunca exige campos de lote (FR-015).
- `caduca = false` → `fechaCaducidad` se descarta aunque venga escrita (Edge Cases).

## `useBorradorAlta` — `src/features/insumos/lib/useBorradorAlta.ts` (nuevo)

```ts
function useBorradorAlta(inicial: Partial<AltaMaterialInput>): {
  datos: AltaMaterialInput; setDatos(patch): void
  restaurado: boolean          // true si se cargó un borrador existente
  isLoading: boolean
  descartar(): Promise<void>
}
```

Guarda con *debounce* 400 ms; un borrador existente prevalece sobre `inicial` (R6). No guarda
mientras el formulario está vacío (no crea borradores "fantasma").

## `AltaMaterialView` — `src/features/insumos/components/AltaMaterialView.tsx` (nuevo)

```ts
interface AltaMaterialViewProps {
  nombreInicial?: string
  onCreated: (resultado: { insumo: Insumo; conLoteInicial: boolean }) => void
  onCancel: () => void
  onAbrirExistente: (insumo: Insumo) => void
}
```

Comportamiento:

| Situación | Resultado |
|---|---|
| Montaje | foco en "Nombre del material"; aviso "Recuperamos tu alta sin terminar" si `restaurado` |
| Nombre ≥2 caracteres con coincidencias | lista de hasta 5 sugerencias "Ya existe" → `onAbrirExistente` |
| Selector de categoría | `<select>` con `catalogoCategorias`; última opción `+ Crear nueva categoría` solo para administrador → campo de texto inline + `Usar` / `Volver a la lista` |
| Unidad | grilla 3×2 de botones `aria-pressed` (R5) |
| Stock mínimo | `Stepper` vacío por defecto; "−" en vacío no hace nada, "+" en vacío → 1 |
| Stock inicial | `Stepper` 0 por defecto, mínimo 0 |
| Interruptor "Sujeto a caducidad" | `role="switch"`, activado por defecto |
| Stock inicial > 0 | muestra sección "Primer lote" (N.º de lote, Proveedor, Vencimiento si caduca) |
| Botón fijo | "Guardar" (stock 0) / "Guardar e Ingresar" (stock > 0); deshabilitado y "Guardando…" en curso |
| Lote con fecha < hoy | diálogo `ConfirmarLoteCaducadoDialog` ("Este lote ingresaría ya caducado") → `Guardar igual` / `Revisar fecha` |
| Errores | mensaje bajo cada campo (`aria-describedby`), foco al primer campo con error; nada se borra |
| Código escrito/escaneado de un activo | aviso en línea "Este código ya corresponde a «X»" + botón `Abrir «X»` → `onAbrirExistente` |
| `Cancelar` con datos | `BottomSheet` de confirmación "¿Descartar este material?" → `Descartar` / `Seguir editando` |
| `Cancelar` vacío | `onCancel()` directo |

## `Stepper` — `src/components/ui/Stepper.tsx` (nuevo)

`{ id, label, value: number | null, onChange, min = 0, permiteDecimales, allowEmpty }` — botones
`−`/`+` (`TouchButton`, `aria-label` "Restar uno"/"Sumar uno") e input numérico central.
Extraído del patrón de `RegistroForm`/`EditarInsumoForm`; esas vistas pueden adoptarlo sin
cambiar comportamiento.

## Cambios en componentes existentes

- **`InventarioView`**: botón `+ Material` (primario, con ícono `Plus`) sobre el buscador; estado
  de overlay `'alta'`. `onCreated` → cierra y agrega un aviso `material-creado`
  (`"«Nombre» agregado al inventario"`, 4 s, sin Deshacer). `onAbrirExistente` → cierra el alta
  (el borrador queda guardado) y abre `InsumoDetalle` de ese insumo. Chips con `categoriasEnUso`.
- **`InsumoCard`**: nuevo prop `posibleDuplicado: boolean` → `Badge` variante `warning-30`
  "Posible duplicado" (solo lo pasa `InventarioView` si el usuario es administrador).
- **`SearchPicker`**: "Crear insumo nuevo" abre `AltaMaterialView` con `nombreInicial = texto`;
  se elimina `CrearInsumoForm`. `onCreated` → `onSelect(insumo, { conLoteInicial })`.
- **`RegistroForm`**: si `conLoteInicial`, muestra `Lote de "X" registrado.` y no selecciona el
  insumo; si no, lo selecciona como hoy.
- **`ScanButton`**: prop opcional `onCodigo?: (codigo: string) => void`; si está, entrega el código
  crudo y omite la búsqueda de insumo/lote.
- **`EditarInsumoForm`**: selector con `catalogoCategorias` (incluye "Sin categoría", sin opción de
  crear) y unidades de `UNIDADES_MEDIDA` ampliada, con las mismas etiquetas.
- **`avisosStore`**: `tipo` agrega `'material-creado' | 'categoria-rechazada'` (informativos, sin
  Deshacer); `material-creado` dura 4 s.
- **`authStore.logout`**: además borra `db.borradores`.
