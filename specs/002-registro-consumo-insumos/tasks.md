---

description: "Task list template for feature implementation"
---

# Tasks: Registro y Consumo de Insumos con Búsqueda Manual y Escaneo Opcional

**Input**: Design documents from `/specs/002-registro-consumo-insumos/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/supabase-schema.md,
quickstart.md

**Tests**: Not requested as upfront TDD in the spec. This feature's pure domain logic (FEFO
selection, quantity validation, overdraft reconciliation, movement immutability) is unit-tested
in Polish, since plan.md's Testing section calls these out as directly testable without a real
Supabase project; integration tests cover the two primary flows end-to-end.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P3) to enable
independent implementation and testing of each story. This feature builds on top of
`001-project-setup-local-dev`'s scaffold and consumes `003-login-personal-clinico`'s
`getUsuarioActualId()` accessor (`src/stores/authStore.ts`) for user attribution — both are
already merged into `develop`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Paths are relative to the repository root, per plan.md's Project Structure

## Phase 1: Setup

**Purpose**: Add the one new dependency this feature needs.

- [X] T001 [P] Install `@zxing/browser` and add it to `package.json` (research.md's scanning
      library decision)

**Checkpoint**: Dependency available for the scanner work in User Story 3.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared data layer, state, and sync infrastructure every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Add `insumos`, `lotes`, and `movimientos` as `db.version(2).stores({...})` in
      `src/lib/db/index.ts`, plus their typed `EntityTable` exports, per data-model.md (version 2
      because `003-login-personal-clinico` already claimed `version(1)` for `usuarioActual`)
- [X] T003 [P] Apply `contracts/supabase-schema.md`'s SQL (tables, indexes, and the
      `usuario_id = auth.uid()` RLS policy on `movimientos`) to the Supabase dev project
- [X] T004 [P] Implement the shared quantity validator `validateQuantity(value, unidadMedida)` in
      `src/features/insumos/lib/quantity.ts` (FR-016, research.md)
- [X] T005 Implement the shared append-only movement helper `crearMovimiento(...)` in
      `src/features/insumos/lib/movements.ts` — reads `getUsuarioActualId()` from
      `src/stores/authStore.ts` for `usuarioId`, and exposes no update/delete function (FR-005,
      FR-013, FR-015) (depends on T002)
- [X] T006 [P] Implement `useInventoryStore` (Zustand, backed by a Dexie `liveQuery` subscription)
      exposing search-by-text/categoría/selección-rápida selectors over `insumos`/`lotes` in
      `src/stores/inventoryStore.ts` (Constitution II; depends on T002)
- [X] T007 [P] Implement `reconcileOverdraft(loteId)` in `src/lib/sync/reconcileOverdraft.ts` —
      recomputes a lot's derived stock from its full movement history and sets
      `estado: 'revision'` if negative, never rejecting or reverting movements (FR-014) (depends
      on T002)
- [X] T008 Implement the background sync bridge (push unsynced `movimientos`/new
      `insumos`/`lotes` rows to Supabase; pull remote changes into Dexie by `id`) per
      `contracts/supabase-schema.md`'s sync contract, in `src/lib/sync/index.ts`; call
      `reconcileOverdraft` (T007) for each lot touched by a pulled/pushed `consumo` movement at
      the end of every sync batch (FR-012, FR-014) (depends on T002, T003, T007)
- [X] T009 Implement the shared `SearchPicker` component (búsqueda por texto, categoría, y
      selección rápida; ≥48x48px touch targets per Constitution III) in
      `src/features/insumos/components/SearchPicker.tsx`, backed by `useInventoryStore` (FR-001,
      FR-004, FR-010) (depends on T006)

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Registro de ingreso de un lote de insumo (Priority: P1) 🎯 MVP

**Goal**: A user searches for (or creates) an insumo and registers a new lote with its supplier,
quantity, and expiration date.

**Independent Test**: Search an existing insumo (or create one inline), fill in lote data, and
confirm it saves with the correct proveedor, quantity, and expiration date, without touching the
camera.

### Implementation for User Story 1

- [X] T010 [US1] Add the "crear insumo nuevo" inline flow (nombre, categoría, unidadMedida, and an
      optional código de fabricante field) to `SearchPicker`'s no-match state in
      `src/features/insumos/components/SearchPicker.tsx` (FR-003, FR-002a) (depends on T009)
- [X] T011 [P] [US1] Implement `RegistroForm` (SearchPicker + número de lote, proveedor, fecha de
      caducidad, cantidad, and an optional código de fabricante — validated via
      `validateQuantity`) in `src/features/insumos/components/RegistroForm.tsx` (FR-001, FR-002,
      FR-002a) (depends on T004, T009)
- [X] T012 [US1] Wire `RegistroForm`'s submit to create a `Lote` row and an `ingreso` `Movimiento`
      via `crearMovimiento` in `src/features/insumos/components/RegistroForm.tsx` (FR-002, FR-005,
      FR-013) (depends on T005, T011)
- [X] T013 [US1] Mount `RegistroForm` inside the authenticated branch of `src/app/App.tsx` (where
      `usuario` is already non-null), so `getUsuarioActualId()` is always available (depends on
      T012)

**Checkpoint**: User Story 1 is fully functional and independently testable (quickstart Scenario
1).

---

## Phase 4: User Story 2 - Consumo ágil de un insumo (Priority: P2)

**Goal**: A user searches for an insumo and confirms a consumption quantity, drawn automatically
from the lot closest to expiring (with manual override available), rejecting over-consumption.

**Independent Test**: With an existing insumo/lote, search for it, confirm a consumption
quantity, and verify the correct lot's stock decreases (FEFO) and over-consumption is rejected.

### Implementation for User Story 2

- [X] T014 [P] [US2] Implement the FEFO lot-selection pure function
      `selectFefoLot(lotes, cantidadNecesaria)` in `src/features/insumos/lib/fefo.ts` (FR-006)
- [X] T015 [US2] Implement `ConsumoForm` (SearchPicker + cantidad, FEFO auto-selection with
      manual lot override) in `src/features/insumos/components/ConsumoForm.tsx` (FR-004, FR-006)
      (depends on T009, T014)
- [X] T016 [US2] Wire `ConsumoForm`'s submit to reject any cantidad exceeding the selected lot's
      derived available stock with a clear message, writing no movement (FR-007, SC-003)
      (depends on T015)
- [X] T017 [US2] Wire `ConsumoForm`'s valid-case submit to create a `consumo` `Movimiento` via
      `crearMovimiento` (FR-005, FR-013) (depends on T005, T016)
- [X] T018 [US2] Mount `ConsumoForm` inside the authenticated branch of `src/app/App.tsx` (where
      `usuario` is already non-null), so `getUsuarioActualId()` is always available (depends on
      T017)

**Checkpoint**: User Stories 1 and 2 both work independently (quickstart Scenarios 2, 3, 7).

---

## Phase 5: User Story 3 - Escaneo opcional como atajo (Priority: P3)

**Goal**: A user opts into camera scanning via an explicit "Escanear" action during registro or
consumo, as an alternative to manual search.

**Independent Test**: Open the registro or consumo form, press "Escanear", and confirm a known
code selects the matching insumo/lote the same way manual search would; an unknown code or
unavailable camera falls back to manual search without resetting the form.

### Implementation for User Story 3

- [X] T019 [P] [US3] Implement `useBarcodeScanner` wrapping `@zxing/browser`'s
      `BrowserMultiFormatReader` in `src/lib/scanner/useBarcodeScanner.ts` — camera permission is
      requested only when invoked, never on mount (FR-008, FR-009)
- [X] T020 [US3] Implement `ScanButton` (≥48x48px, explicit "Escanear" action) that opens the
      scanner and, on a decode matching a known insumo/lote código, selects it the same way
      manual search would, in `src/features/insumos/components/ScanButton.tsx` (FR-008, FR-010)
      (depends on T006, T019)
- [X] T021 [US3] Handle no-match/camera-unavailable outcomes in `ScanButton`: show an explicit
      message and let the user continue by manual search without resetting the form (FR-011)
      (depends on T020)
- [X] T022 [US3] Mount `ScanButton` inside both `RegistroForm` and `ConsumoForm`, next to
      `SearchPicker` (depends on T021, T011, T015)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Unit-test the pure domain logic and validate the two primary flows end-to-end.

- [X] T023 [P] Unit tests for `validateQuantity` (decimal accepted for mL/g, rejected for
      pieza/caja) in `tests/unit/quantity.test.ts` (FR-016)
- [X] T024 [P] Unit tests for `selectFefoLot` (single lot, multiple lots by expiry order,
      insufficient total stock) in `tests/unit/fefo.test.ts` (FR-006)
- [X] T025 [P] Unit tests for `reconcileOverdraft` (flags negative derived stock, never reverts or
      drops a movement) in `tests/unit/reconcileOverdraft.test.ts` (FR-014)
- [X] T026 [P] Unit test confirming `crearMovimiento`'s module exposes no update/delete function
      in `tests/unit/movements.test.ts` (FR-015)
- [X] T027 Integration test for the registro flow (buscar → crear insumo si falta → guardar lote)
      in `tests/integration/registro.test.tsx` (US1, quickstart Scenario 1)
- [X] T028 Integration test for the consumo flow (FEFO automático + rechazo de sobreconsumo) in
      `tests/integration/consumo.test.tsx` (US2, quickstart Scenarios 2–3)
- [X] T029 Run `quickstart.md` Scenarios 1–7 end-to-end against the Supabase dev project and fix
      any gaps found

---

## Phase 7: Insumos que no caducan (FR-002b, incremental change)

**Purpose**: Add the `caduca` flag design captured in the 2026-09-07 spec/plan clarification
(spec.md Clarifications, plan.md "Re-check after FR-002b", data-model.md, contracts/supabase-schema.md)
to the already-implemented US1/US2 code, which currently still requires a fecha de caducidad on
every lote unconditionally.

**⚠️ Foundational within this phase**: T030–T032 block T033–T036 the same way Phase 2 blocked
Phase 3–5 originally — the type/schema changes have to land before any component or FEFO logic
built on top of them.

- [X] T030 [P] Add `caduca: boolean` to the `Insumo` interface and change `Lote.fechaCaducidad` to
      `string | null` in `src/lib/db/index.ts` (data-model.md)
- [X] T031 [P] Update `toInsumoRow`/`fromInsumoRow` in `src/lib/sync/index.ts` to map the new
      `caduca`/`caduca` column (contracts/supabase-schema.md) (depends on T030)
- [X] T032 [P] Apply the updated `contracts/supabase-schema.md` SQL delta (new `insumos.caduca`
      column; `lotes.fecha_caducidad` now nullable) to the Supabase dev project

### Implementation for User Story 1 (Registro)

- [X] T033 [US1] Add a "No caduca" checkbox to `CrearInsumoForm` in
      `src/features/insumos/components/SearchPicker.tsx`, setting `caduca` on the created Insumo
      (FR-002b) (depends on T030)
- [X] T034 [US1] In `RegistroForm` (`src/features/insumos/components/RegistroForm.tsx`), hide the
      fecha de caducidad field and skip its validation when the selected insumo has
      `caduca === false`, saving the Lote with `fechaCaducidad: null` (FR-002, FR-002b) (depends on
      T030, T033)

### Implementation for User Story 2 (Consumo)

- [X] T035 [P] [US2] Update `selectFefoLot` in `src/features/insumos/lib/fefo.ts` to sort lotes
      with `fechaCaducidad: null` after every dated lote — consumed only once dated lotes for the
      same insumo are exhausted (FR-006) (depends on T030)
- [X] T036 [US2] Update the lote `<select>` option label in `ConsumoForm`
      (`src/features/insumos/components/ConsumoForm.tsx`) to show "sin fecha de caducidad" when
      `lote.fechaCaducidad` is `null` (depends on T030)

### Polish for this phase

- [X] T037 [P] Update `tests/unit/fefo.test.ts`: add cases for a lote with `fechaCaducidad: null`
      sorting last, and being chosen only once dated lotes are exhausted (FR-006) (depends on T035)
- [X] T038 [P] Update `tests/integration/registro.test.tsx`: add a case for an insumo marked
      `caduca: false` — confirm the fecha de caducidad field never renders and the lote saves with
      `fechaCaducidad: null` (depends on T033, T034)
- [X] T039 Run `quickstart.md` Scenario 8 end-to-end against the Supabase dev project (depends on
      T032, T034, T035, T036)

**Checkpoint**: Insumos marked "no caduca" skip the fecha de caducidad prompt end-to-end, and FEFO
correctly defers their lotes until dated lotes of the same insumo are exhausted.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational completion
  - Can proceed in parallel (if staffed) or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all three user stories being complete
- **Insumos que no caducan (Phase 7)**: Independent of Phases 1–6's original scope, but layers on
  top of the already-implemented US1/US2 code — T030–T032 (schema) block T033–T036
  (form/FEFO changes), which block T037–T039 (polish for this phase)

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on US2/US3 — the MVP; must work standalone
- **User Story 2 (P2)**: Independent of US1 at the code level (separate form/lib files), though
  its Independent Test assumes an insumo/lote already exists (seed one directly, or via US1)
- **User Story 3 (P3)**: Depends on `RegistroForm`/`ConsumoForm` existing to mount `ScanButton`
  into (T022), but its own scanner logic (T019–T021) is independent of US1/US2

### Within Foundational

- `reconcileOverdraft` (T007) is implemented **before** the sync bridge (T008), since the sync
  bridge calls it — not the reverse. Both only depend on the Dexie schema (T002).

### Parallel Opportunities

- T002, T003, T004, T006, T007 (Foundational) — different files, no dependency on each other
- T011 (US1) and T014 (US2) — different files, both only depend on Foundational
- T019 (US3, scanner hook) — independent of US1/US2 entirely, only depends on T001
- T023, T024, T025, T026 (Polish, unit tests) — different files, independent of each other

---

## Parallel Example: Foundational Phase

```bash
# After T001 completes, launch these together (different files, all depend only on nothing/T002):
Task: "Add insumos/lotes/movimientos to db.version(2).stores({...}) in src/lib/db/index.ts"
Task: "Apply contracts/supabase-schema.md's SQL to the Supabase dev project"
Task: "Implement validateQuantity in src/features/insumos/lib/quantity.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 on a real Supabase dev project
5. This is the MVP — a user can register incoming supply batches

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate with quickstart Scenario 1 (MVP)
3. User Story 2 → validate with quickstart Scenarios 2, 3, 7
4. User Story 3 → validate with quickstart Scenario 5
5. Polish → unit tests + Scenarios 4 and 6 + full end-to-end pass

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
