# Implementation Plan: Configuración Inicial del Proyecto y Entorno de Desarrollo Local

**Branch**: `001-project-setup-local-dev` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-project-setup-local-dev/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Bootstrap the empty `inDENTory` repository into a running PWA skeleton — the mandated Vite +
React + Tailwind + Zustand + IndexedDB + Supabase stack from the constitution — and document a
repeatable local-development flow (install → run → verify → connect to a cloud-hosted Supabase
dev project → lint/test/build). No inventory domain features are built here; this feature only
lays the scaffold and onboarding docs that all future features will build on.

## Technical Context

**Language/Version**: TypeScript (React 18+) on Node.js ≥20 (LTS)

**Primary Dependencies**: Vite, React, Tailwind CSS, Zustand, `@supabase/supabase-js`, Dexie.js
(IndexedDB wrapper), `vite-plugin-pwa` (manifest + service worker scaffold), ESLint + Prettier

**Storage**: IndexedDB (local, primary — via Dexie.js) with Supabase Postgres as the synced
relational backend (cloud-hosted dev project per spec Clarifications)

**Testing**: Vitest + React Testing Library (unit/component), run via a single documented script

**Target Platform**: Installable web PWA, primary use on mobile/tablet browsers (touch, gloved
use); developed and verified locally via desktop browser (with device emulation for touch/mobile)

**Project Type**: Single frontend web project (Supabase is the backend-as-a-service; no custom
backend service is authored by this project)

**Performance Goals**: Not applicable to this feature — this feature's targets are onboarding
speed (spec SC-001, SC-003), not application runtime performance; runtime performance goals
belong to future domain features

**Constraints**: No Docker/self-hosted backend requirement (spec Clarifications); real
credentials excluded from version control (FR-009); app must start and be navigable with no
Supabase credentials configured, degrading to local/offline mode (FR-004)

**Scale/Scope**: Single project bootstrap for the current small development team; no multi-service
or multi-repo scope

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This feature only bootstraps the project scaffold — no inventory domain behavior is implemented,
so principles about domain behavior are evaluated as **N/A (deferred)** rather than violated.

| Principle | Status | Notes |
|---|---|---|
| I. Offline-First por Diseño | PASS | Scaffold includes IndexedDB (Dexie) as the local data layer and `vite-plugin-pwa` for the service-worker/background-sync foundation future features will use; FR-004 requires the app to start/navigate with no backend configured. No inventory read/write logic exists yet to violate the principle. |
| II. Estado Reactivo Local con Zustand | PASS | Zustand is scaffolded as the only state layer from project init; no Redux/extra state libraries are introduced. |
| III. Interfaz Táctil para Entornos Clínicos | PASS | Tailwind setup includes a documented touch-target convention (≥48x48px utility/spacing) for all future interactive components; no screens exist yet to violate it. |
| IV. Trazabilidad y Alertas de Inventario | N/A (deferred) | No batch/lote or alert domain logic is built by this feature; the Dexie/IndexedDB choice is made with this principle's future query needs (expiry/stock range queries) in mind — see research.md. |
| V. Búsqueda Manual Ágil como Flujo Primario | N/A (deferred) | No search or camera-scan UI is built by this feature. Barcode/DataMatrix library selection is explicitly deferred (research.md) to the feature that implements this flow, so the camera is never wired into a form here. |
| VI. Control Multi-Usuario | N/A (deferred) | This feature only scaffolds the Supabase client for data connectivity (FR-003); no authentication/session/user-identity code is built here. Multi-user auth wiring belongs to the future feature that implements user-attributed inventory actions. |
| Pila Tecnológica Obligatoria | PASS | All choices in Technical Context match the mandated stack exactly; no substitutions. |

Result: **PASS** — no violations to justify in Complexity Tracking.

**Post-Phase 1 re-check**: research.md and data-model.md finalized the choices referenced above
(Dexie, `vite-plugin-pwa`, deferred scanning library). No new dependency or structural decision
introduces a stack substitution or a domain-principle violation — table above still holds.
Result: **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/001-project-setup-local-dev/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory is produced for this feature: it bootstraps a frontend project against
Supabase as an external backend-as-a-service — there is no API/service surface authored by this
project to contract-document. Future features that add inventory endpoints or shared schemas
should introduce `contracts/` themselves.

### Source Code (repository root)

```text
inDENTory/
├── public/                    # PWA icons, manifest source assets
├── src/
│   ├── app/                   # App shell, router, PWA/service-worker registration entry
│   ├── components/            # Shared touch-first UI components (≥48x48px targets)
│   ├── features/               # Placeholder for future domain features (inventory, batches, alerts)
│   ├── stores/                 # Zustand stores
│   ├── lib/
│   │   ├── db/                 # Dexie (IndexedDB) schema + client
│   │   └── supabase/           # Supabase client init + sync helpers
│   └── styles/                 # Tailwind entry/config-adjacent styles
├── tests/
│   ├── unit/
│   └── integration/
├── .env.example                # Committed template (no real credentials) — FR-003, FR-009
├── .gitignore                  # Excludes real .env — FR-009
├── vite.config.ts
├── tailwind.config.ts
└── package.json                 # dev/build/lint/test scripts — FR-001, FR-006
```

**Structure Decision**: Single frontend project at the repository root (no `backend/`/`frontend/`
split): Supabase is consumed as an external backend-as-a-service, so this project only ever
contains frontend/client code plus its local persistence layer. `src/features/` is created empty
(with a placeholder) as the landing spot for the inventory domain code that later feature specs
will add; this feature does not populate it.

## Complexity Tracking

*No Constitution Check violations — this section is not applicable.*
