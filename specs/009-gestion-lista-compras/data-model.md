# Data Model: Gestión de Lista de Compras (Reabastecimiento)

Extiende los modelos de las specs 002 (Insumo, Lote, Movimiento), 004 (alertas de stock bajo y
caducidad), 007 (baja lógica) y 008 (`AltaMaterialView`, `sugerirMateriales`). Dexie pasa a
**`version(6)`**. Contrato remoto en [contracts/supabase-schema.md](./contracts/supabase-schema.md).

## ItemCompra (nueva, sincronizada)

Un pedido puntual agregado a mano (FR-015). Nunca se borra físicamente (research.md R1).

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string (uuid) | PK |
| `nombre` | string | trim, no vacío (FR-015, Edge Cases) |
| `cantidad` | number \| null | numérico, sin unidad fija (Clarification Q1); `null` por defecto |
| `nota` | string \| null | trim, vacío → `null` |
| `insumoId` | string \| null | vínculo opcional a `Insumo.id` (FR-016); no se limpia por escritura al dar de baja el insumo (research.md R8) |
| `estado` | `'pendiente' \| 'comprado' \| 'eliminado'` | `'pendiente'` al crear; transición única (research.md R1) |
| `creadoPor` | string | `usuarioActual.id` |
| `creadoEn` | string (ISO) | |
| `compradoPor` | string \| null | quien lo marcó `'comprado'` (con o sin recepción a inventario) |
| `compradoEn` | string \| null | |

Índices Dexie: `id, insumoId, estado, creadoEn`.

- **Sin unicidad de nombre** entre ítems manuales, ni contra el catálogo (FR-020).
- **`estado: 'eliminado'`** no registra autor/fecha adicionales — FR-018 no lo exige.
- Se sincroniza sin bandera `sincronizado` (research.md R2): cada ciclo sube el estado local
  completo, como `lotes`.

## Vista derivada: ItemSugerido (no persistida)

```ts
interface ItemSugerido {
  insumo: Insumo
  stockBajo: boolean   // computeInsumosStockBajo (spec 004)
  caducado: boolean    // computeAlertasCaducidad(...).nivel === 'caducado' (spec 004)
}
```

Calculada por `computeItemsSugeridos(insumos, lotes, movimientos)` (research.md R5): un `Insumo`
activo aparece si `stockBajo || caducado` es verdadero, con ambos booleanos independientes para
renderizar uno o los dos badges (FR-006). Se recalcula en cada render desde `inventoryStore`
(FR-007) — ningún estado propio, igual que `AlertaStockBajo`/`AlertaCaducidad`.

## Recepción (sin nueva entidad — reutiliza Lote/Movimiento de la spec 002)

Al marcar un ítem (sugerido o manual vinculado) como recibido (FR-009/FR-010):

- `Lote`: `numeroLote` (trim, obligatorio), `proveedor` (trim, obligatorio), `fechaCaducidad`
  (obligatoria si `insumo.caduca`, si no `null`), `codigoFabricante` = el del insumo,
  `estado: 'activo'`.
- `Movimiento`: `tipo: 'ingreso'`, `cantidad` (validada con `validateQuantity`, spec 002), autor =
  usuario actual.
- `fechaCaducidad < hoy` (fecha local) → advertencia `loteCaducado`; exige `confirmarCaducado`
  (mismo diálogo `ConfirmarLoteCaducadoDialog` de la spec 008, sin cambios).
- Si la recepción vino de un `ItemCompra` (sugerido con vínculo directo, o manual vinculado), la
  misma transacción marca `estado: 'comprado'`, `compradoPor`, `compradoEn`.
- Un único lote por recepción (research.md R4): sin campo para lotes múltiples.

## Ítem manual sin vincular → crear material (sin nueva entidad — reutiliza spec 008)

FR-012 no define una estructura propia: abre `AltaMaterialView` con `nombreInicial: item.nombre`
(research.md R6). Si se guarda, el `ItemCompra` pasa a `estado: 'comprado'`; si se cancela, sigue
`'pendiente'` sin cambios.

## Dexie `version(6)`

```text
itemsCompra: 'id, insumoId, estado, creadoEn'
```

Tabla nueva; ninguna tabla existente cambia de forma (no hay `upgrade()` de filas previas).

## Transiciones

```text
Agregar manual              → ItemCompra 'pendiente'
Vincular a material         → ItemCompra.insumoId = <Insumo.id> (aún 'pendiente')
Recibir (sugerido o manual  → Lote activo + Movimiento ingreso  (atómico)
  vinculado)                  + ItemCompra 'comprado' si venía de un ItemCompra
Manual sin vincular,         → Insumo activo (+ Lote/Movimiento si stock inicial > 0, spec 008)
  crear material                + ItemCompra 'comprado'
Manual sin vincular,         → ItemCompra 'comprado' (sin Lote/Movimiento)
  sin inventario
Eliminar ítem manual        → ItemCompra 'eliminado' (nunca se borra la fila)
Insumo vinculado se da de   → insumoVinculado(item, insumosActivos) devuelve null en memoria;
  baja (spec 007)              ItemCompra.insumoId no cambia (research.md R8)
Sugerido deja de calificar  → desaparece de "Sugeridos" (recalculado, sin fila propia que tocar)
```
