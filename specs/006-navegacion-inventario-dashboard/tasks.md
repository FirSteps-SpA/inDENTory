---

description: "Task list template for feature implementation"
---

# Tasks: Rediseño de Navegación e Vista Principal de Insumos (Dashboard & Listado)

**Input**: Design documents from `/specs/006-navegacion-inventario-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md,
quickstart.md

**Tests**: Not requested as TDD in the spec. plan.md commits to unit-testing the new pure
derivation functions (`estado.ts`, `proximoLote.ts`) and to an integration test for the new
Inventario screen and the 4-tab navigation, mirroring feature 004's precedent — tests are written
alongside their implementation task rather than test-first.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P1/P2/P3) to enable
independent implementation and testing of each story. User Story 1 (resumen) and User Story 2
(búsqueda/filtros/listado) are both P1 and structurally coupled — US1's "tocar el resumen filtra
el listado" acceptance scenario needs *some* list to filter — so US1 ships a minimal list first
and US2 completes it into the full `InsumoCard`/`InsumoFiltros` experience, the same
extend-the-shared-file pattern feature 004 used between its own US1/US2/US3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Paths are relative to the repository root, per plan.md's Project Structure

## Phase 1: Setup

**Purpose**: Make room for this feature's new files in the existing scaffold.

- [X] T001 Create `src/features/compras/components/`, `src/features/mas/components/`, and
      `tests/unit/insumos/` directories per plan.md Project Structure (`src/features/insumos/
      {components,lib}` and `tests/integration/` already exist from specs 002/005)

**Checkpoint**: Directories exist; no new dependencies required (plan.md — stack unchanged).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The derived view-model and filter primitives that User Stories 1, 2, and 3 all
depend on, plus the minimal navigation scaffold needed for any of them to be reachable as the
app's default screen.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Implement `computeEstadoInsumo(insumos, lotes, movimientos, nivelesAvisoDias)` in
      `src/features/insumos/lib/estado.ts`: reuses `computeInsumosStockBajo`/
      `computeAlertasCaducidad` (spec 004) unchanged and applies research.md's priority rule
      (`caducado` > `proximo-a-caducar` > `bajo-stock` > `ok`) to produce one `EstadoInsumo` per
      insumo (data-model.md's EstadoInsumo, FR-009)
- [X] T003 [P] Unit test in `tests/unit/insumos/estado.test.ts`: each of the 4 states resolves
      correctly, and an insumo qualifying for more than one (e.g. bajo stock AND próximo a
      caducar) resolves to the higher-priority one (research.md's priority rule)
- [X] T004 [P] Implement `loteMasProximoAVencer(lotes, movimientos)` in
      `src/features/insumos/lib/proximoLote.ts`: calls `selectFefoLot` (spec 002's `fefo.ts`) with
      `cantidadNecesaria = 0` to get the earliest-expiring lote with stock disponible, returning
      `null` when none qualifies (research.md)
- [X] T005 [P] Unit test in `tests/unit/insumos/proximoLote.test.ts`: picks the earliest-expiring
      lote among several with stock, ignores lotes with no stock, returns `null` for an insumo
      with no lotes or `caduca: false`
- [X] T006 Add `searchInsumosPorEstado(estadosInsumo: EstadoInsumo[], estados: Estado[])` to
      `src/stores/inventoryStore.ts`, alongside the existing `searchInsumosPorTexto`/
      `searchInsumosPorCategoria` (contracts/ui-contracts.md): `estados.length === 0` returns
      everything unfiltered, otherwise keeps entries whose `estado` is included in `estados`
      (depends on T002 for the `EstadoInsumo`/`Estado` types)
- [X] T007 Update `src/app/BottomNav.tsx`'s `Vista` type to `'inventario' | 'compras' | 'alertas' |
      'mas'` (temporarily keep the existing `Package`/`Bell` icons for Inventario/Alertas; Compras/
      Más get their final icons and content in User Story 4), and update `src/app/App.tsx`: default
      `vista` state to `'inventario'`, and render a temporary minimal placeholder for `'compras'`/
      `'mas'` so the app compiles and every tab is clickable while User Stories 1-3 are built
      (FR-001, FR-002 — full nav content is User Story 4's scope)

**Checkpoint**: Foundation ready — user story implementation can now begin. `npm run dev` opens
directly on a (still mostly empty) "Inventario" tab.

---

## Phase 3: User Story 1 - Ver el estado general del inventario al entrar (Priority: P1) 🎯 MVP (part 1/2)

**Goal**: Opening the app immediately shows how many insumos are caducados/próximos a caducar and
how many are below stock mínimo, and tapping either count filters the list to match.

**Independent Test**: Seed data with caducado, próximo-a-caducar, and bajo-stock insumos; open the
app and confirm the summary counts are correct without navigating away (quickstart Scenario 1).

### Implementation for User Story 1

- [X] T008 [US1] Create `src/features/insumos/components/ResumenAlertasBanner.tsx` per
      contracts/ui-contracts.md: two indicators (caducidad, stock bajo), each with color + icon +
      count + text label (never color alone, spec Clarifications), an "en buen estado" state when
      both counts are 0, and `onFiltrarCaducidad`/`onFiltrarStockBajo` callbacks (FR-003, FR-004)
- [X] T009 [US1] Create `src/features/insumos/components/InventarioView.tsx`: reads `insumos`/
      `lotes`/`movimientos` from `inventoryStore` and `nivelesAvisoDias` from `alertasStore`
      (same pattern as `AlertasView`); computes `totalCaducidad`/`totalStockBajo` directly via
      `computeAlertasCaducidad`/`computeInsumosStockBajo` (unchanged) for `ResumenAlertasBanner`
      (T008); owns the `texto`/`categoria`/`estado: Estado[]`/`insumoSeleccionadoId` filter state
      (data-model.md's Filtro de Inventario); for now renders a minimal read-only list (insumo
      name + estado from `computeEstadoInsumo`/T002, filtered through `searchInsumosPorEstado`/
      T006 with `estado`) just enough to prove the tap-to-filter interaction, including
      `ResumenAlertasBanner`'s `onFiltrarCaducidad` setting `['caducado', 'proximo-a-caducar']` at
      once — the full `InsumoCard`/`InsumoFiltros` UI arrives in User Story 2 (FR-003, FR-004,
      SC-001) (depends on T002, T006, T007, T008)
- [X] T010 [US1] Integration test in `tests/integration/inventario.test.tsx`: renders
      `InventarioView` directly (same convention as `tests/integration/alertas-
      reactividad.test.tsx`) with seeded insumos/lotes/movimientos covering all 4 estados; asserts
      the summary counts are correct and that tapping "Caducados/Próximos" filters the (minimal)
      list to only those insumos (FR-003, FR-004, SC-001) (depends on T009)

**Checkpoint**: User Story 1 is independently functional — the summary and its tap-to-filter work
end-to-end, even though the list itself is still minimal.

---

## Phase 4: User Story 2 - Buscar y filtrar insumos desde una sola pantalla (Priority: P1) 🎯 MVP (part 2/2)

**Goal**: Search by name and filter by categoría/estado, combinable, replacing the separate
Registrar/Consumir screens as the primary way to find an insumo.

**Independent Test**: Search by name, filter by categoría, filter by estado, and combine all
three; confirm the list narrows correctly and shows an empty state with a "limpiar filtros" action
when nothing matches (quickstart Scenario 2).

### Implementation for User Story 2

- [X] T011 [P] [US2] Add a `ChevronRight` icon to `src/components/icons/index.tsx` (same
      stroke-based style as the existing set, research.md) — used as `InsumoCard`'s "abrir
      detalle" affordance
- [X] T012 [US2] Create `src/features/insumos/components/InsumoCard.tsx` per contracts/
      ui-contracts.md: renders categoría, an estado badge combining color + icon + short text
      label (spec Clarifications, reusing `estadoInsumo.estado` from T002), nombre comercial,
      `estadoInsumo.loteMasProximoAVencer` (from T004) when not `null`, and `stockTotal`; the
      whole card is the ≥48px touch target and calls `onOpen(insumoId)` (FR-009, FR-010) (depends
      on T011)
- [X] T013 [US2] Create `src/features/insumos/components/InsumoFiltros.tsx` per contracts/
      ui-contracts.md: a search input scoped to `Insumo.nombre` only (spec Clarifications, FR-005)
      with `ScanButton` (spec 002, unchanged) mounted at the end; horizontal-scroll category chips
      reusing `categoriasDisponibles` (unchanged); single-select estado badges (Ok/Bajo Stock/
      Próximo a caducar/Caducado) — each tap replaces the `estado` array with that one value,
      `estado: []` when none is active (FR-006, FR-007, FR-008)
- [X] T014 [US2] Extend `InventarioView.tsx` (T009): replace the minimal list with
      `InsumoFiltros` (T013) plus a list of `InsumoCard` (T012), combining `texto`/`categoria`/
      `estado` via `searchInsumosPorTexto`/`searchInsumosPorCategoria`/`searchInsumosPorEstado`
      (all three existing/T006, applied together); render an empty-state `Card` with a "Limpiar
      filtros" action when the combination yields no results (FR-005, FR-007, FR-008, FR-012)
      (depends on T009, T012, T013, same file as T009)
- [X] T015 [US2] Extend `tests/integration/inventario.test.tsx` (T010): add cases for text search,
      category filter, all three filters combined, and the empty state with "Limpiar filtros"
      (FR-005, FR-007, FR-008, FR-012) (depends on T014, same file as T010)

**Checkpoint**: User Stories 1 and 2 together form the usable Inventario screen — search, filter,
and the alert summary all work end-to-end. This is the realistic MVP.

---

## Phase 5: User Story 3 - Consultar el detalle completo de un insumo (Priority: P2)

**Goal**: Tapping an insumo shows all its lotes, their vencimientos, and total stock, read-only.

**Independent Test**: Tap an insumo with multiple lotes and confirm every lote and its vencimiento
appear with the aggregated stock; close it and confirm the prior search/filters are unchanged
(quickstart Scenario 3).

### Implementation for User Story 3

- [X] T016 [P] [US3] Add an `X` icon to `src/components/icons/index.tsx` (same style) — used to
      close `InsumoDetalle`
- [X] T017 [US3] Create `src/features/insumos/components/InsumoDetalle.tsx` per contracts/
      ui-contracts.md: lists every lote of the insumo with `numeroLote`, `fechaCaducidad` (or "No
      caduca"), and its own stock via `computeStockLote` (unchanged), plus the aggregated total;
      no edit/consume/delete controls (FR-010, Assumptions); `onClose` uses the `X` icon (T016)
- [X] T018 [US3] Extend `InventarioView.tsx` (T009/T014): render `InsumoDetalle` (T017)
      conditionally based on `insumoSeleccionadoId`, without unmounting the filtros/listado
      subtree, so `texto`/`categoria`/`estado` survive opening and closing the detail (FR-011);
      wire `InsumoCard`'s `onOpen` (T012) to set `insumoSeleccionadoId` (depends on T012, T014,
      T017, same file as T009)
- [X] T019 [US3] Extend `tests/integration/inventario.test.tsx` (T010/T015): open the detail of an
      insumo with multiple lotes, assert every lote/vencimiento and the total stock render, close
      it, and assert the previously-set search/filter values are still active (FR-010, FR-011)
      (depends on T018, same file as T010)

**Checkpoint**: User Stories 1, 2, and 3 are all independently functional.

---

## Phase 6: User Story 4 - Navegar entre las secciones principales de la app (Priority: P3)

**Goal**: A clear 4-section bottom navigation (Inventario/Compras/Alertas/Más) replaces the old
3-tab nav, with Compras and Más existing as real (if minimal) destinations.

**Independent Test**: Tap each of the 4 nav items and confirm the app switches screens and
highlights the active tab, with Compras/Más showing recognizable content instead of a blank
screen or error (quickstart Scenario 4).

### Implementation for User Story 4

- [X] T020 [P] [US4] Add `ShoppingCart` and `Settings` icons to `src/components/icons/index.tsx`
      (same style) — final icons for the Compras/Más tabs
- [X] T021 [US4] Finish `src/app/BottomNav.tsx` (T007): use `ShoppingCart` (Compras) and
      `Settings` (Más) for their tabs (T020), confirming active-tab highlighting works across all
      4 (FR-001, FR-002) (depends on T007, T020)
- [X] T022 [P] [US4] Create `src/features/compras/components/ComprasPlaceholder.tsx`: minimal
      recognizable stub (title, `ShoppingCart` icon, "próximamente" message referencing spec 009)
      (FR-015)
- [X] T023 [P] [US4] Create `src/features/mas/components/MasView.tsx`: lists "Registrar insumo" /
      "Consumir insumo" actions that open the existing `RegistroForm`/`ConsumoForm` (specs 002/005)
      unmodified — the temporary bridge from research.md — so no existing capability regresses
      while specs 007-009 are pending (FR-015)
- [X] T024 [US4] Update `App.tsx`'s `'compras'`/`'mas'` branches (T007's placeholders) to render
      `ComprasPlaceholder` (T022) and `MasView` (T023) respectively (depends on T007, T022, T023)
- [X] T025 [US4] Integration test in `tests/integration/bottom-nav.test.tsx`: default tab is
      Inventario; tapping each of the 4 tabs navigates and marks it active; Compras renders the
      placeholder; Más renders the bridge actions and opens `RegistroForm`/`ConsumoForm` unchanged
      (FR-001, FR-002, FR-015) (depends on T021, T024)

**Checkpoint**: All four user stories are independently functional; the feature is complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Close regression and accessibility gaps, and validate the full feature end-to-end.

- [X] T026 [P] Run `tests/integration/registro.test.tsx` and `tests/integration/consumo.test.tsx`
      unmodified and confirm both still pass with no assertion changes (quickstart Scenario 7 —
      `RegistroForm`/`ConsumoForm` are only reachable from a new location, never altered) (depends
      on T023)
- [X] T027 [P] Manually verify `ResumenAlertasBanner` (T008) and `InsumoCard` (T012) estado badges
      stay distinguishable in grayscale / a color-blindness simulator, confirming the icon + text
      label carry the meaning without relying on color alone (spec Clarifications, quickstart
      Scenario 5) (depends on T008, T012)
- [X] T028 Run `quickstart.md` Scenarios 1-7 end-to-end against the dev server and fix any gaps
      found (depends on all prior tasks)
- [X] T029 [P] Run `npm run lint`, `npm run test`, and `npm run build` (quickstart Scenario 8) and
      fix any issues found (depends on all prior tasks)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational completion
  - US2 extends US1's `InventarioView.tsx`; US3 extends the same file again; within this feature
    they're best done in priority/numeric order (P1 → P1 → P2 → P3) rather than fully in parallel,
    same as feature 004's precedent
  - US4 (`BottomNav.tsx`/`App.tsx`) can technically start right after Foundational, in parallel
    with US1-3, since it touches different files (`BottomNav.tsx`, `ComprasPlaceholder.tsx`,
    `MasView.tsx`) — only T024's edit to `App.tsx` and T025's nav test benefit from US1-3 already
    existing, so they can rendering something real under "Inventario"
- **Polish (Phase 7)**: Depends on all four user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on US2/US3/US4 for its own acceptance criteria — the first
  half of the MVP
- **User Story 2 (P1)**: Extends US1's `InventarioView.tsx`; together with US1 forms the realistic
  MVP (a resumen with nothing to filter, or a list with no summary, both under-deliver the spec's
  intent)
- **User Story 3 (P2)**: Extends US1/US2's `InventarioView.tsx`; requires `InsumoCard` (US2) to
  have something to open a detail from
- **User Story 4 (P3)**: Independent of US1-3's file (`BottomNav.tsx`/`App.tsx`/new stub
  components), but its own integration test (T025) is more meaningful once Inventario has real
  content

### Parallel Opportunities

- T002, T003, T004, T005 (Foundational) — different files; T006/T007 depend on T002/none
  respectively
- T011 (US2) and T016 (US3) — different icon additions to the same file, but small/independent
  enough to sequence trivially if not done together
- T020, T022, T023 (US4) — three different files, no cross-dependency
- T026, T027, T029 (Polish) — three independent verification tasks

---

## Parallel Example: Foundational Phase

```bash
# After Setup (T001), launch these together (different files):
Task: "Implement computeEstadoInsumo in src/features/insumos/lib/estado.ts"
Task: "Unit test estado.ts in tests/unit/insumos/estado.test.ts"
Task: "Implement loteMasProximoAVencer in src/features/insumos/lib/proximoLote.ts"
Task: "Unit test proximoLote.ts in tests/unit/insumos/proximoLote.test.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks all stories)
3. Complete Phase 3: User Story 1 (resumen + tap-to-filter, minimal list)
4. Complete Phase 4: User Story 2 (full search/filter/`InsumoCard` list)
5. **STOP and VALIDATE**: run quickstart.md Scenarios 1-2
6. This is the MVP — staff can see alert counts and find any insumo from one screen

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate with quickstart Scenario 1
3. User Story 2 → validate with quickstart Scenario 2 (MVP complete)
4. User Story 3 → validate with quickstart Scenario 3 (detalle de solo lectura)
5. User Story 4 → validate with quickstart Scenario 4 (4-tab nav, Compras/Más stubs)
6. Polish → validate quickstart Scenarios 5-8 (accesibilidad, offline, no-regresión, calidad)

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
