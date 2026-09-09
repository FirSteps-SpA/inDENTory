---

description: "Task list template for feature implementation"
---

# Tasks: Alertas de Caducidad y Stock Mínimo

**Input**: Design documents from `/specs/004-alertas-caducidad-stock/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/supabase-schema.md,
quickstart.md

**Tests**: Not requested as TDD in the spec. plan.md commits to unit-testing the three pure alert
calculators (mirroring feature 002's `fefo.ts`/`stock.ts` precedent), so one lightweight
verification test is included per calculator, written alongside its implementation rather than
test-first.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P3) to enable
independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Paths are relative to the repository root, per plan.md's Project Structure

## Phase 1: Setup

**Purpose**: Make room for this feature's files in the existing scaffold.

- [X] T001 Create `src/features/alertas/components/`, `src/features/alertas/lib/`, and
      `tests/unit/alertas/` directories per plan.md Project Structure

**Checkpoint**: Directories exist; no new dependencies required (plan.md — stack unchanged).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The schema, reactive stores, and sync plumbing every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 In `src/lib/db/index.ts`: add `stockMinimo: number | null` to the `Insumo` interface,
      add a new `ConfiguracionAlertas` interface (`{ id: 'global', nivelesAvisoDias: number[] }`),
      and add `db.version(3).stores({ configuracionAlertas: 'id' })` (data-model.md)
- [X] T003 Apply this feature's Supabase schema additions from
      `specs/004-alertas-caducidad-stock/contracts/supabase-schema.md` (`alter table insumos add
      column stock_minimo numeric;`, the new `configuracion_alertas` table, and its RLS policies)
      to the Supabase dev project's SQL Editor — done by user; verified live
- [X] T004 [P] Extend `src/stores/inventoryStore.ts` with a `movimientos: Movimiento[]` field and
      a `liveQuery(() => db.movimientos.toArray())` subscription alongside the existing
      `insumos`/`lotes` ones (research.md's "extend, don't duplicate" decision) — needed to derive
      per-insumo stock for every alert calculator
- [X] T005 [P] Create `src/stores/alertasStore.ts` (Zustand, per Constitution II): a
      `liveQuery(() => db.configuracionAlertas.get('global'))` subscription exposing
      `nivelesAvisoDias: number[]`, falling back to the in-code default `[30, 7, 1]` when no row
      exists yet (data-model.md's Bootstrapping) (depends on T002)
- [X] T006 [P] Extend `src/lib/sync/index.ts`: add `stock_minimo`/`stockMinimo` to `InsumoRow`,
      `toInsumoRow`, and `fromInsumoRow`; add `pushConfiguracionAlertas`/
      `pullConfiguracionAlertas` functions for the new `configuracion_alertas` table (same
      upsert-by-`id` shape as the existing push/pull functions), and call both from
      `runSyncBatch` (contracts/supabase-schema.md's sync contract) (depends on T002, T003)

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Ver alertas de stock por debajo del mínimo (Priority: P1) 🎯 MVP

**Goal**: Any authenticated user opens the alerts screen and immediately sees which insumos are
below their configured stock mínimo; only an administrador can set that threshold.

**Independent Test**: Configure a stock mínimo for an existing insumo, drive its stock below that
threshold via consumos, and verify the alert appears — without any lote near expiry or in
revisión (spec Independent Test, User Story 1).

### Implementation for User Story 1

- [X] T007 [P] [US1] Implement `computeInsumosStockBajo(insumos, lotes, movimientos)` in
      `src/features/alertas/lib/stockBajo.ts`: sums each insumo's stock across its lotes (reusing
      feature 002's `computeStockLote` per lote) and returns one `AlertaStockBajo` entry per
      insumo whose total is below its own `stockMinimo`, skipping insumos with `stockMinimo:
      null` (FR-002, FR-003, FR-004, data-model.md's AlertaStockBajo)
- [X] T008 [P] [US1] Unit test in `tests/unit/alertas/stockBajo.test.ts`: insumo below mínimo
      appears, insumo at/above mínimo doesn't, insumo without `stockMinimo` never appears
      regardless of stock (FR-002/003/004, Acceptance Scenarios 1-4)
- [X] T009 [P] [US1] Implement `actualizarStockMinimo(insumoId, stockMinimo)` in
      `src/features/alertas/lib/configuracion.ts`: validates the value against the insumo's
      `permiteDecimales` (reusing feature 002's `validateQuantity` rule) and writes
      `db.insumos.update(insumoId, { stockMinimo })` (FR-001, data-model.md's Validation)
      (depends on T002)
- [X] T010 [US1] Create `src/features/alertas/components/AlertasView.tsx`: reads
      `insumos`/`lotes`/`movimientos` from `inventoryStore` (T004), renders the stock-bajo list
      via `computeInsumosStockBajo` (T007), and — only when `useAuthStore`'s `usuario.rol ===
      'administrador'` — an inline editable stock-mínimo input per insumo wired to
      `actualizarStockMinimo` (T009), all interactive elements using the existing ≥48x48px
      `touch-target` convention (FR-001, FR-003, Clarifications Q2) (depends on T004, T007, T009)
- [X] T011 [US1] Add "Alertas" as a third `Vista` tab in `src/app/App.tsx`'s tab switcher
      (alongside "Registrar"/"Consumir"), rendering `AlertasView` (FR-013) (depends on T010)

**Checkpoint**: At this point, User Story 1 is fully functional and independently testable —
stock-bajo alerts work end-to-end for both roles.

---

## Phase 4: User Story 2 - Ver alertas de caducidad de lotes (Priority: P2)

**Goal**: Any authenticated user sees which lotes with stock disponible are near expiry (by
configured warning tier) or already expired; only an administrador can adjust the warning tiers.

**Independent Test**: Register lotes at 30/7/1 días and one already expired, and verify all four
appear marked with distinguishable urgency, without needing any stock-bajo alert (spec Independent
Test, User Story 2).

### Implementation for User Story 2

- [X] T012 [P] [US2] Implement `computeAlertasCaducidad(lotes, movimientos, nivelesAvisoDias,
      hoy)` in `src/features/alertas/lib/caducidad.ts`: for each lote with stock disponible `> 0`
      whose insumo has `caduca: true`, computes `diasRestantes` and applies research.md's
      smallest-satisfying-tier algorithm (`'caducado'` if negative, else the smallest configured
      nivel `>= diasRestantes`, else no alert) (FR-005, FR-006, FR-007, FR-008)
- [X] T013 [P] [US2] Unit test in `tests/unit/alertas/caducidad.test.ts`: covers each default
      tier (30/7/1), the `'caducado'` case, exclusion of `caduca: false` insumos, and exclusion of
      agotado lotes (FR-006/007/008, research.md's urgency-tier algorithm)
- [X] T014 [US2] Add `actualizarNivelesAviso(dias: number[])` to
      `src/features/alertas/lib/configuracion.ts`: writes `db.configuracionAlertas.put({ id:
      'global', nivelesAvisoDias: dias })` (FR-005) (depends on T009, same file)
- [X] T015 [US2] Extend `AlertasView.tsx` to render the caducidad list via
      `computeAlertasCaducidad` (T012), reading `nivelesAvisoDias` from `alertasStore` (T005),
      and — admin only — an editable niveles-de-aviso control wired to `actualizarNivelesAviso`
      (T014), with the same ≥48x48px `touch-target` convention as T010 (depends on T005, T010,
      T012, T014, same file as T010)

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Revisar lotes marcados para revisión manual (Priority: P3)

**Goal**: Any authenticated user sees lotes flagged for manual revisión (feature 002's overdraft
reconciliation) with the overdraft detail; only an administrador can mark one resolved.

**Independent Test**: Flag a lote as `estado: 'revision'` (or trigger feature 002's overdraft
scenario), open Alertas as administrador, and verify it's listed with its overdraft and can be
marked resuelto (spec Independent Test, User Story 3).

### Implementation for User Story 3

- [X] T016 [P] [US3] Implement `lotesEnRevision(lotes, movimientos)` and `marcarLoteResuelto
      (loteId)` in `src/features/alertas/lib/revision.ts`: the former returns one
      `AlertaRevision` entry (lote + insumo + derived `stockDerivado`, reusing
      `computeStockLote`) per lote with `estado: 'revision'`; the latter writes
      `db.lotes.update(loteId, { estado: 'activo' })` (FR-009, FR-010, data-model.md's
      AlertaRevision)
- [X] T017 [P] [US3] Unit test in `tests/unit/alertas/revision.test.ts`: `lotesEnRevision` lists
      overdrawn lotes with the correct negative `stockDerivado`; `marcarLoteResuelto` flips
      `estado` back to `'activo'` (FR-009/010)
- [X] T018 [US3] Extend `AlertasView.tsx` to render the revisión list via `lotesEnRevision` (T016)
      for every authenticated user, showing a "Marcar como resuelto" button wired to
      `marcarLoteResuelto` (T016) only when `usuario.rol === 'administrador'`, using the same
      ≥48x48px `touch-target` convention as T010 (FR-009, FR-010, Clarifications Q2) (depends on
      T010, T016, same file as T010/T015)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Close documentation gaps and validate the full feature end-to-end.

- [X] T019 [P] Update the README's "Configurar backend de desarrollo" section to reference
      `specs/004-alertas-caducidad-stock/contracts/supabase-schema.md`'s additional SQL, mirroring
      the existing references to features 002/003's schema files
- [X] T020 Run `quickstart.md` Scenarios 1-6 end-to-end against a Supabase dev project with an
      `administrador` and a `personal` test account, and fix any gaps found (depends on all prior
      tasks) — run manually by user against real accounts; all 6 scenarios pass
- [X] T021 [P] Add an integration test in `tests/integration/alertas-reactividad.test.tsx`:
      writing a new movimiento, or updating `stockMinimo`/`nivelesAvisoDias` directly via Dexie,
      causes `AlertasView` to reflect the updated alert list without remounting (FR-011) (depends
      on T010, T015, T018)
- [X] T022 [P] Unit test in `tests/unit/alertas/no-network.test.ts` asserting that
      `computeInsumosStockBajo`/`computeAlertasCaducidad`/`lotesEnRevision` return a plain array
      synchronously (never a `Promise`) — a direct guarantee no network call can be hiding inside
      them, without relying on Node-only file-reading APIs unavailable in this project's
      browser-only tsconfig (SC-005 regression guard) (depends on T007, T012, T016)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational completion
  - US2 and US3 both extend `AlertasView.tsx` (US1's file) and, for US2,
    `configuracion.ts` (US1's file) — within this feature they're best done in priority order
    (P1 → P2 → P3) rather than fully in parallel
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on US2/US3 — the MVP; must work standalone
- **User Story 2 (P2)**: Extends US1's `AlertasView.tsx` and `configuracion.ts`; requires US1's
  screen to exist so there's a place to add the caducidad section
- **User Story 3 (P3)**: Extends US1's `AlertasView.tsx`; requires US1's screen to exist so
  there's a place to add the revisión section

### Parallel Opportunities

- T004, T005, T006 (Foundational) — three different files, T005/T006 depend only on T002
- T007, T008, T009 (US1) — three different files
- T012, T013 (US2) — two different files, independent of T014
- T016, T017 (US3) — two different files
- T019, T021, T022 (Polish) — three different files, independent of T020 and of each other

---

## Parallel Example: Foundational Phase

```bash
# After T002/T003 complete, launch these together (different files):
Task: "Extend inventoryStore with movimientos liveQuery in src/stores/inventoryStore.ts"
Task: "Create alertasStore in src/stores/alertasStore.ts"
Task: "Extend sync/index.ts with stock_minimo and configuracion_alertas push/pull"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1-2 with a connected device
5. This is the MVP — staff can see and configure stock-bajo alerts

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate with quickstart Scenarios 1-2 (MVP)
3. User Story 2 → validate with quickstart Scenarios 3-4 (caducidad tiers)
4. User Story 3 → validate with quickstart Scenario 5 (revisión)
5. Polish → validate quickstart Scenario 6 (offline) and the full flow end-to-end

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
