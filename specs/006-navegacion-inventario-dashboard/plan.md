# Implementation Plan: Rediseño de Navegación e Vista Principal de Insumos (Dashboard & Listado)

**Branch**: `006-navegacion-inventario-dashboard` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-navegacion-inventario-dashboard/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Reemplaza la navegación inferior actual (Registrar/Consumir/Alertas) por una de 4 secciones
(Inventario/Compras/Alertas/Más), y convierte "Inventario" en la pantalla principal por defecto:
un listado unificado de insumos con un resumen de alertas superior (reutilizando sin cambios los
cálculos ya existentes de `computeInsumosStockBajo`/`computeAlertasCaducidad`), búsqueda por
nombre, filtros combinables por categoría/estado, y una vista de detalle de solo lectura por
insumo (lotes, vencimientos, stock total). "Compras" y "Más" existen como destinos navegables con
contenido mínimo: "Compras" es un placeholder (su funcionalidad llega en la spec 009); "Más" aloja
temporalmente los flujos ya existentes de `RegistroForm`/`ConsumoForm` — que pierden su pestaña
dedicada pero no se eliminan — hasta que las specs 007/008/009 los reemplacen por sus flujos
definitivos (acciones rápidas, alta de material, recepción de compras). Sin cambios de esquema de
datos ni de lógica de alertas; es una reestructuración de navegación y una nueva superficie de
consulta sobre datos ya persistidos.

## Technical Context

**Language/Version**: TypeScript (React 19) on Node.js ≥20 (LTS) — unchanged project scaffold

**Primary Dependencies**: Ninguna dependencia nueva. Reutiliza el stack existente (React, Tailwind
CSS v4, Zustand, Dexie) y el sistema de componentes/íconos de la spec 005 (`Card`, `Badge`,
`TouchButton`, `IconField`, el set de íconos hechos a mano en `src/components/icons/`), que se
extiende con 3-4 íconos nuevos (carrito de compras, ajustes, chevron, cerrar) en el mismo estilo
stroke-based — no se introduce una librería de íconos.

**Storage**: N/A — no se agrega tabla, columna ni entidad nueva a Dexie. El estado de salud por
insumo (Ok/Bajo Stock/Caducado/Próximo a caducar) y el "lote más próximo a vencer" mostrados en
cada tarjeta son valores derivados en el momento de la consulta a partir de `Insumo`/`Lote`/
`Movimiento` ya persistidos (mismo patrón que las specs 004 y 005); nada nuevo se escribe.

**Testing**: Vitest + React Testing Library (setup existente). Se agregan pruebas unitarias para
las nuevas funciones puras de derivación (estado agregado por insumo, lote más próximo a vencer,
filtro combinado por estado) y pruebas de integración para la nueva vista de Inventario (buscar +
filtrar + abrir detalle + volver conservando filtros) y para el nuevo `BottomNav` de 4 pestañas.
Las pruebas existentes de `RegistroForm`/`ConsumoForm`/`AlertasView` no deben requerir cambios,
ya que esos componentes no se modifican, solo cambia desde dónde se montan en `App.tsx`.

**Target Platform**: Mismo objetivo PWA instalable (navegadores táctiles/móviles, uso con guantes,
Principio III)

**Project Type**: Frontend único — sin cambios de backend; Supabase no se toca

**Performance Goals**: Con un catálogo típico de hasta ~300 insumos (spec Clarifications), el
listado, la búsqueda y los filtros combinados responden en menos de 1 segundo percibido (SC-004)
usando filtrado simple en memoria sobre el snapshot reactivo ya mantenido por `inventoryStore`
— sin paginación ni virtualización, que a esa escala no aportarían beneficio medible y sumarían
complejidad no solicitada por la spec.

**Constraints**: Todo elemento interactivo nuevo (ítems de nav, chips, badges, tarjetas) DEBE
cumplir ≥48x48px (Constitution III, FR-014); la búsqueda solo indexa el nombre comercial del
insumo (spec Clarifications, FR-005); el indicador de estado nunca es solo color — siempre
color + ícono + etiqueta de texto corta (spec Clarifications, FR-009); el botón de escaneo sigue
sin activarse automáticamente (Constitution V); todo debe funcionar sin conexión, leyendo desde
Dexie (Constitution I, FR-013); ningún flujo hoy disponible (registrar ingreso, consumir con
cantidad personalizada) puede desaparecer de la app mientras las specs 007-009 no aterricen sus
reemplazos — de ahí la decisión de "puente" documentada en research.md.

**Scale/Scope**: 1 pantalla nueva compuesta (`InventarioView` + 4 subcomponentes: resumen, filtros,
tarjeta de insumo, detalle), extensión de `BottomNav`/`App.tsx` a 4 secciones, 1 pantalla stub
(`ComprasPlaceholder`) y 1 pantalla puente (`MasView`, envuelve `RegistroForm`/`ConsumoForm` sin
modificarlos), 2 módulos nuevos de funciones puras (`estado.ts`, `proximoLote.ts`) más una función
de filtro por estado agregada a `inventoryStore.ts` junto a sus pares existentes — ninguna pantalla,
store ni tabla de las specs 002-005 se modifica en su lógica interna.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Offline-First por Diseño | PASS | El resumen, la búsqueda, los filtros y el detalle leen exclusivamente del snapshot reactivo de `inventoryStore`/`alertasStore` (Dexie vía `liveQuery`), igual que `AlertasView` hoy — ninguna llamada de red nueva. |
| II. Estado Reactivo Local con Zustand | PASS | No se introduce una store nueva. Los datos de inventario siguen viviendo en `inventoryStore`/`alertasStore`; el texto de búsqueda, los filtros activos y el insumo seleccionado para detalle son estado transitorio de UI en el componente `InventarioView`, exactamente el mismo patrón que `SearchPicker` ya usa hoy con `texto`/`categoria` locales. |
| III. Interfaz Táctil para Entornos Clínicos | PASS | Toda tarjeta, chip, badge e ítem de navegación nuevo se construye sobre `Card`/`TouchButton`/el utility `touch-target` ya existentes (FR-014). |
| IV. Trazabilidad y Alertas de Inventario | PASS | El resumen superior reutiliza sin modificar `computeInsumosStockBajo` y `computeAlertasCaducidad` (spec 004); no se redefine ninguna regla de alerta, solo se agregan sus resultados por insumo para el badge de estado de la tarjeta. |
| V. Búsqueda Manual Ágil como Flujo Primario | PASS | La búsqueda por texto sigue siendo inmediata y sin pasos previos; `ScanButton` se reutiliza sin cambios como canal alternativo, activado solo bajo acción explícita (FR-006). |
| VI. Control Multi-Usuario | N/A (no tocado) | Esta spec no introduce diferenciación de permisos; el detalle de insumo es de solo lectura para cualquier usuario autenticado, igual que el listado que reemplaza. |
| Pila Tecnológica Obligatoria | PASS | Sin sustituciones ni dependencias nuevas; los íconos nuevos siguen el mismo patrón hand-authored de la spec 005. |

Result: **PASS** — no hay violaciones que justificar en Complexity Tracking.

**Post-Phase 1 re-check**: Las decisiones de research.md (puente temporal para Registrar/Consumir,
reutilización de `selectFefoLot` para el lote más próximo a vencer, filtrado en memoria sin
virtualización) y la confirmación de data-model.md de que no se agregan entidades no cambian
ninguna fila de la tabla anterior. Resultado: **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/006-navegacion-inventario-dashboard/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
inDENTory/
├── src/
│   ├── components/
│   │   └── icons/
│   │       └── index.tsx                       # Extendido: ShoppingCart, Settings, ChevronRight, X (mismo estilo stroke 1.75px)
│   ├── app/
│   │   ├── App.tsx                             # Actualizado: `Vista` pasa a 4 valores, default 'inventario', monta InventarioView/ComprasPlaceholder/AlertasView/MasView
│   │   └── BottomNav.tsx                       # Actualizado: 4 tabs (Inventario/Compras/Alertas/Más) con sus nuevos íconos
│   ├── features/
│   │   ├── insumos/
│   │   │   ├── components/
│   │   │   │   ├── InventarioView.tsx          # Nuevo: pantalla principal — compone resumen + filtros + listado + detalle
│   │   │   │   ├── ResumenAlertasBanner.tsx    # Nuevo: contadores caducidad/stock bajo, clic aplica filtro (FR-003/FR-004)
│   │   │   │   ├── InsumoFiltros.tsx           # Nuevo: input de búsqueda + ScanButton + chips de categoría + badges de estado (FR-005..FR-008)
│   │   │   │   ├── InsumoCard.tsx              # Nuevo: tarjeta de listado, solo lectura, abre detalle al tocar (FR-009/FR-010)
│   │   │   │   ├── InsumoDetalle.tsx           # Nuevo: vista de detalle de solo lectura (lotes, vencimientos, stock total) (FR-010/FR-011)
│   │   │   │   ├── RegistroForm.tsx            # Sin cambios — se reutiliza tal cual desde MasView
│   │   │   │   ├── ConsumoForm.tsx             # Sin cambios — se reutiliza tal cual desde MasView
│   │   │   │   ├── SearchPicker.tsx            # Sin cambios
│   │   │   │   └── ScanButton.tsx              # Sin cambios — reutilizado dentro de InsumoFiltros
│   │   │   └── lib/
│   │   │       ├── estado.ts                   # Nuevo: computeEstadoInsumo() — agrega stockBajo/caducidad en un estado único con regla de prioridad
│   │   │       ├── proximoLote.ts              # Nuevo: loteMasProximoAVencer() — reutiliza el orden ya probado de selectFefoLot (fefo.ts)
│   │   │       ├── fefo.ts                     # Sin cambios
│   │   │       ├── movements.ts                # Sin cambios
│   │   │       ├── quantity.ts                 # Sin cambios
│   │   │       └── stock.ts                    # Sin cambios
│   │   ├── compras/
│   │   │   └── components/
│   │   │       └── ComprasPlaceholder.tsx      # Nuevo: stub navegable (FR-015) — contenido real en spec 009
│   │   ├── mas/
│   │   │   └── components/
│   │   │       └── MasView.tsx                 # Nuevo: puente temporal — lista "Registrar insumo" / "Consumir insumo", abre RegistroForm/ConsumoForm sin modificarlos
│   │   └── alertas/components/
│   │       └── AlertasView.tsx                 # Sin cambios — sigue siendo la pantalla "Alertas" de la nueva nav
│   └── stores/
│       └── inventoryStore.ts                   # Extendido: se agrega `searchInsumosPorEstado`, junto a sus pares `searchInsumosPorTexto`/`searchInsumosPorCategoria` ya existentes
└── tests/
    ├── unit/insumos/estado.test.ts             # Nuevo
    ├── unit/insumos/proximoLote.test.ts        # Nuevo
    ├── unit/App.test.tsx                       # Actualizado si el texto/rol por defecto cambia
    └── integration/inventario.test.tsx         # Nuevo — búsqueda + filtros + detalle + navegación de 4 pestañas
```

**Structure Decision**: Extiende la estructura de features existente. El listado/detalle de
inventario se agrega dentro de `src/features/insumos/` (ya dueño del dominio insumo/lote), no como
un feature nuevo, porque reutiliza directamente sus tipos y helpers (`fefo.ts`, `stock.ts`). Se
crean dos carpetas de feature pequeñas y explícitamente temporales/mínimas: `src/features/compras/`
(un solo archivo placeholder, contenido real en spec 009) y `src/features/mas/` (un solo archivo
puente, reemplazado por la spec 010's pantalla de ajustes). Ningún archivo de las specs 002-005 se
modifica en su lógica; `RegistroForm.tsx`/`ConsumoForm.tsx`/`AlertasView.tsx` solo cambian de
punto de montaje en `App.tsx`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — table intentionally omitted.
