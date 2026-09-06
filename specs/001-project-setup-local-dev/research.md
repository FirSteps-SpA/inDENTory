# Phase 0 Research: Configuración Inicial del Proyecto y Entorno de Desarrollo Local

All Technical Context items were resolved without needing NEEDS CLARIFICATION markers — the
constitution already fixes the core stack (Vite, React, Tailwind, Zustand, IndexedDB, Supabase);
this research resolves the remaining implementation-agnostic choices needed to bootstrap it.

## Language & runtime

- **Decision**: TypeScript on Node.js ≥20 (LTS) for tooling/build.
- **Rationale**: The constitution mandates React + Vite but does not fix a language. TypeScript
  catches integration errors across Zustand stores, the Dexie/IndexedDB schema, and the Supabase
  client early — valuable given the multi-user, offline-sync nature of the eventual domain (batch
  traceability, expiry alerts). Node ≥20 LTS is required by current Vite major versions and is
  widely available on developer machines and CI images.
- **Alternatives considered**: Plain JavaScript — rejected; loses type safety across the
  IndexedDB↔Supabase sync boundary that later features (batch traceability, multi-user
  attribution) depend on, increasing rework risk for a marginal onboarding-speed gain that
  TypeScript's Vite integration does not meaningfully cost.

## Package manager

- **Decision**: npm (with the repository's committed lockfile).
- **Rationale**: Ships with Node, needs no extra install step, keeping first-run friction minimal
  in service of spec SC-001 (<15 min clone-to-running).
- **Alternatives considered**: pnpm/yarn — faster installs and better monorepo ergonomics, but add
  an install step for every new contributor with no corresponding requirement in the spec
  (single project, no monorepo). Rejected for this feature; revisit if the project grows into a
  monorepo.

## Local persistence layer (IndexedDB wrapper)

- **Decision**: Dexie.js.
- **Rationale**: The constitution's Principle IV (batch traceability, expiry and low-stock
  alerts) will need indexed range queries (e.g., "lotes con fecha de caducidad antes de X",
  "insumos bajo stock mínimo") computed locally and offline. Dexie provides ergonomic indexed
  queries and schema versioning on top of raw IndexedDB, which the raw API and thinner wrappers
  do not.
- **Alternatives considered**: Raw IndexedDB API — rejected, too verbose/error-prone for the
  range-query needs of Principle IV. `idb` (thin promise wrapper) — rejected for this project
  specifically because it stays close to the raw cursor/range API, pushing query-building
  complexity into every future feature instead of a shared schema layer.

## PWA / offline scaffold

- **Decision**: `vite-plugin-pwa` (Workbox-based) for manifest generation and service-worker
  registration.
- **Rationale**: Standard, well-maintained Vite integration for installability and the
  service-worker foundation that Principle I's background sync will build on; avoids hand-rolling
  service-worker boilerplate for this bootstrap feature.
- **Alternatives considered**: Hand-written service worker — rejected as unnecessary upfront
  effort for a bootstrap feature; can still be swapped later if Workbox's opinions become
  limiting.

## Testing framework

- **Decision**: Vitest + React Testing Library, exposed as a single documented script (FR-006).
- **Rationale**: Native Vite integration (shared config/transform pipeline, fast watch mode) and
  the de facto standard for component testing in this ecosystem.
- **Alternatives considered**: Jest — mature but requires extra configuration to work with Vite's
  transform pipeline for no added benefit here.

## Linting/formatting

- **Decision**: ESLint (flat config, React + hooks plugins) + Prettier, each exposed as a single
  documented script.
- **Rationale**: Satisfies FR-006's "orden de código" verification step with the standard tools
  for this stack.
- **Alternatives considered**: Biome — a single faster tool covering both concerns, but less
  battle-tested React-specific rule coverage at this stack's typical maturity level; rejected to
  avoid trading rule coverage for speed on a feature not concerned with build performance.

## Barcode / DataMatrix scanning library

- **Decision**: Deferred — not selected or installed by this feature.
- **Rationale**: Per spec Assumptions, this feature only bootstraps the mandated stack; the
  scanning channel is Principle V's concern and belongs to the future feature that implements the
  manual-search-first / scan-as-secondary-channel flow. Selecting a library now, with no form to
  attach it to, risks a choice made without the actual integration constraints (e.g., which
  formats, which camera permission UX) that feature will surface.
- **Alternatives considered**: N/A — deferred rather than chosen.

## Supabase dev connectivity

- **Decision**: `@supabase/supabase-js` client initialized from environment variables
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) pointing at a cloud-hosted Supabase project, per
  spec Clarifications (Session 2026-09-05, Q1).
- **Rationale**: Matches the clarified decision directly; no self-hosted/Docker path is
  documented or supported.
- **Alternatives considered**: Already resolved in spec Clarifications — not re-litigated here.
