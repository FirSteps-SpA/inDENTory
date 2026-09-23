# Implementation Plan: Formulario Unificado para Creación de Nuevo Material

**Branch**: `008-formulario-alta-material` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-formulario-alta-material/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Reemplaza el alta de insumos embebida en la búsqueda de "Registrar" (`CrearInsumoForm`) por una
vista de pantalla completa **"Nuevo Material"**, que se abre con `+ Material` desde el Inventario
y con "Crear insumo nuevo" desde Registrar. En un solo formulario captura nombre (con sugerencias
de materiales existentes), categoría de una lista desplegable, unidad (Caja, Frasco, Pieza,
Cartucho, mL, g), código de barras con escaneo bajo demanda, stock mínimo, "Sujeto a caducidad"
y, si el stock inicial es mayor que 0, el primer lote. Material, lote e ingreso se guardan en
**una transacción Dexie** ("Guardar e Ingresar").

Las categorías precargadas (Cirugía, Restauración, Tratamientos pulpares, Fresas) y "Sin
categoría" son constantes del cliente. Las categorías que crean los administradores se guardan
en una tabla nueva `categorias`, sincronizada con RLS solo-administrador. `Insumo.categoria`
sigue siendo un nombre, que se deduplica por una clave sin mayúsculas ni tildes. El borrador se
guarda en una tabla Dexie local. Los "posibles duplicados" se derivan en memoria.

## Technical Context

**Language/Version**: TypeScript (React 19) on Node.js ≥20 (LTS) — scaffold sin cambios

**Primary Dependencies**: Ninguna nueva. React, Tailwind CSS v4, Zustand, Dexie, Supabase JS,
componentes de la spec 005 (`Card`, `Badge`, `TouchButton`, `IconField`) y `BottomSheet` de la 007.
Escaneo con el `useBarcodeScanner` existente.

**Storage**: Dexie `version(5)`: tabla `categorias` (sincronizada), tabla `borradores` (solo
local), `Insumo.creadoPor`. Supabase: columna `insumos.creado_por` y tabla `categorias` con RLS
de inserción solo-administrador ([contracts/supabase-schema.md](./contracts/supabase-schema.md)).
`Lote`, `Movimiento` y `CambioInsumo` sin cambios.

**Testing**: Vitest + React Testing Library + `fake-indexeddb`. Unitarias: `claveCategoria`,
`catalogoCategorias`/`categoriasEnUso` (precedencia, dedupe, "Sin categoría" al final,
rechazadas excluidas), `validarAltaMaterial` (todas las reglas + advertencia de caducado, hoy ≠
caducado), atomicidad de `darDeAltaMaterial` (fallo simulado del ingreso → nada escrito), guard de
rol de categoría nueva, `sugerirMateriales`, `posiblesDuplicados`, `useBorradorAlta` (timers
falsos, restauración, borrado en logout), `pushCategorias` (rechazo fila por fila → insumos a
"Sin categoría"). Integración `alta-material.test.tsx`: flujos de US1 a US4 y apertura desde
Registrar. Las pruebas existentes de `registro.test.tsx` (usaban `CrearInsumoForm`),
`acciones-rapidas` e `inventario` se ajustan donde dependan del alta embebida o de
`categoriasDisponibles`.

**Target Platform**: PWA instalable en navegadores táctiles/móviles, uso con guantes (Principio III).

**Project Type**: Frontend PWA + esquema Supabase (sin backend propio)

**Performance Goals**: el material creado aparece en el listado en < 100 ms percibidos
(transacción Dexie + `liveQuery`). Sugerencias recalculadas por tecla sobre ≤300 insumos sin lag
perceptible. SC-001 < 60 s y SC-002 < 30 s (flujo humano).

**Constraints**: atomicidad material + lote + ingreso (FR-016); cámara solo por acción explícita
(FR-003/FR-020); controles ≥48×48px (FR-025); offline-first (FR-021); crear categorías solo
administradores (FR-011) y reforzado por RLS; sin librerías nuevas; `movements.ts` sigue siendo
la única vía de escritura de movimientos.

**Scale/Scope**: ≈20–300 insumos y < 30 categorías por clínica. Superficie: 1 vista nueva
(`AltaMaterialView`), 2 componentes nuevos (`Stepper`, `ConfirmarLoteCaducadoDialog`), 3 módulos
de dominio nuevos (`categorias`, `alta`, `useBorradorAlta`), y extensiones en `InventarioView`,
`InsumoCard`, `SearchPicker`, `RegistroForm`, `ScanButton`, `EditarInsumoForm`, `catalogo`,
`inventoryStore`, `avisosStore`, `authStore`, Dexie y sync.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Offline-First por Diseño | PASS | El alta (material, categoría, lote e ingreso) escribe primero en Dexie en una transacción y se sincroniza en segundo plano. Conflictos deterministas: categorías duplicadas se funden por clave; nombres duplicados se conservan y se señalan (FR-026); categoría rechazada queda marcada, no borrada, y sus materiales pasan a "Sin categoría". |
| II. Estado Reactivo Local con Zustand | PASS | `inventoryStore` suma la suscripción a `categorias` (extendida, no duplicada). El formulario es estado local de la vista; el borrador persiste en IndexedDB, sin capa de estado nueva. Avisos por `avisosStore` existente. |
| III. Interfaz Táctil | PASS | Unidades como grilla de botones, `Stepper` con +/− grandes, `role="switch"` en un área de 48px, botón principal fijo; todo sobre `TouchButton`/`touch-target`. Sin gestos. |
| IV. Trazabilidad y Alertas | PASS | El stock inicial siempre entra como lote (número, proveedor, vencimiento) + movimiento de ingreso con autor. Un lote ya caducado se permite solo con confirmación y aparece en Alertas. El stock mínimo se captura en el alta. |
| V. Búsqueda Manual Ágil | PASS | El formulario abre con el foco en el nombre. `ScanButton` solo actúa al tocarlo (FR-020). La búsqueda de Registrar sigue siendo el punto de entrada, y el alta solo se abre al no encontrar el insumo. |
| VI. Control Multi-Usuario | PASS | `Insumo.creadoPor`, `Categoria.creadoPor` e ingreso con `usuarioId`, capturados sin conexión. Categorías restringidas a administrador en la UI, en el dominio y por RLS. |
| Pila Tecnológica Obligatoria | PASS | Sin dependencias nuevas. |

Result: **PASS**.

**Post-Phase 1 re-check**: el diseño deja `insumos` sin RLS (el alta está abierta a todo el
personal por decisión de la spec, igual que hoy). El rechazo de una categoría reescribe
`Insumo.categoria` directamente, sin pasar por el ledger `CambioInsumo` (research.md R4), porque
el autor ya no es administrador y el ledger lo rechazaría. Es la misma vía de escritura que ya usa
el alta de la 002, no un bypass nuevo, y se declara en el PR. Resultado: **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/008-formulario-alta-material/
├── plan.md              # This file
├── research.md          # Phase 0: R1–R11
├── data-model.md        # Phase 1: Categoria, Borrador, Insumo.creadoPor, Dexie v5
├── quickstart.md        # Phase 1: validación de punta a punta
├── contracts/
│   ├── ui-contracts.md      # AltaMaterialView, Stepper, dominio de categorías/alta
│   └── supabase-schema.md   # categorias + RLS, insumos.creado_por, orden de sync
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
inDENTory/
├── src/
│   ├── components/ui/
│   │   └── Stepper.tsx                          # Nuevo: control numérico −/+ táctil
│   ├── features/insumos/
│   │   ├── components/
│   │   │   ├── AltaMaterialView.tsx             # Nuevo: vista "Nuevo Material" de pantalla completa
│   │   │   ├── ConfirmarLoteCaducadoDialog.tsx  # Nuevo: confirmación de lote ya caducado
│   │   │   ├── InventarioView.tsx               # Modificado: "+ Material", overlay 'alta', chips por categoriasEnUso, duplicados
│   │   │   ├── InsumoCard.tsx                   # Modificado: badge "Posible duplicado"
│   │   │   ├── SearchPicker.tsx                 # Modificado: abre AltaMaterialView; se elimina CrearInsumoForm
│   │   │   ├── RegistroForm.tsx                 # Modificado: maneja conLoteInicial
│   │   │   ├── ScanButton.tsx                   # Extendido: prop opcional onCodigo
│   │   │   └── EditarInsumoForm.tsx             # Modificado: catálogo de categorías + unidades ampliadas
│   │   └── lib/
│   │       ├── categorias.ts                    # Nuevo: constantes, claveCategoria, catalogoCategorias, categoriasEnUso
│   │       ├── alta.ts                          # Nuevo: validarAltaMaterial, darDeAltaMaterial, sugerirMateriales, posiblesDuplicados
│   │       ├── useBorradorAlta.ts               # Nuevo: borrador persistente con debounce
│   │       └── catalogo.ts                      # Extendido: UNIDADES_MEDIDA + etiquetas, helpers de validación compartidos
│   ├── lib/
│   │   ├── db/index.ts                          # Extendido: Categoria, Borrador, Insumo.creadoPor, version(5)
│   │   └── sync/index.ts                        # Extendido: push/pull categorias, rechazo, creado_por
│   └── stores/
│       ├── inventoryStore.ts                    # Extendido: categorias; searchInsumosPorCategoria por clave
│       ├── avisosStore.ts                       # Extendido: tipos material-creado, categoria-rechazada
│       └── authStore.ts                         # Extendido: logout borra borradores
└── tests/
    ├── unit/insumos/categorias.test.ts          # Nuevo
    ├── unit/insumos/alta.test.ts                # Nuevo
    ├── unit/insumos/useBorradorAlta.test.tsx    # Nuevo
    ├── unit/sync-categorias.test.ts             # Nuevo
    ├── integration/alta-material.test.tsx       # Nuevo
    └── integration/registro.test.tsx            # Ajustado: alta desde la búsqueda usa AltaMaterialView
```

**Structure Decision**: todo el dominio nuevo vive en `src/features/insumos/`, que es dueño del
catálogo, igual que en las specs 006 y 007. Solo `Stepper` va a `components/ui`, porque la 009
(recepción de compras) lo reutilizará. No se crean features nuevas. `MasView` no cambia: sigue
alojando `RegistroForm` hasta la 009.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — table intentionally omitted.
