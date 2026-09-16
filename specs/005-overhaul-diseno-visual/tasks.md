---

description: "Task list template for feature implementation"
---

# Tasks: Overhaul de Diseño Visual

**Input**: Design documents from `/specs/005-overhaul-diseno-visual/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/design-system.md,
quickstart.md

**Tests**: No new test tasks — this feature must not need any change to existing test assertions
(spec SC-003). Instead, `npm run test` is run repeatedly during implementation (and again in
Polish) as the regression guard: every restyle task must keep every existing label, button text,
role, and message exactly as tests already query it.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P3) to enable
independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Paths are relative to the repository root, per plan.md's Project Structure

## Phase 1: Setup

**Purpose**: Bring in the one new dependency and make room for the new shared-component layer.

- [X] T001 Add `@fontsource/manrope` as a project dependency (`npm install @fontsource/manrope`)
      (research.md's self-hosted-font decision)
- [X] T002 [P] Create `src/components/icons/` and `src/components/ui/` directories per plan.md
      Project Structure

**Checkpoint**: Dependency installed, directories exist.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The design tokens, icon set, and shared UI primitives every screen restyle depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Add the Tailwind v4 `@theme` token block (neutral/primary/alert-semantic colors,
      `--font-sans`) and the `@fontsource/manrope` weight imports (400/500/700/800) to
      `src/styles/index.css`, per `contracts/design-system.md`'s exact hex values (depends on T001)
- [X] T004 [P] Create the icon set in `src/components/icons/index.tsx`: 16 stroke-based
      (`stroke-width: 1.75`, `currentColor`) inline SVG components — `Tooth`, `Search`, `Scan`,
      `Calendar`, `Hash`, `Truck`, `Bell`, `Package`, `PackageMinus`, `Check`, `AlertTriangle`,
      `ChevronDown`, `Plus`, `Minus`, `Mail`, `Lock` — each accepting `size?`/`className?`
      (contracts/design-system.md) (depends on T002)
- [X] T005 [P] Create `src/components/ui/TouchButton.tsx`: `variant?: 'primary' | 'secondary' |
      'ghost'` (default `'primary'`), standard `<button>` props, `min-height: 48px; min-width:
      48px` built in (FR-003, contracts/design-system.md) (depends on T002, T003)
- [X] T006 [P] Create `src/components/ui/IconField.tsx`: `label`, `icon`, `htmlFor`, `hint?`,
      `error?`, `children` (the input), wrapper enforcing `min-height: 48px` (FR-003,
      contracts/design-system.md) (depends on T002, T003)
- [X] T007 [P] Create `src/components/ui/Card.tsx`: rounded (14px), bordered, `bg-surface`
      container (`children`, `className?`) (depends on T002, T003)
- [X] T008 [P] Create `src/components/ui/Badge.tsx`: `variant: 'success' | 'warning-30' |
      'urgent-7' | 'urgent-1' | 'danger' | 'neutral'`, each rendering its light `-bg` token with
      its matching dark `-text` token from `contracts/design-system.md` (never a solid fill with
      white text, except `danger`) — the pairing verified ≥4.5:1 WCAG AA in research.md (FR-005)
      (depends on T002, T003)

**Checkpoint**: Design tokens, icons, and shared UI primitives ready — user story work can begin.

---

## Phase 3: User Story 1 - Entrar a una app con identidad visual consistente (Priority: P1) 🎯 MVP

**Goal**: Login and the shared authenticated shell (header + bottom nav) reflect the new visual
identity, with the header/nav visually identical across every tab.

**Independent Test**: Open the app unauthenticated (login screen) and compare it against the
approved mockup; after logging in, switch between Registrar/Consumir/Alertas and confirm the
header and bottom nav look and behave identically in all three, without needing any of those
tabs' own content restyled yet (spec Independent Test, User Story 1).

### Implementation for User Story 1

- [X] T009 [P] [US1] Restyle `src/features/auth/LoginForm.tsx` using `IconField` (with `Mail`/
      `Lock` icons) and `TouchButton`, keeping the exact existing labels ("Correo", "Contraseña"),
      button text ("Ingresar"/"Ingresando…"), and `role="alert"` error rendering unchanged, with
      that error state also wrapped in the new visual treatment (not just its unchanged text)
      (FR-001, FR-002, FR-007, FR-008) (depends on T004, T005, T006)
- [X] T010 [P] [US1] Create `src/app/AppHeader.tsx`: `Tooth`-icon logo mark, "Gabinete" pill, a
      binary connection indicator reading the *existing* `useAppStore().isBackendConnected` flag
      (not a pending-operations counter — spec Clarifications excludes that), and an
      avatar-initials chip derived from `useAuthStore`'s `usuario.nombre` (FR-004,
      contracts/design-system.md) (depends on T004)
- [X] T011 [P] [US1] Create `src/app/BottomNav.tsx`: presentational 3-tab component
      (`active: 'registro' | 'consumo' | 'alertas'`, `onChange`) using the `Package`/
      `PackageMinus`/`Bell` icons, each tab meeting the ≥48px touch target (FR-003, FR-004)
      (depends on T004)
- [X] T012 [US1] Wire `AppHeader`/`BottomNav` into `src/app/App.tsx`, replacing the current inline
      header/tab-button markup, keeping the existing `vista` state and tab labels
      ("Registrar"/"Consumir"/"Alertas") unchanged (FR-002, FR-004) (depends on T010, T011)

**Checkpoint**: User Story 1 is fully functional and independently testable — login and the
shared shell reflect the new identity end-to-end.

---

## Phase 4: User Story 2 - Registrar y consumir con una interfaz clara (Priority: P2)

**Goal**: The two highest-frequency daily screens (Registrar, Consumir) get the new visual system,
with zero change to any existing field, validation, or message.

**Independent Test**: Complete a lote registration and an insumo consumption end to end with the
restyled UI, confirming every step (search, lot selection, validation, confirmation, error
messages) behaves exactly as before the redesign (spec Independent Test, User Story 2).

### Implementation for User Story 2

- [X] T013 [P] [US2] Restyle `src/features/insumos/components/SearchPicker.tsx`: search input via
      `IconField` + `Search` icon, category pills, quick-select rows via `Card`, keeping the
      label "Buscar insumo" and all existing search/create-inline behavior unchanged, including
      the "sin coincidencias" empty state restyled with the same `Card`/typography treatment,
      not just its unchanged text (FR-002, FR-007, FR-008) (depends on T004, T006, T007)
- [X] T014 [P] [US2] Restyle `src/features/insumos/components/ScanButton.tsx` as a secondary
      `TouchButton` with the `Scan` icon, keeping it a manual, explicit, never-automatic action
      (Constitution V, FR-002) (depends on T004, T005)
- [X] T015 [US2] Restyle `src/features/insumos/components/RegistroForm.tsx`: fields via
      `IconField` (`Hash` número de lote, `Calendar` fecha de caducidad, `Truck` proveedor), a
      quantity stepper, and a primary `TouchButton` submit — keeping every existing label,
      validation, and success-message text unchanged, with the `role="status"` success message
      also wrapped in the new visual treatment, not just its unchanged text (FR-002, FR-007,
      FR-008) (depends on T005, T006, T007, T013, T014)
- [X] T016 [US2] Extract the UTC-safe day-difference helper (`diasEntre`) from
      `src/features/alertas/lib/caducidad.ts` into a new shared `src/lib/dateMath.ts`, re-import
      it in `caducidad.ts` unchanged, and use it in `RegistroForm.tsx` to show "vida útil
      restante estimada" (in months) under the fecha de caducidad field, only for insumos with
      `caduca: true` (FR-002a, data-model.md) (depends on T015)
- [X] T017 [P] [US2] Restyle `src/features/insumos/components/ConsumoForm.tsx`: insumo `Card`, a
      FEFO lote card with a `Badge` (variant `neutral`, text "Recomendado FEFO"), a quantity
      stepper, and the existing overconsumption `role="alert"` message unchanged — including the
      "No hay lotes disponibles" empty state, restyled with the same `Card`/typography treatment,
      not just its unchanged text (FR-002, FR-007, FR-008) (depends on T005, T006, T007, T008)

**Checkpoint**: User Stories 1 AND 2 both work independently — daily-use flows restyled with zero
behavior change.

---

## Phase 5: User Story 3 - Distinguir la urgencia de una alerta de un vistazo (Priority: P3)

**Goal**: Every alert state on the Alertas screen (stock bajo, three niveles de aviso, caducado,
en revisión) is distinguishable by color/indicator, with role-gated controls unchanged.

**Independent Test**: Open Alertas with example data covering all six states as both
`administrador` and `personal`, confirming each state is visually distinguishable without reading
its text, and that admin-only controls remain hidden for `personal` (spec Independent Test, User
Story 3).

### Implementation for User Story 3

- [X] T018 [US3] Restyle `src/features/alertas/components/AlertasView.tsx`'s stock-bajo section
      using `Card` + `Badge` (variant `danger`), restyling the existing empty-state message with
      the same `Card`/typography treatment as the populated list (its text stays unchanged), and
      keeping the admin-only stock-mínimo input's behavior unchanged (FR-002, FR-005, FR-006,
      FR-008) (depends on T007, T008)
- [X] T019 [US3] Restyle `AlertasView.tsx`'s caducidad section, mapping each computed `nivel`
      (`30`/`7`/`1`/`'caducado'`) to its matching `Badge` variant (`warning-30`/`urgent-7`/
      `urgent-1`/`danger`) per contracts/design-system.md, and restyling its own empty-state
      message with the same `Card`/typography treatment (text unchanged) (FR-005, FR-008)
      (depends on T007, T008, same file as T018)
- [X] T020 [US3] Restyle `AlertasView.tsx`'s revisión section (including its own empty-state
      message, restyled with the same treatment, text unchanged) and the admin-only
      niveles-de-aviso config panel, keeping the `usuario.rol === 'administrador'` gate and the
      "Marcar como resuelto" button's behavior unchanged (FR-002, FR-006, FR-008) (depends on
      T007, T008, same file as T018/T019)

**Checkpoint**: All three user stories are independently functional and visually consistent.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Extend the new identity to the PWA install experience and validate the full feature.

- [X] T021 [P] Replace `public/favicon.svg` with a `Tooth`-mark SVG using the new primary teal
      (research.md's PWA identity decision)
- [X] T022 [P] Regenerate `public/icons/icon-192.png`/`icon-512.png` with the same mark, and
      update `vite.config.ts`'s `VitePWA` manifest `theme_color`/`background_color` to
      `#0E5C73`/`#F5F8FA`
- [X] T023 Run `npm run lint`, `npm run test`, and `npm run build`, confirming zero regressions
      and that no existing test assertion needed to change (SC-003) (depends on all prior tasks)
- [X] T024 Run `quickstart.md` Scenarios 1-5 end-to-end (visual consistency, behavior parity,
      alert distinguishability, touch targets, offline typography), and fix any gaps found
      (depends on T023)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational completion
  - US1, US2, US3 touch disjoint files (`App.tsx`/`AppHeader`/`BottomNav`/`LoginForm` vs.
    `SearchPicker`/`ScanButton`/`RegistroForm`/`ConsumoForm` vs. `AlertasView`) — they can proceed
    in parallel once Foundational is done, though US1's shell should land first since it's the
    MVP and the most visible screen
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on US2/US3 — the MVP
- **User Story 2 (P2)**: Independent of US1/US3 at the file level (different components); listed
  second only because it's the higher-priority daily-use flow
- **User Story 3 (P3)**: Independent of US1/US2 at the file level (`AlertasView.tsx` only)

### Parallel Opportunities

- T001, T002 (Setup) — different concerns (dependency install vs. directories)
- T003, T004, T005, T006, T007, T008 (Foundational) — six different files, once T001/T002 land
- T009, T010, T011 (US1) — three different files
- T013, T014, T017 (US2) — three different files, independent of T015/T016
- T021, T022 (Polish) — different files
- Once Foundational is done, US1/US2/US3 phases themselves can proceed in parallel (different
  component files) if staffed

---

## Parallel Example: Foundational Phase

```bash
# After T001/T002 complete, launch these together (different files):
Task: "Add @theme token block to src/styles/index.css"
Task: "Create icon set in src/components/icons/index.tsx"
Task: "Create TouchButton.tsx, IconField.tsx, Card.tsx, Badge.tsx in src/components/ui/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1, and `npm run test` to confirm zero
   regressions
5. This is the MVP — login and the shared shell reflect the new identity

### Incremental Delivery

1. Setup + Foundational → design system ready
2. User Story 1 → validate with quickstart Scenario 1 (MVP)
3. User Story 2 → validate with quickstart Scenario 2 (behavior parity)
4. User Story 3 → validate with quickstart Scenario 3 (alert distinguishability)
5. Polish → validate quickstart Scenarios 4-6 (touch targets, offline typography, quality gate)

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Run `npm run test` after every restyle task, not just at Polish — a broken existing assertion
  means a label/text/role changed and must be reverted, per SC-003
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
