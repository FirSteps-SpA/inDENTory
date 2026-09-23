# Implementation Plan: Acciones Rápidas — Consumo Directo (Shortcut) y Edición/Eliminación

**Branch**: `feature/007-acciones-rapidas-consumo-edicion` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-acciones-rapidas-consumo-edicion/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Convierte la tarjeta de insumo de la spec 006 (hoy de solo lectura) en una superficie de acción:
un botón **"Consumir 1"** que registra con un toque un `consumo` de 1 unidad desde el lote
**vigente** que vence antes (nunca uno caducado), con vibración leve y un aviso de 8 s con
**Deshacer** (un `ajuste` +1 vinculado por `movimientoOrigenId` — sin tocar el esquema de
`Movimiento`); y un menú **"⋮" / toque largo** con "Ver detalle", "Consumir otra cantidad"
(reutiliza `ConsumoForm` con el insumo preseleccionado) y, solo para administradores, **Editar**
y **Eliminar** (baja lógica). Para cumplir la resolución de ediciones concurrentes campo por campo
(Clarification Q3) se introduce un ledger de solo-apéndice `CambioInsumo`, del que la fila
`Insumo` pasa a ser una proyección determinista; la baja prevalece sobre ediciones. Los insumos
dados de baja se filtran en un único punto (`inventoryStore`), de modo que desaparecen de todas
las vistas existentes sin modificarlas.

## Technical Context

**Language/Version**: TypeScript (React 19) on Node.js ≥20 (LTS) — scaffold sin cambios

**Primary Dependencies**: Ninguna nueva. React, Tailwind CSS v4, Zustand, Dexie, Supabase JS y
el sistema de componentes de la spec 005 (`Card`, `Badge`, `TouchButton`, `IconField`, íconos
hand-authored). Se agregan al set de íconos: `MoreVertical` (⋮), `Undo`, `Pencil`, `Trash`, en
el mismo estilo stroke. Vibración vía Vibration API nativa (sin librería).

**Storage**: Dexie `version(4)`: `Insumo` + `dadoDeBajaEn`/`dadoDeBajaPor`; tabla nueva
`cambiosInsumo` (solo-apéndice). Supabase: 2 columnas en `insumos` + tabla `cambios_insumo` con
RLS de inserción solo-administrador ([contracts/supabase-schema.md](./contracts/supabase-schema.md)).
`Lote` y `Movimiento` sin cambios.

**Testing**: Vitest + React Testing Library + `fake-indexeddb` (setup existente). Unitarias:
`selectLoteConsumoRapido`, `proyectarInsumo` (LWW por campo, desempate, baja prevalece),
`validarEdicionInsumo`, idempotencia de `deshacerConsumo`, cola/expiración de `avisosStore`
(timers falsos), `useLongPress`. Integración: flujo Consumir 1 → aviso → Deshacer en
`InventarioView`; menú por rol; editar; baja + desaparición en Alertas/formularios; sync con
ledger de cambios (dos dispositivos simulados). Las pruebas existentes de `ConsumoForm`,
`inventario`, `bottom-nav` y alertas deben seguir pasando (la tarjeta cambia de estructura: se
ajustan selectores de `inventario.test.tsx` si dependían de que la tarjeta fuera un botón).

**Target Platform**: PWA instalable en navegadores táctiles/móviles, uso con guantes
(Principio III). Vibración disponible en Android/Chrome; no-op en Safari iOS.

**Project Type**: Frontend PWA + esquema Supabase (sin código de backend propio)

**Performance Goals**: "Consumir 1" refleja el nuevo stock en la tarjeta en < 100 ms percibidos
(escritura Dexie + `liveQuery`), cumpliendo SC-001 (< 2 s). Cálculo de disponibilidad por tarjeta
en memoria sobre ≤300 insumos sin degradar el < 1 s de filtros de la spec 006 (SC-004 de 006).

**Constraints**: Nunca descontar de lotes caducados en el atajo (FR-002); aviso de 8 s (Q2); sin
swipe (FR-007, Q4); baja no genera movimientos (Q5); todo offline-first (FR-021); controles
≥48x48px (FR-022); cámara solo bajo acción explícita (FR-023); `movements.ts` sigue sin
update/delete; sin librerías nuevas.

**Scale/Scope**: ≈20–300 insumos por clínica (spec 006), pocos administradores, ediciones raras.
Superficie: 1 tarjeta rediseñada, 5 componentes nuevos (`BottomSheet`, `InsumoAccionesMenu`,
`EditarInsumoForm`, `ConfirmarBajaDialog`, `AvisosConsumo`), 1 store nueva (`avisosStore`),
4 módulos de dominio nuevos (`consumoRapido`, `catalogo`, `proyeccion`, `useLongPress`) +
`src/lib/haptics.ts`, extensión de `ConsumoForm` (props opcionales), `inventoryStore`, Dexie y
sync.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Offline-First por Diseño | PASS | Consumo, deshacer, edición y baja escriben primero en Dexie (`crearMovimiento`, transacción `insumos`+`cambiosInsumo`) y se sincronizan en segundo plano. Conflictos de edición: resolución determinista (LWW por campo con desempate total por `(creadoEn, id)`) y auditable (ledger conserva los valores sobrescritos) — cumple literalmente "nunca pérdida silenciosa". |
| II. Estado Reactivo Local con Zustand | PASS | Los avisos viven en una store Zustand nueva (`avisosStore`) porque deben sobrevivir a la navegación; el catálogo sigue en `inventoryStore` (extendido, no duplicado). Overlays y filtros son estado de UI local de `InventarioView`, igual que en la 006. Sin Context/Redux/librería de toasts. |
| III. Interfaz Táctil para Entornos Clínicos | PASS | "Consumir 1", "⋮", opciones de menú, "Deshacer" y controles de formulario/diálogo sobre `TouchButton`/`touch-target` (≥48x48px). El toque largo es vía adicional, nunca única (el "⋮" siempre existe); se excluye swipe (Q4). Stock mínimo con botones `−`/`+` grandes. |
| IV. Trazabilidad y Alertas de Inventario | PASS | Consumo rápido = movimiento `consumo` normal con lote y autor; deshacer = `ajuste` compensatorio vinculado, sin borrar nada; baja conserva lotes y movimientos. Alertas siguen calculándose localmente con las mismas funciones; los insumos dados de baja se excluyen por el filtro central. "Caducado" en el atajo usa la misma regla que `computeAlertasCaducidad`. |
| V. Búsqueda Manual Ágil como Flujo Primario | PASS | El listado/búsqueda de la 006 no cambia. `EditarInsumoForm` y `ConsumoForm` con `insumoInicial` no activan la cámara; `ScanButton` solo por acción explícita (FR-023). |
| VI. Control Multi-Usuario | PASS | Todo movimiento y `CambioInsumo` captura `usuarioId` localmente y se sincroniza con él. Editar/eliminar restringido a `administrador` en UI + dominio (cliente) y por RLS en `cambios_insumo` (servidor). |
| Pila Tecnológica Obligatoria | PASS | Sin dependencias nuevas ni sustituciones. |

Result: **PASS** — sin violaciones que justificar.

**Post-Phase 1 re-check**: El diseño agregó dos piezas con impacto constitucional — el ledger
`CambioInsumo` + proyección (research.md R9) y la store `avisosStore` (R3). La primera **refuerza**
el Principio I (hoy `pushInsumos` resuelve por fila completa y puede pisar cambios remotos en
silencio) y el IV (auditoría de cambios de catálogo). La segunda es exactamente el uso previsto
de Zustand por el Principio II. La RLS se limita a la tabla nueva, dejando `insumos` sin RLS como
deuda heredada de la spec 002 (anotada para la 010) — no es una excepción introducida aquí.
Resultado: **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/007-acciones-rapidas-consumo-edicion/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── ui-contracts.md      # Props/comportamiento de componentes + funciones de dominio
│   └── supabase-schema.md   # Columnas de baja, tabla cambios_insumo, RLS, orden de sync
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
inDENTory/
├── src/
│   ├── app/
│   │   ├── App.tsx                             # Actualizado: monta <AvisosConsumo /> una vez, fuera de las vistas
│   │   └── AvisosConsumo.tsx                   # Nuevo: pila de avisos (máx. 3, 8 s) con "Deshacer", aria-live
│   ├── components/
│   │   ├── icons/index.tsx                     # Extendido: MoreVertical, Undo, Pencil, Trash
│   │   └── ui/
│   │       └── BottomSheet.tsx                 # Nuevo: panel inferior modal genérico (menú, formularios, confirmación)
│   ├── features/insumos/
│   │   ├── components/
│   │   │   ├── InsumoCard.tsx                  # Modificado: Card contenedor + área principal / "Consumir 1" / "⋮"; toque largo
│   │   │   ├── InventarioView.tsx              # Modificado: disponibilidad por tarjeta, estado `overlay`, cierre si el insumo se da de baja
│   │   │   ├── InsumoAccionesMenu.tsx          # Nuevo: opciones filtradas por rol
│   │   │   ├── EditarInsumoForm.tsx            # Nuevo: formulario de edición precargado + validación
│   │   │   ├── ConfirmarBajaDialog.tsx         # Nuevo: confirmación con advertencia de stock restante
│   │   │   └── ConsumoForm.tsx                 # Extendido: props opcionales `insumoInicial`, `onDone` (retrocompatible)
│   │   └── lib/
│   │       ├── consumoRapido.ts                # Nuevo: selectLoteConsumoRapido, consumirUno, deshacerConsumo
│   │       ├── catalogo.ts                     # Nuevo: validarEdicionInsumo, editarInsumo, darDeBajaInsumo (guard de rol)
│   │       ├── proyeccion.ts                   # Nuevo: proyectarInsumo (pura), reproyectarInsumos (Dexie)
│   │       ├── useLongPress.ts                 # Nuevo: hook de toque largo con tolerancia de movimiento
│   │       └── fefo.ts                         # Extendido: exporta el comparador FEFO para reutilizarlo
│   ├── lib/
│   │   ├── db/index.ts                         # Extendido: Insumo.dadoDeBaja*, CambioInsumo, version(4) + upgrade
│   │   ├── haptics.ts                          # Nuevo: vibrarLeve() tolerante a falta de soporte
│   │   └── sync/index.ts                       # Extendido: push/pull cambios_insumo, reproyección, mapeo de columnas de baja
│   └── stores/
│       ├── avisosStore.ts                      # Nuevo: cola de avisos de consumo rápido
│       └── inventoryStore.ts                   # Extendido: `insumos` solo activos; suscripción a `cambiosInsumo`
└── tests/
    ├── unit/insumos/consumoRapido.test.ts      # Nuevo
    ├── unit/insumos/proyeccion.test.ts         # Nuevo
    ├── unit/insumos/catalogo.test.ts           # Nuevo (validación + guard de rol + transacción)
    ├── unit/insumos/useLongPress.test.tsx      # Nuevo
    ├── unit/avisosStore.test.ts                # Nuevo
    ├── unit/sync-cambios-insumo.test.ts        # Nuevo: convergencia de dos dispositivos, baja prevalece
    ├── integration/acciones-rapidas.test.tsx   # Nuevo: consumir 1 / deshacer / menú por rol / editar / baja
    └── integration/inventario.test.tsx         # Ajustado: selectores de la tarjeta rediseñada
```

**Structure Decision**: Todo el dominio nuevo vive en `src/features/insumos/` (dueño de
insumo/lote/movimiento), igual que en la spec 006. Solo se agregan fuera de ella las piezas
genuinamente transversales: `BottomSheet` (primitivo de UI reutilizable por 008-010),
`avisosStore` + `AvisosConsumo` (deben existir por encima de las vistas) y `haptics.ts`. No se
crean features nuevas. `MasView`, `RegistroForm`, `AlertasView` y las funciones de alertas no se
modifican: el filtro de activos en `inventoryStore` les llega sin cambios de código.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — table intentionally omitted.
