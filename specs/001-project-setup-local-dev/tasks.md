---

description: "Task list template for feature implementation"
---

# Tasks: Configuración Inicial del Proyecto y Entorno de Desarrollo Local

**Input**: Design documents from `/specs/001-project-setup-local-dev/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (no `contracts/` —
this feature exposes no API/service surface, per plan.md)

**Tests**: Not requested as TDD for domain logic in the spec (this feature has no domain logic).
The test *tooling* itself (Vitest) is required by FR-006 and is scaffolded in Setup; a minimal
smoke test proves the `test` command works end-to-end.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P3) to enable
independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Paths are relative to the repository root, per plan.md's Project Structure

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Bring the empty repository up to a running Vite + React + TypeScript project.

- [X] T001 Initialize the Vite + React + TypeScript scaffold at the repository root
      (`package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`,
      `src/app/App.tsx`) per plan.md Technical Context
- [X] T002 Reorganize/create the planned directory structure: `public/`, `src/{app,components,
      features,stores,lib/db,lib/supabase,styles}`, `tests/{unit,integration}` per plan.md
      Project Structure (depends on T001)
- [X] T003 [P] Configure ESLint (flat config, React + hooks plugins) and Prettier; add `lint` and
      `format` scripts to `package.json`
- [X] T004 [P] Configure Vitest + React Testing Library (jsdom environment); add a `test` script
      to `package.json` and a minimal smoke test in `tests/unit/App.test.tsx` asserting the app
      shell renders

**Checkpoint**: Project installs and has working lint/test tooling wired up.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure every user story depends on — the mandated stack from the
constitution and plan.md.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Install and configure Tailwind CSS; define the ≥48x48px touch-target utility/spacing
      convention (Constitution III) in `tailwind.config.ts` and `src/styles/`
- [X] T006 [P] Install Zustand and create a base app-shell store in `src/stores/appStore.ts`
      (Constitution II — single reactive state source)
- [X] T007 [P] Install Dexie and create the IndexedDB client/schema stub in `src/lib/db/index.ts`
      (empty schema for now — domain tables are added by future inventory features)
- [X] T008 Configure `vite-plugin-pwa` in `vite.config.ts` (manifest + service worker
      registration) for installability and the future background-sync foundation (Constitution I)
- [X] T009 [P] Create `.env.example` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
      placeholders (no real secrets) and add the real `.env` to `.gitignore` (FR-003, FR-009)

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Puesta en marcha local desde cero (Priority: P1) 🎯 MVP

**Goal**: A developer clones the repo and, using only the written documentation, gets the app
running locally in the browser — even with no backend configured.

**Independent Test**: Clone into a clean directory, follow only the README steps, confirm the
app loads in a browser within the SC-001 time budget (<15 min).

### Implementation for User Story 1

- [X] T010 [US1] Add `dev` / `build` / `preview` scripts to `package.json` and confirm
      `npm install && npm run dev` serves the app locally (FR-001)
- [X] T011 [P] [US1] Document minimum required tool versions (Node.js ≥20 LTS, npm) in a
      README "Requisitos" section (FR-002)
- [X] T012 [US1] Write a README "Puesta en marcha" section documenting clone → install → run as
      one command per step, linked from the repository root (FR-001, FR-007) (depends on T011,
      same file)
- [X] T013 [P] [US1] Implement the minimal app shell in `src/app/App.tsx` so it renders
      successfully with no `.env` present and with no unhandled error, confirming the FR-004
      degrade-to-local-mode behavior — no visual indicator is required; the acceptance bar is
      the absence of a crash or blank screen
- [X] T014 [US1] Add an `engines` field (or equivalent documented check) to `package.json` so a
      Node/npm version mismatch is surfaced explicitly instead of failing ambiguously (Edge Case,
      FR-002) (depends on T010, same file)

**Checkpoint**: User Story 1 is fully functional and independently testable — app runs locally
from a clean clone with no backend configured.

---

## Phase 4: User Story 2 - Configuración de acceso al backend para desarrollo (Priority: P2)

**Goal**: A developer connects their local environment to a cloud-hosted Supabase development
project using their own credentials, without touching production credentials.

**Independent Test**: Copy `.env.example` → `.env`, fill in a dev Supabase project's credentials,
confirm the app connects and reads/writes test data; then remove/break a variable and confirm an
explicit, specific error appears instead of a silent failure.

### Implementation for User Story 2

- [X] T015 [US2] Implement Supabase client initialization in `src/lib/supabase/index.ts` that
      validates `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and reports a specific, readable
      error naming the missing/invalid variable (FR-005), while still letting the app shell
      render (FR-004)
- [X] T016 [US2] Wire the Supabase client into the app shell/store so a successful connection is
      observably confirmed (e.g., a dev-only connection-status indicator) (depends on T015)
- [X] T017 [P] [US2] Write a README "Configurar backend de desarrollo" section: how to obtain or
      create a cloud-hosted Supabase dev project and fill `.env` from `.env.example` (FR-003)
- [X] T018 [US2] Document the credential-safety convention (`.env` is git-ignored; never commit
      real keys) in the README/CONTRIBUTING docs (FR-009) (depends on T017, same file)

**Checkpoint**: User Stories 1 and 2 both work independently — local dev can run with or without
a configured backend, and connecting to a real dev project works with clear error feedback when
misconfigured.

---

## Phase 5: User Story 3 - Verificación de calidad antes de contribuir (Priority: P3)

**Goal**: A new contributor runs the project's standard quality checks (lint, test, build)
locally before proposing a change.

**Independent Test**: On a clean clone with the environment already set up (US1), run each
documented command and confirm each produces an explicit success/failure result.

### Implementation for User Story 3

- [X] T019 [P] [US3] Verify/finalize the single-command `lint`, `test`, and `build` scripts in
      `package.json` each produce an explicit non-zero exit code and readable output on failure
      (FR-006)
- [X] T020 [US3] Write a README "Verificaciones de calidad" section documenting the three
      one-step commands (FR-006, FR-007)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Tie the onboarding experience together and validate it end-to-end.

- [X] T021 [P] Write the manual environment-verification checklist (FR-008) in the
      README/CONTRIBUTING docs — checkable purely by looking at the running app/terminal, in
      under 2 minutes, with no script to run (SC-003)
- [X] T022 [P] Add PWA icons and manifest metadata under `public/` so the app is installable
      (completes the `vite-plugin-pwa` scaffold from T008)
- [X] T023 Run `quickstart.md` Scenarios 1–5 end-to-end on a clean clone and fix any gaps found
      (depends on all prior tasks)
- [X] T024 Consolidate the README sections added across T012/T017/T020/T021 into one coherent,
      root-discoverable onboarding flow (FR-007) (depends on T023)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational completion
  - Can proceed in parallel (if staffed) or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on US2/US3 — the MVP; must work standalone
- **User Story 2 (P2)**: Builds on the Supabase client stub from Foundational (T009); does not
  require US1's docs to function, but shares `package.json`/README files with it
- **User Story 3 (P3)**: Builds on the lint/test tooling from Setup (T003/T004); independent of
  US1/US2 behavior

### Parallel Opportunities

- T003 and T004 (Setup) — different files
- T006, T007, T009 (Foundational) — different files
- T011 and T013 (US1) — different files from each other and from T010
- T017 (US2) — different file from T015/T016
- T019 (US3) — different file from T020
- T021 and T022 (Polish) — different files

---

## Parallel Example: Foundational Phase

```bash
# After T001-T005 complete, launch these together (different files):
Task: "Install Zustand and create base app-shell store in src/stores/appStore.ts"
Task: "Install Dexie and create IndexedDB client/schema stub in src/lib/db/index.ts"
Task: "Create .env.example and update .gitignore to exclude real .env"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 on a clean clone
5. This is the MVP — a developer can clone and run the app locally

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate with quickstart Scenario 1 (MVP)
3. User Story 2 → validate with quickstart Scenarios 2–3
4. User Story 3 → validate with quickstart Scenario 4
5. Polish → validate quickstart Scenario 5 and the full flow end-to-end

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
