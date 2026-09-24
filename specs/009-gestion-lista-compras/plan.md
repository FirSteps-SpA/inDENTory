# Implementation Plan: Gestión de Lista de Compras (Reabastecimiento)

**Branch**: `009-gestion-lista-compras` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-gestion-lista-compras/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Reemplaza el placeholder de "Compras" (`ComprasPlaceholder`) por una vista completa
**`ComprasView`** con dos secciones recalculadas en vivo: **Sugeridos** (insumos con stock bajo o
con un lote caducado con stock, reutilizando los cálculos ya existentes de la spec 004) y
**Agregados Manualmente** (una entidad nueva y sincronizada, `ItemCompra`). Marcar cualquier ítem
como "Comprado / Recibido" abre un flujo de un único lote (cantidad, número de lote, proveedor,
vencimiento si aplica) que crea `Lote` + `Movimiento` de ingreso en una transacción — el mismo
patrón que ya usa `RegistroForm`, al que esta vista sustituye por completo (FR-011): "Registrar
insumo" desaparece de "Más". Un ítem manual sin vincular se resuelve reutilizando
`AltaMaterialView` (spec 008) tal cual, con el nombre precargado. "Compartir Lista" arma un texto
plano y lo entrega a `navigator.share` o al portapapeles.

`ItemCompra` nunca se borra físicamente (evita inventar borrado sincronizado, ausente en el
proyecto): pasa por `estado: pendiente → comprado | eliminado`. Se sincroniza como `lotes` —
subida completa cada ciclo, sin bandera `sincronizado` ni reintento por fila — porque, a
diferencia de `categorias`/`cambios_insumo`, ninguna escritura puede ser rechazada por rol (spec
Clarifications: abierto a todo el personal).

## Technical Context

**Language/Version**: TypeScript (React 19) on Node.js ≥20 (LTS) — scaffold sin cambios

**Primary Dependencies**: Ninguna nueva. React, Tailwind CSS v4, Zustand, Dexie, Supabase JS,
componentes existentes (`Card`, `Badge`, `TouchButton`, `IconField`, `Stepper`, `BottomSheet`) y
`AltaMaterialView`/`ConfirmarLoteCaducadoDialog`/`sugerirMateriales` de la spec 008.
`navigator.share`/`navigator.clipboard` (APIs del navegador, sin librería).

**Storage**: Dexie `version(6)`: tabla nueva `itemsCompra` (sincronizada, sin bandera
`sincronizado` — ver research.md R2). Supabase: tabla `items_compra` con RLS abierta a todo
autenticado ([contracts/supabase-schema.md](./contracts/supabase-schema.md)). `Insumo`, `Lote`,
`Movimiento`, `Categoria`, `CambioInsumo` sin cambios de esquema.

**Testing**: Vitest + React Testing Library + `fake-indexeddb`. Unitarias:
`computeItemsSugeridos` (unión stock bajo ∪ caducado, badges combinados, excluye baja), validación
y transacción de `agregarItemManual`/`eliminarItemManual`/`marcarCompradoSinInventario`,
`insumoVinculado` (deriva `null` si el insumo se dio de baja, sin escritura), `validarRecepcion` +
atomicidad de `recibirEnInsumo` (lote + movimiento + marca del ítem, todo o nada; advertencia de
caducado ya pasado igual que spec 008), `construirTextoCompartir`, `sync-items-compra` (push
completo + pull, sin RLS a rechazar). Integración `compras.test.tsx`: US1–US4 completas. Se
elimina `tests/integration/registro.test.tsx` (prueba `RegistroForm`, que se borra); se ajustan
`bottom-nav.test.tsx` (deja de referenciar `ComprasPlaceholder` y la opción "Registrar insumo" en
Más) y, si corresponde, `inventario.test.tsx`/`acciones-rapidas.test.tsx` si dependían del bridge.

**Target Platform**: PWA instalable en navegadores táctiles/móviles, uso con guantes (Principio III).

**Project Type**: Frontend PWA + esquema Supabase (sin backend propio)

**Performance Goals**: "Sugeridos" recalculado en memoria sobre ≤300 insumos sin lag perceptible
(mismos cálculos ya usados en `InventarioView`/`AlertasView`). SC-001 < 5 s, SC-003 < 15 s,
SC-004 < 45 s, SC-005 < 10 s (flujo humano, sin medición de red).

**Constraints**: recepción atómica lote + movimiento + marca del ítem (FR-010); un único lote por
recepción (FR-009, Clarification Q3); ítems manuales nunca requieren cámara (Constitution V no
aplica aquí — esta spec no toca el escáner); controles ≥48×48px incluidos los checkboxes
(FR-026); offline-first (FR-024); sin librerías nuevas; `movements.ts` sigue siendo la única vía
de escritura de movimientos; `ItemCompra` nunca se borra físicamente (research.md R1).

**Scale/Scope**: ≈0–30 ítems pendientes de compra por clínica en un momento dado. Superficie: 1
vista nueva (`ComprasView`), 5 componentes nuevos, 4 módulos de dominio nuevos
(`sugeridos`, `itemsManuales`, `recepcion`, `compartir`), y extensiones en `App.tsx`, `MasView`,
`db/index.ts`, `sync/index.ts`, `inventoryStore.ts`, `icons/index.tsx`. Se elimina `RegistroForm`
y su prueba dedicada.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Offline-First por Diseño | PASS | Recibir un ítem escribe primero en Dexie (transacción lote + movimiento + `itemsCompra`); agregar/eliminar un ítem manual también. `itemsCompra` se sincroniza en segundo plano sin bandera de reintento por fila (no hay rechazos posibles, research.md R2). |
| II. Estado Reactivo Local con Zustand | PASS | `itemsCompra` se agrega a `inventoryStore` existente (research.md's "extend, don't duplicate" ya aplicado en 004/008), no una tienda nueva. |
| III. Interfaz Táctil | PASS | Checkboxes, `Stepper` para cantidad, `TouchButton`/`BottomSheet` reutilizados; todo ≥48×48px (FR-026). |
| IV. Trazabilidad y Alertas | PASS | "Sugeridos" reutiliza literalmente `computeInsumosStockBajo`/`computeAlertasCaducidad` (spec 004) — cero reglas de alerta nuevas. Toda recepción crea lote + movimiento con autor. |
| V. Búsqueda Manual Ágil | PASS | Esta spec no activa la cámara en ningún punto; el vínculo de un ítem manual usa `sugerirMateriales` (texto), y el alta de un material nuevo reutiliza `AltaMaterialView` sin cambios (su propia cámara bajo demanda ya es conforme, spec 008). |
| VI. Control Multi-Usuario | PASS | `ItemCompra.creadoPor`/`compradoPor` y el `Movimiento.usuarioId` de cada recepción, capturados sin conexión. |
| Pila Tecnológica Obligatoria | PASS | Sin dependencias nuevas; `navigator.share`/`clipboard` son APIs del navegador, no paquetes. |

Result: **PASS**.

**Post-Phase 1 re-check**: `items_compra` es la primera tabla de esta feature con RLS habilitada
desde su creación (a diferencia de `insumos`/`lotes`/`movimientos`, sin RLS por deuda heredada de
la 002) — no es una excepción nueva, es más estricta que el resto del esquema, así que no
compromete ningún principio. `insumoId` no se limpia por escritura cuando su insumo se da de baja
(spec 007): se deriva en memoria (`insumoVinculado`), igual que `InventarioView` ya cierra paneles
de insumos inactivos sin un efecto dedicado. Resultado: **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/009-gestion-lista-compras/
├── plan.md              # This file
├── research.md          # Phase 0: R1–R8
├── data-model.md        # Phase 1: ItemCompra, ItemSugerido, Dexie v6
├── quickstart.md        # Phase 1: validación de punta a punta
├── contracts/
│   ├── ui-contracts.md      # ComprasView y módulos de dominio
│   └── supabase-schema.md   # items_compra + RLS, orden de sync
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
inDENTory/
├── src/
│   ├── components/icons/
│   │   └── index.tsx                            # Extendido: Share, Copy
│   ├── features/compras/
│   │   ├── components/
│   │   │   ├── ComprasView.tsx                  # Nuevo: vista principal, reemplaza ComprasPlaceholder
│   │   │   ├── ItemSugeridoCard.tsx             # Nuevo: tarjeta con badges Stock Mínimo/Caducado
│   │   │   ├── ItemManualCard.tsx               # Nuevo: tarjeta con badge Manual + menú eliminar
│   │   │   ├── AgregarItemManualForm.tsx        # Nuevo: BottomSheet, nombre+sugerencias, Stepper cantidad, nota
│   │   │   ├── RecibirItemForm.tsx              # Nuevo: BottomSheet, cantidad/lote/proveedor/vencimiento
│   │   │   ├── VincularOCrearDialog.tsx         # Nuevo: FR-012, manual sin vincular → crear material o marcar sin inventario
│   │   │   └── ComprasPlaceholder.tsx           # Eliminado
│   │   └── lib/
│   │       ├── sugeridos.ts                     # Nuevo: computeItemsSugeridos
│   │       ├── itemsManuales.ts                 # Nuevo: validar/agregar/eliminar, insumoVinculado
│   │       ├── recepcion.ts                     # Nuevo: validarRecepcion, recibirEnInsumo
│   │       └── compartir.ts                     # Nuevo: construirTextoCompartir, compartirLista
│   ├── features/insumos/components/
│   │   └── RegistroForm.tsx                     # Eliminado (spec 008's excepción temporal, ahora reemplazada)
│   ├── features/mas/components/
│   │   └── MasView.tsx                          # Modificado: quita la opción "Registrar insumo"
│   ├── app/
│   │   └── App.tsx                              # Modificado: ComprasView en vez de ComprasPlaceholder
│   ├── lib/
│   │   ├── db/index.ts                          # Extendido: ItemCompra, version(6)
│   │   └── sync/index.ts                        # Extendido: push/pull items_compra
│   └── stores/
│       └── inventoryStore.ts                    # Extendido: itemsCompra + liveQuery
└── tests/
    ├── unit/compras/sugeridos.test.ts           # Nuevo
    ├── unit/compras/itemsManuales.test.ts       # Nuevo
    ├── unit/compras/recepcion.test.ts           # Nuevo
    ├── unit/compras/compartir.test.ts           # Nuevo
    ├── unit/sync-items-compra.test.ts           # Nuevo
    ├── integration/compras.test.tsx             # Nuevo
    ├── integration/registro.test.tsx            # Eliminado (probaba RegistroForm)
    └── integration/bottom-nav.test.tsx          # Ajustado: ComprasView, sin la opción "Registrar insumo"
```

**Structure Decision**: dominio nuevo en `src/features/compras/`, dueño de la lista de compras,
siguiendo el mismo patrón por-feature que `insumos`/`alertas`. `itemsCompra` vive en el
`inventoryStore` compartido en vez de una tienda propia, replicando la decisión ya tomada para
`categorias` (spec 008) y `movimientos` (spec 004): un solo lugar de estado reactivo del catálogo.
`RegistroForm` se borra en vez de dejarse sin usar, porque su función queda cubierta por
`recepcion.ts` + `RecibirItemForm` — mantenerlo sería código muerto. `MasView` conserva
`ConsumoForm` sin cambios.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — table intentionally omitted.
