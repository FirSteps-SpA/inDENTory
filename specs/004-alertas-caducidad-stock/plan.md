# Implementation Plan: Alertas de Caducidad y Stock Mínimo

**Branch**: `004-alertas-caducidad-stock` | **Date**: 2026-09-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-alertas-caducidad-stock/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add a dedicated "Alertas" screen, reachable from the existing app-shell tabs, that consolidates
three locally-computed alert types over data already captured by feature 002: insumos below a
configurable stock mínimo, lotes within a configurable set of caducidad warning windows (default
30/7/1 days) or already expired, and lotes flagged `estado: 'revision'` by the overdraft
reconciliation. Extends `Insumo` with an optional `stockMinimo` field and adds one new global
`ConfiguracionAlertas` record (the caducidad warning day-levels) — both editable by an
administrador only. All three alert lists are pure, unit-testable calculators over data already
reactive in Dexie (Constitution I/II), so they update immediately with no network dependency
(FR-011, SC-005).

## Technical Context

**Language/Version**: TypeScript (React 19) on Node.js ≥20 (LTS) — unchanged project scaffold
(feature 001)

**Primary Dependencies**: Dexie (new `configuracionAlertas` table + `Insumo.stockMinimo` field),
Zustand (new `alertasStore`, extended `inventoryStore`), React (new `AlertasView` screen) — no new
dependency added

**Storage**: Dexie/IndexedDB gains one new table, `configuracionAlertas` (single global row: the
caducidad warning day-levels), and `insumos` gains an optional `stockMinimo` column (data-model.md
version(3)). Supabase Postgres mirrors both via a new `configuracion_alertas` table and a new
`insumos.stock_minimo` column (contracts/supabase-schema.md), synced by the existing
push/pull cycle in `src/lib/sync/index.ts`.

**Testing**: Vitest + React Testing Library (existing project setup) — unit tests for the three
pure alert-calculator modules (`stockBajo.ts`, `caducidad.ts`, `revision.ts`), mirroring feature
002's `fefo.ts`/`stock.ts` precedent

**Target Platform**: Same installable PWA target as the rest of the project (touch/mobile-first
browsers, gloved use per Principle III)

**Project Type**: Single frontend web project — no custom backend; Supabase remains the only
backend-as-a-service (consistent with feature 001's Structure Decision)

**Performance Goals**: A user can identify all active alerts within 5 seconds of opening the
screen (spec SC-001); all three alert calculations run synchronously over already-loaded
in-memory data (no additional network round trip, spec SC-005)

**Constraints**: All alert calculation MUST work fully offline (Constitution IV) and MUST
recompute immediately on any relevant local write — new movimiento, changed stock mínimo, changed
niveles de aviso, or a lote marked resuelto (spec FR-011) — via the existing Zustand +
`liveQuery` reactive pattern (Constitution II), not a polling or manual-refresh mechanism

**Scale/Scope**: 1 new screen (`AlertasView`, reachable as a third app-shell tab alongside
Registrar/Consumir), 3 pure alert-calculator modules, 1 small admin-only configuration panel
(stock mínimo per insumo + caducidad warning levels), 1 Dexie/Supabase schema extension; same
small-clinic scale as features 001-003 (tens to low hundreds of insumos/lotes, single clinic team)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Offline-First por Diseño | PASS | All three alert lists are computed from data already in IndexedDB (insumos, lotes, movimientos, configuracionAlertas) — no alert ever waits on a Supabase round trip (FR-002, FR-006, SC-005). |
| II. Estado Reactivo Local con Zustand | PASS | `inventoryStore` is extended with a `movimientos` `liveQuery` subscription (needed to derive per-insumo stock); a new `alertasStore` exposes `configuracionAlertas` the same way. Alert lists are derived (not stored) from these reactive sources, so the screen re-renders immediately on any relevant write (FR-011) — no new state layer introduced. |
| III. Interfaz Táctil para Entornos Clínicos | PASS | The "marcar como resuelto" action and the admin configuration inputs (stock mínimo, niveles de aviso) reuse the project's existing ≥48x48px `touch-target` utility class. |
| IV. Trazabilidad y Alertas de Inventario | PASS | This feature is the direct implementation of Principle IV's alerting mandate (visual, non-textual-only alerts for expiry and low stock), extending the trazabilidad already captured by feature 002's lote/movimiento model. |
| V. Búsqueda Manual Ágil como Flujo Primario | N/A (not touched) | No search or scanning UI is part of this feature; the admin config panel lists insumos directly (small catalogs, no search needed at this scale) rather than reusing the registro/consumo search flow. |
| VI. Control Multi-Usuario | PASS | Configuring thresholds and resolving revisión lotes are gated to the `administrador` role already captured by feature 003's `usuarioActual.rol`, consistent with spec 003's stated intent that role-restricted screens would be built by later features (this one). |
| Pila Tecnológica Obligatoria | PASS | Uses only the mandated stack (Dexie, Zustand, React, Tailwind, Supabase) — no new dependency added. |

Result: **PASS** — no violations to justify in Complexity Tracking.

**Post-Phase 1 re-check**: research.md's urgency-tier algorithm and data-model.md's schema
extension confirm the design stays within the reactive Dexie/Zustand pattern above; no new
dependency or structural decision changes this table. Result: **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/004-alertas-caducidad-stock/
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
│   ├── app/
│   │   └── App.tsx                     # Adds a third Vista tab ("alertas") alongside registro/consumo (FR-013)
│   ├── features/
│   │   └── alertas/
│   │       ├── components/
│   │       │   └── AlertasView.tsx     # Dedicated alerts screen: stock bajo + caducidad + revisión, admin config panel
│   │       └── lib/
│   │           ├── stockBajo.ts        # computeInsumosStockBajo (FR-002/003/004)
│   │           ├── caducidad.ts        # computeAlertasCaducidad + urgency-tier logic (FR-005/006/007/008)
│   │           ├── revision.ts         # lotesEnRevision (FR-009), marcarLoteResuelto (FR-010)
│   │           └── configuracion.ts    # actualizarStockMinimo, actualizarNivelesAviso (FR-001/005/012)
│   ├── stores/
│   │   ├── inventoryStore.ts           # Extended: adds `movimientos` liveQuery subscription
│   │   └── alertasStore.ts             # New: Zustand + liveQuery over `configuracionAlertas`
│   └── lib/
│       ├── db/
│       │   └── index.ts                # version(3): Insumo.stockMinimo field + new configuracionAlertas table
│       └── sync/
│           └── index.ts                # Extended: push/pull insumos.stock_minimo + configuracion_alertas
└── tests/
    └── unit/
        └── alertas/                     # stockBajo/caducidad/revision/configuracion unit tests
```

**Structure Decision**: Extends the existing single-frontend structure from feature 001 — no new
top-level directories. Alert-specific UI/logic live in `src/features/alertas/` (a new sibling of
`src/features/insumos/` and `src/features/auth/`, following the same `components/` + `lib/`
split), reactive state in `src/stores/alertasStore.ts` alongside the existing stores (with
`inventoryStore.ts` extended rather than duplicated, since alerts need the same
insumos/lotes/movimientos data feature 002 already loads), and the schema extension is two small
additions to the existing `src/lib/db/index.ts` and `src/lib/sync/index.ts` files rather than new
modules. No `backend/` is introduced: the new `configuracion_alertas` table and the
`insumos.stock_minimo` column live in Supabase Postgres, documented as an external contract in
`contracts/supabase-schema.md`, matching the pattern features 002/003 already established.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — table intentionally omitted.
