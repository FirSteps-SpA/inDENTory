---

description: "Task list template for feature implementation"
---

# Tasks: Inicio de Sesión de Personal Clínico

**Input**: Design documents from `/specs/003-login-personal-clinico/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/supabase-schema.md,
quickstart.md

**Tests**: Not requested as TDD in the spec. plan.md's Technical Context does commit to a mocked
`@supabase/supabase-js` test strategy for login/logout/offline-continuity, so lightweight
verification tests are included per story (written alongside the implementation, not
test-first).

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P3) to enable
independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Paths are relative to the repository root, per plan.md's Project Structure

## Phase 1: Setup

**Purpose**: Make room for this feature's files in the existing scaffold (feature 001).

- [X] T001 Create `src/features/auth/` (replacing its `.gitkeep`) and `tests/unit/auth/`
      directories per plan.md Project Structure

**Checkpoint**: Directories exist; no new dependencies required (plan.md — stack unchanged).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The local cache, remote table, and state store every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Add the `usuarioActual` singleton table to the Dexie schema (`db.version(1).stores({
      usuarioActual: 'id' })` — feature 001 never called `.version()`, so this is the first real
      schema version) and its `UsuarioActual` type in `src/lib/db/index.ts` (data-model.md)
- [X] T003 Apply the `perfiles` table DDL and RLS policies from
      `specs/003-login-personal-clinico/contracts/supabase-schema.md` to the Supabase dev project
      (SQL editor), then create one test `auth.users` + `perfiles` row per role
      (`administrador`, `personal`) for later manual/quickstart verification — done by user;
      verified table + RLS live (anon read returns empty, not 404)
- [X] T004 [P] Implement `fetchPerfilPropio(client)` in `src/lib/supabase/perfiles.ts`: queries the
      caller's own `perfiles` row (`id = auth.uid()`) via the existing Supabase client from
      `src/lib/supabase/index.ts` (contracts/supabase-schema.md)
- [X] T005 Create `src/stores/authStore.ts` (Zustand, per Constitution II): state
      `{ usuario: UsuarioActual | null, isReady: boolean }` and actions `hydrate()` (reads
      `usuarioActual` from Dexie, sets `isReady: true`), `login(usuario)` (writes Dexie +
      updates state), `logout()` (clears Dexie row + resets state) (depends on T002)

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Inicio de sesión con conexión disponible (Priority: P1) 🎯 MVP

**Goal**: A clinical staff member enters email/password on a connected device and reaches the
authenticated app shell, with their identity available for attribution.

**Independent Test**: Enter valid credentials for an existing account with the device online;
verify the session starts and the authenticated user's name is shown (spec Acceptance Scenario 1).

### Implementation for User Story 1

- [X] T006 [P] [US1] Create `LoginForm.tsx` in `src/features/auth/LoginForm.tsx`: email/password
      fields + submit button, all meeting the ≥48x48px touch-target convention from feature 001
      (FR-007)
- [X] T007 [US1] Implement `useLogin.ts` in `src/features/auth/useLogin.ts`: calls
      `supabase.auth.signInWithPassword`, on success calls `fetchPerfilPropio` (T004) and
      `authStore.login(...)` (T005) to persist `UsuarioActual`; on any failure, surfaces one
      generic error message ("Correo o contraseña incorrectos") regardless of cause (FR-001,
      FR-005, research.md) (depends on T004, T005)
- [X] T008 [US1] Wire `useLogin` into `LoginForm.tsx`: submit handler, disabled/loading state
      while pending, renders the generic error message on failure (depends on T006, T007, same
      files)
- [X] T009 [US1] Add the boot/route guard in `src/app/App.tsx`: call `authStore.hydrate()` once on
      mount, render `LoginForm` while `usuario` is null, render the existing app shell (with the
      authenticated user's `nombre` visible) once `usuario` is set (FR-001, Acceptance Scenario 1)
      (depends on T005, T006)
- [X] T010 [P] [US1] Unit test in `tests/unit/auth/useLogin.test.ts` with a mocked
      `@supabase/supabase-js` client: successful login persists `UsuarioActual` and updates
      `authStore`; a failed login (wrong password) shows the single generic message and never
      reveals whether the email exists (FR-005)

**Checkpoint**: At this point, User Story 1 is fully functional and independently testable —
login with connectivity works end-to-end.

---

## Phase 4: User Story 2 - Continuidad de sesión sin conexión (Priority: P2)

**Goal**: A staff member who already logged in once on a device can reopen the app fully offline
and keep operating the inventory with correct identity attribution.

**Independent Test**: After completing User Story 1 once, disconnect the network and reopen the
app; verify it opens directly into the inventory with no re-authentication prompt (spec Acceptance
Scenario 1 of US2).

### Implementation for User Story 2

- [X] T011 [US2] Harden the boot guard in `src/app/App.tsx` (T009) so `authStore.hydrate()` reads
      only from Dexie and never calls or awaits any Supabase network method (e.g.
      `getSession()`/`getUser()`) before deciding login-vs-app-shell (FR-002, FR-006, FR-010,
      research.md's offline-durable session decision) (depends on T009, same file) — built
      correctly into T009/T005 from the start; verified by T013
- [X] T012 [US2] Expose a stable accessor for the attributed user id (e.g.
      `useAuthStore.getState().usuario?.id`) from `src/stores/authStore.ts`, documented with a
      one-line comment as the id future inventory features (002) must use for
      `Movimiento.usuarioId` (FR-003) (depends on T005) — `getUsuarioActualId()` in
      `src/stores/authStore.ts`
- [X] T013 [P] [US2] Unit test in `tests/unit/auth/offline-continuity.test.tsx`: with a
      pre-populated `usuarioActual` Dexie row and a Supabase client mock that rejects/times out on
      every network call, mounting `App` renders the app shell (not the login form) and never
      invokes `signInWithPassword` (FR-002, FR-006, FR-010)

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently — offline reopen
never blocks on the network.

---

## Phase 5: User Story 3 - Cierre de sesión (Priority: P3)

**Goal**: A staff member can explicitly end their session, online or offline, so the next person
using a shared device doesn't continue operating under their identity.

**Independent Test**: With a session active, trigger logout; verify the app returns to the login
screen and inventory actions are blocked until re-authentication (spec Acceptance Scenario 1 of
US3). Repeat with the device offline (Acceptance Scenario 2 of US3).

### Implementation for User Story 3

- [X] T014 [US3] Implement `useLogout.ts` in `src/features/auth/useLogout.ts`: calls
      `supabase.auth.signOut({ scope: 'local' })` (never awaited/blocked by network per
      research.md), then clears the `usuarioActual` Dexie row and calls `authStore.logout()`
      (FR-004) (depends on T005)
- [X] T015 [US3] Add a "Cerrar sesión" control (≥48x48px touch target) to the authenticated app
      shell in `src/app/App.tsx`, wired to `useLogout` (depends on T009, T014)
- [X] T016 [P] [US3] Unit test in `tests/unit/auth/useLogout.test.ts`: logout clears
      `usuarioActual` and resets `authStore` even when the mocked `signOut` call rejects/never
      resolves (simulating no connectivity) (FR-004, Edge Cases)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the full feature end-to-end and close documentation gaps.

- [X] T017 [P] Add a README "Cuentas de personal clínico (desarrollo)" section documenting how to
      create test `auth.users` + `perfiles` rows in the Supabase dev project dashboard (no
      in-app provisioning UI exists — spec Assumptions, FR-009)
- [X] T018 Run `quickstart.md` Scenarios 1–5 end-to-end against a Supabase dev project with the
      two test accounts from T003, and fix any gaps found (depends on all prior tasks) — run
      manually by user against real accounts; all 5 scenarios pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational completion
  - US2 and US3 both extend files US1 creates (`App.tsx`, `authStore.ts`), so within this
    feature they are best done in priority order (P1 → P2 → P3) rather than fully in parallel
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on US2/US3 — the MVP; must work standalone with
  connectivity
- **User Story 2 (P2)**: Extends US1's boot guard (`App.tsx`) and `authStore`; requires US1's
  login flow to exist so there is a session to reopen offline
- **User Story 3 (P3)**: Extends US1's app shell (`App.tsx`) and `authStore`; requires US1's login
  flow to exist so there is a session to close

### Parallel Opportunities

- T004 (Foundational) — different file from T002/T003/T005
- T006 and T010 (US1) — different files from each other and from T007/T008/T009
- T013 (US2) — different file from T011/T012
- T016 (US3) — different file from T014/T015
- T017 (Polish) — different file from T018

---

## Parallel Example: Foundational Phase

```bash
# After T001 completes, launch these together (different files):
Task: "Add usuarioActual singleton table to Dexie schema in src/lib/db/index.ts"
Task: "Implement fetchPerfilPropio in src/lib/supabase/perfiles.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 with a connected device
5. This is the MVP — clinical staff can log in and reach the inventory

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate with quickstart Scenario 1 (MVP)
3. User Story 2 → validate with quickstart Scenario 2 (offline reopen)
4. User Story 3 → validate with quickstart Scenario 3 (logout online/offline)
5. Polish → validate quickstart Scenarios 4–5 and the full flow end-to-end

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
