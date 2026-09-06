# Implementation Plan: Registro y Consumo de Insumos con Búsqueda Manual y Escaneo Opcional

**Branch**: `002-registro-consumo-insumos` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-registro-consumo-insumos/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Build the first domain feature on top of the `001-project-setup-local-dev` scaffold: manual-search-first
forms to register incoming supply batches (lotes) and record consumption, with FEFO auto-selection,
an append-only movement ledger, decimal-aware quantity validation, and an explicit opt-in
barcode/DataMatrix scan as a secondary selection channel. All writes go to IndexedDB (Dexie)
first and sync to Supabase in the background; a conflict from concurrent offline consumption is
never silently dropped — it's preserved and the affected lot is flagged for review.

## Technical Context

**Language/Version**: TypeScript (React 18+) on Node.js ≥20 (LTS) — unchanged from
`001-project-setup-local-dev`

**Primary Dependencies**: Existing stack (Vite, React, Tailwind, Zustand, Dexie,
`@supabase/supabase-js`) plus `@zxing/browser` (new — barcode/DataMatrix camera scanning,
deferred by feature 001's research.md to this feature)

**Storage**: IndexedDB (Dexie) as the primary write target for `insumos`, `lotes`, and
`movimientos` (append-only), synced in the background to matching Supabase Postgres tables (see
`contracts/supabase-schema.md`)

**Testing**: Vitest + React Testing Library (existing) — this feature adds unit tests for the
FEFO lot-selection algorithm, quantity validation (decimal vs. integer by unit), over-consumption
rejection, and the overdraft-flagging reconciliation logic, since these are pure domain logic
testable without a real Supabase project

**Target Platform**: Same installable PWA; registration/consumption forms are the first
touch-first (≥48x48px) screens built, primarily used on mobile/tablet in the clinic

**Project Type**: Single frontend project (unchanged) — populates the `src/features/` placeholder
left empty by feature 001

**Performance Goals**: Registro completable in <30s (spec SC-001); consumo completable in <10s
(spec SC-002), both via manual search only

**Constraints**: Camera never auto-activates (FR-009); movements are append-only, never
edited/deleted (FR-015); FEFO is the default lot deduction with manual override (FR-006);
quantity format (integer vs. decimal) is validated per the insumo's unit of measure (FR-016); an
overdrawn lot from concurrent offline sync is flagged, never silently rejected or reverted
(FR-014)

**Scale/Scope**: Single clinic team; a catalog on the order of tens to a few hundred insumos and a
growing, append-only movement history — not a high-throughput or multi-tenant concern

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This is the first feature to implement domain behavior directly — most principles that feature
001 deferred are now exercised for real.

| Principle | Status | Notes |
|---|---|---|
| I. Offline-First por Diseño | PASS | Registro/consumo write to Dexie first (FR-012); Supabase sync is background and non-blocking; concurrent-offline overdraft is preserved and flagged, never silently dropped (FR-014) — matches the principle's explicit "nunca mediante pérdida silenciosa de datos". |
| II. Estado Reactivo Local con Zustand | PASS | A new `useInventoryStore` (Zustand) exposes the reactive catalog/lote cache backing search and forms; no additional state library is introduced. |
| III. Interfaz Táctil para Entornos Clínicos | PASS | Registration/consumption/scan-trigger controls are the first real screens built under the ≥48x48px convention established in feature 001's Tailwind setup. |
| IV. Trazabilidad y Alertas de Inventario | PASS (alerts deferred) | Batch/lote data (número de lote, fecha de caducidad, proveedor-less for now) and the append-only movement ledger directly implement this principle's traceability half. Visual expiry/stock-mínimo *alerts* are explicitly out of scope per spec Assumptions — a future feature builds the alert UI on top of this data; that phased delivery does not violate the principle since the underlying data it needs already exists after this feature. |
| V. Búsqueda Manual Ágil como Flujo Primario | PASS | This feature *is* the principle: manual search is FR-001/FR-004's immediate default; scanning is only reachable via the explicit action in FR-008/FR-009, never auto-activated. |
| VI. Control Multi-Usuario | PASS (dependency noted) | FR-005/FR-013 require an authenticated user to attribute every movement. **Dependency**: no sign-in UI exists yet anywhere in the codebase (feature 001 only scaffolded the Supabase *client*, not authentication — see its plan.md Constitution Check, corrected during `/speckit-analyze` to explicitly defer auth). This feature's own scope (per spec Assumptions) excludes building login UX. Recommendation: specify and implement a dedicated "inicio de sesión de personal clínico" feature before or alongside this one; see research.md for how this plan stays unblocked in the meantime. |
| Pila Tecnológica Obligatoria | PASS | Adds `@zxing/browser` for the mandated "captura óptica" stack item (feature 001 explicitly deferred this choice here); every other choice reuses the existing mandated stack with no substitution. |

Result: **PASS** — no constitution violations to justify in Complexity Tracking. One external
dependency (an authentication feature) is flagged, not a constitution violation.

**Post-Phase 1 re-check**: research.md, data-model.md, and contracts/supabase-schema.md finalized
the choices referenced above (`@zxing/browser`, FEFO as a pure function, append-only ledger with
derived stock, RLS enforcing `usuario_id = auth.uid()`). Nothing introduced a stack substitution
or a new domain-principle conflict; the RLS policy in `contracts/supabase-schema.md` actually
strengthens principle VI's guarantee (server-side, not just client-side attribution). Result:
**PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/002-registro-consumo-insumos/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

`contracts/` is populated this time (unlike feature 001): Supabase is external to this codebase,
so the Postgres table shapes the sync layer depends on are a real contract worth documenting —
see `contracts/supabase-schema.md`.

### Source Code (repository root)

```text
inDENTory/
├── src/
│   ├── app/                          # (existing) app shell
│   ├── components/                   # (existing) shared touch-first UI primitives
│   ├── features/
│   │   └── insumos/                  # NEW — populates the placeholder left by feature 001
│   │       ├── components/
│   │       │   ├── SearchPicker.tsx       # manual search (texto/categoría/rápida) — FR-001/004/010
│   │       │   ├── ScanButton.tsx         # explicit opt-in trigger — FR-008/009
│   │       │   ├── RegistroForm.tsx       # US1
│   │       │   └── ConsumoForm.tsx        # US2
│   │       ├── hooks/
│   │       │   └── useInsumoSearch.ts
│   │       └── lib/
│   │           ├── fefo.ts                # lot-selection algorithm — FR-006
│   │           ├── quantity.ts            # decimal/integer validation by unit — FR-016
│   │           └── movements.ts           # append-only movement creation — FR-005/013/015
│   ├── stores/
│   │   ├── appStore.ts                # (existing)
│   │   └── inventoryStore.ts          # NEW — Zustand cache of insumos/lotes for search+forms
│   ├── lib/
│   │   ├── db/
│   │   │   └── index.ts               # (existing stub) — gains the v1 Dexie schema this feature defines
│   │   ├── supabase/                  # (existing) client + connection check
│   │   ├── sync/
│   │   │   └── reconcileOverdraft.ts  # NEW — FR-014 overdraft-flagging reconciliation
│   │   └── scanner/
│   │       └── useBarcodeScanner.ts   # NEW — @zxing/browser wrapper — FR-008/010/011
│   └── styles/                        # (existing)
├── tests/
│   ├── unit/                          # + fefo/quantity/movement/reconciliation tests
│   └── integration/                   # + registro/consumo flow tests
└── specs/002-registro-consumo-insumos/contracts/supabase-schema.md
```

**Structure Decision**: Single frontend project, unchanged from feature 001 — this feature only
adds files under the existing tree, populating `src/features/insumos/` and adding
`src/lib/sync/` and `src/lib/scanner/` as new library subfolders alongside the existing
`src/lib/db/` and `src/lib/supabase/`.

## Complexity Tracking

*No Constitution Check violations — this section is not applicable.*
