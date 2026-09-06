# Quickstart Validation: Configuración Inicial del Proyecto y Entorno de Desarrollo Local

Purpose: a runnable script a developer (or reviewer) can follow to prove this feature works
end-to-end, mapped to the spec's user stories and success criteria. This is a validation guide,
not implementation — task breakdown and actual code live in `tasks.md` and the implementation
phase.

## Prerequisites

- Node.js ≥20 (LTS) and npm installed (see research.md).
- A cloud-hosted Supabase project's URL + anon key for development (team-shared or personal free
  tier) — only needed to validate User Story 2; User Story 1 must pass without it.

## Scenario 1 — Cold start with no backend configured (validates User Story 1, FR-001/002/004, SC-001)

1. Clone the repository into a clean directory.
2. Follow only the documented steps in the README to install dependencies and start the local dev
   server — one command per step.
3. Open the app in a browser.

**Expected outcome**: the app loads and is navigable, with no `.env` file present, in well under
15 minutes from clone. No unhandled crash or blank screen.

## Scenario 2 — Missing/invalid environment configuration (validates FR-004, FR-005, spec Edge Cases)

1. With the dev server running and no Supabase credentials configured, observe the app state.
2. Copy `.env.example` to `.env` and enter an intentionally invalid value for
   `VITE_SUPABASE_URL`.
3. Restart the dev server.

**Expected outcome**: in step 1, the app remains navigable in local/offline mode (no hard
failure). In step 3, a specific, readable error identifies the invalid/missing variable — not a
silent failure or a cryptic stack trace.

## Scenario 3 — Connecting to a development Supabase project (validates User Story 2, FR-003, FR-009)

1. Create (or reuse) a cloud-hosted Supabase development project.
2. Copy `.env.example` to `.env` and fill in the real `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` for that project.
3. Restart the dev server and confirm the app connects successfully.
4. Run `git status` and confirm `.env` does **not** appear as a trackable/staged change (FR-009).

**Expected outcome**: successful connection with no manual code changes beyond editing `.env`;
`.env` stays untracked per `.gitignore`.

## Scenario 4 — Quality verification commands (validates User Story 3, FR-006)

1. From a working local environment (Scenario 1), run the documented lint command.
2. Run the documented test command.
3. Run the documented build command.

**Expected outcome**: each command produces an explicit success/failure result (non-zero exit
code and readable output on failure) — no command hangs or fails silently.

## Scenario 5 — Manual environment verification checklist (validates FR-008, SC-003)

Follow the documented manual checklist (README) and confirm each item is checkable purely by
looking at the running app/terminal (e.g., "app loads in the browser", "no errors in the browser
console", "dev server terminal shows no error output") in under 2 minutes, with no script to run.

## Traceability

| Scenario | Spec references |
|---|---|
| 1 | User Story 1, FR-001, FR-002, FR-004, SC-001 |
| 2 | FR-004, FR-005, Edge Cases |
| 3 | User Story 2, FR-003, FR-009 |
| 4 | User Story 3, FR-006 |
| 5 | FR-008, SC-003 |
