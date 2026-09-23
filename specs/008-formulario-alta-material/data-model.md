# Data Model: Formulario Unificado para Creación de Nuevo Material

Extiende los modelos de las specs 002 (Insumo, Lote, Movimiento), 004 (`stockMinimo`) y 007
(baja lógica, `CambioInsumo`). Dexie pasa a **`version(5)`**. Contrato remoto en
[contracts/supabase-schema.md](./contracts/supabase-schema.md).

## Categoria (nueva, sincronizada)

Solo las categorías **creadas por un administrador**. Las precargadas y "Sin categoría" son
constantes (research.md R1).

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string (uuid) | PK |
| `nombre` | string | trim, no vacío, ≤40 caracteres; `claveCategoria(nombre)` ≠ clave de "Sin categoría" |
| `creadoPor` | string | `usuarioActual.id`, rol `administrador` al crear |
| `creadoEn` | string (ISO) | |
| `sincronizado` | boolean | local; `false` al crear |
| `rechazadoEn` | string \| null | local; se marca si el servidor rechazó por permisos (R4) |

Índices Dexie: `id, creadoEn, sincronizado`.

- **Creación**: solo dentro de `darDeAltaMaterial`; si la clave ya existe en el catálogo (R2), no
  se crea fila y se usa el nombre canónico existente (FR-012).
- **Inmutable** en esta spec (renombrar/eliminar → spec 010). Solo cambian `sincronizado` y
  `rechazadoEn`.
- Dos filas con la misma clave (creadas sin conexión) son válidas; la UI las funde.

### Constantes

```text
CATEGORIAS_PRECARGADAS = ['Cirugía', 'Restauración', 'Tratamientos pulpares', 'Fresas']
SIN_CATEGORIA = 'Sin categoría'
```

### Vista derivada: CategoriaCatalogo (no persistida)

`{ clave, nombre, origen: 'precargada' | 'sin-categoria' | 'creada' | 'texto-libre' }`, calculada
por `catalogoCategorias(categorias, insumosActivos)`: orden alfabético (`localeCompare('es')`) por
`nombre`, "Sin categoría" al final, sin claves repetidas, excluyendo filas con `rechazadoEn`.

## Insumo (extendido)

| Campo nuevo | Tipo | Regla |
|---|---|---|
| `creadoPor` | string \| null | autor del alta; `null` en insumos anteriores a esta spec (upgrade v5) |

Reglas de alta (`validarAltaMaterial`):

- `nombre`: trim, no vacío; `claveNombre` distinta de la de todo insumo **activo** (FR-006).
- `categoria`: nombre canónico de una entrada de `catalogoCategorias` o de la categoría nueva
  incluida en el alta; obligatoria (FR-005).
- `unidadMedida` ∈ `UNIDADES_MEDIDA = caja | frasco | pieza | cartucho | mL | g`;
  `permiteDecimales` derivado (solo `mL`, `g`).
- `stockMinimo`: `null` (vacío, por defecto) o número ≥ 0, entero si la unidad no admite
  decimales (FR-008).
- `caduca`: `true` por defecto.
- `codigoFabricante`: trim, vacío → `null`.
- `dadoDeBajaEn`/`dadoDeBajaPor`: `null`.

La edición (spec 007) valida `categoria` contra `catalogoCategorias` en lugar de
`categoriasDisponibles(insumos)`.

## Lote inicial + Movimiento de ingreso (existentes, sin cambios de esquema)

Solo cuando `stockInicial > 0` (FR-013..FR-018):

- `Lote`: `numeroLote` (trim, obligatorio), `proveedor` (trim, obligatorio),
  `fechaCaducidad` (obligatoria si `caduca`, si no `null`), `codigoFabricante` = el del insumo,
  `estado: 'activo'`.
- `Movimiento`: `tipo: 'ingreso'`, `cantidad = stockInicial` (validada con `validateQuantity`),
  autor = usuario actual.
- `fechaCaducidad < hoy` (fecha local) → advertencia `loteCaducado`; exige `confirmarCaducado`.

## Borrador (nueva, solo local, nunca sincronizada)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `'alta-material'` | PK fija: como máximo uno por dispositivo |
| `datos` | `AltaMaterialInput` parcial | lo escrito, incluida `categoriaNueva` |
| `actualizadoEn` | string (ISO) | |

Índice Dexie: `id`. Se borra al guardar (misma transacción), al cancelar y en `logout`.

## Posible duplicado (derivado)

`posiblesDuplicados(insumosActivos): Set<string>` — ids de insumos activos cuya `claveNombre`
coincide con la de otro activo con menor `(creadoEn, id)` (research.md R9).

## Dexie `version(5)`

```text
categorias: 'id, creadoEn, sincronizado'
borradores: 'id'
upgrade: insumos.creadoPor ??= null
```

## Transiciones

```text
Alta (sin stock)   → Insumo activo
Alta (con stock)   → Insumo activo + Lote activo + Movimiento ingreso  (atómico)
Alta + cat. nueva  → + Categoria (sincronizado=false)
Sync rechaza cat.  → Categoria.rechazadoEn=now; insumos con esa clave → 'Sin categoría'
```
