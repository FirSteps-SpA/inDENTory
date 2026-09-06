# Implementation Plan: Inicio de Sesión de Personal Clínico

**Branch**: `003-login-personal-clinico` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-login-personal-clinico/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add email/password authentication for clinical staff via Supabase Auth, with two roles
(administrador, personal regular) stored in a new `perfiles` table. The app caches the
authenticated identity locally (Dexie) so it remains usable offline indefinitely after the first
successful login (spec FR-002/FR-006/FR-010), independent of Supabase's own token refresh cycle.
Logout is always available, online or offline, via `supabase.auth.signOut({ scope: 'local' })`.
No signup/invite UI is built — accounts are assumed pre-provisioned in Supabase (spec
Assumptions).

## Technical Context

**Language/Version**: TypeScript (React 19) on Node.js ≥20 (LTS) — same as project scaffold
(feature 001)

**Primary Dependencies**: `@supabase/supabase-js` (Auth: `signInWithPassword`, `signOut`), Dexie
(local session/profile cache), Zustand (auth state store), React (login screen + route guard)

**Storage**: Dexie/IndexedDB holds the locally-cached authenticated identity (`usuarioActual`:
id, email, nombre, rol) that gates offline app access (Constitution I, spec FR-002/FR-006/FR-010).
Supabase Auth's own access/refresh tokens use the `supabase-js` default storage — that token pair
is only consulted for background sync calls, never to decide whether the offline UI is usable.
Supabase Postgres adds one new table, `perfiles` (id → `auth.users.id`, `rol`), as the
source of truth for role assignment.

**Testing**: Vitest + React Testing Library (existing project setup), with a mocked
`@supabase/supabase-js` client for login/logout/offline-continuity scenarios

**Target Platform**: Same installable PWA target as the rest of the project (touch/mobile-first
browsers, gloved use per Principle III)

**Project Type**: Single frontend web project — no custom backend; Supabase remains the only
backend-as-a-service (consistent with feature 001's Structure Decision)

**Performance Goals**: Login-to-app-ready in under 15s with a stable connection (spec SC-001); no
new runtime performance target beyond that

**Constraints**: First login on a device requires connectivity (spec FR-006); every subsequent
app open on that device must work fully offline (Constitution I) using the cached local identity;
logout must never require network (spec FR-004, Edge Cases); no password-reset UI is built (spec
Assumptions — deferred to Supabase Auth's standard email flow, out of this feature's screens)

**Scale/Scope**: 3 user-facing screens/states (login form, authenticated app shell, logout
action) plus the `perfiles` table and its RLS policy; single-clinic scope, no multi-tenant
concerns (spec Assumptions)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Offline-First por Diseño | PASS | The locally-cached `usuarioActual` (Dexie) — not a live Supabase call — is what gates app access on every open after the first login, so offline use is never blocked by the network (FR-002, FR-006, FR-010). Logout uses `signOut({ scope: 'local' })` so it never depends on connectivity either (FR-004). |
| II. Estado Reactivo Local con Zustand | PASS | A new `authStore` (Zustand) is the single reactive source for "who is logged in / which role", reading its initial value from Dexie on boot — no additional state layer introduced. |
| III. Interfaz Táctil para Entornos Clínicos | PASS | Login form fields and button follow the same ≥48x48px touch-target convention established in feature 001 (spec FR-007). |
| IV. Trazabilidad y Alertas de Inventario | N/A (not touched) | This feature doesn't touch lote/movimiento data; it only supplies the `usuarioId` that feature 002's Movimiento records already reference. |
| V. Búsqueda Manual Ágil como Flujo Primario | N/A (not touched) | No search or scanning UI is part of login. |
| VI. Control Multi-Usuario | PASS | This feature is the direct implementation of Principle VI: Supabase-authenticated identity, captured locally so offline actions still carry correct attribution (spec FR-003), now extended with the two-role model from spec Clarifications. |
| Pila Tecnológica Obligatoria | PASS | Uses only the mandated stack (`@supabase/supabase-js`, Dexie, Zustand, React, Tailwind) — no new dependency added. |

Result: **PASS** — no violations to justify in Complexity Tracking.

**Post-Phase 1 re-check**: research.md and data-model.md confirm the `usuarioActual` local-cache
design and the `perfiles` table/RLS shape referenced above; no new dependency or structural
decision changes this table. Result: **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/003-login-personal-clinico/
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
│   │   └── App.tsx                 # Adds route guard: login screen vs app shell based on authStore
│   ├── features/
│   │   └── auth/
│   │       ├── LoginForm.tsx       # Email/password form, ≥48x48px targets (FR-007)
│   │       ├── useLogin.ts         # Calls supabase.auth.signInWithPassword, writes usuarioActual to Dexie
│   │       └── useLogout.ts        # Calls supabase.auth.signOut({ scope: 'local' }), clears Dexie + authStore
│   ├── stores/
│   │   └── authStore.ts            # Zustand: usuarioActual (id, email, nombre, rol) + isReady flag
│   └── lib/
│       └── db/
│           └── index.ts            # Adds `usuarioActual` Dexie table (existing file, extended)
└── tests/
    └── unit/
        └── auth/                    # Login/logout/offline-continuity unit tests (mocked supabase-js)
```

**Structure Decision**: Extends the existing single-frontend structure from feature 001 — no new
top-level directories. Auth-specific UI/hooks live in `src/features/auth/` (the placeholder
`src/features/` directory from 001), state in `src/stores/authStore.ts` alongside the existing
`appStore.ts`, and the local session cache is one more Dexie table in the existing
`src/lib/db/index.ts`. No `backend/` is introduced: the new `perfiles` table lives in Supabase
Postgres, documented as an external contract in `contracts/supabase-schema.md`, matching the
pattern feature 002 already established for `insumos`/`lotes`/`movimientos`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
