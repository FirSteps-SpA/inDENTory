# Phase 0 Research: Alertas de Caducidad y Stock Mínimo

No open `NEEDS CLARIFICATION` markers remain in the Technical Context (the spec's own
clarification session already resolved the three highest-impact ambiguities — global vs.
per-insumo caducidad window, alert visibility by role, dedicated screen vs. inline badges). The
decisions below cover the remaining implementation-shape questions needed before Phase 1 design.

## Where the global caducidad-warning config lives

- **Decision**: A single new Dexie table, `configuracionAlertas`, holding exactly one row (fixed
  id `'global'`) with a `nivelesAvisoDias: number[]` field, mirrored by a single-row Supabase
  table `configuracion_alertas`.
- **Rationale**: The spec's Clarifications explicitly rule out per-insumo configuration — a
  single global row is the direct, simplest representation, and matches the project's existing
  pattern of one Dexie table per persisted concern (`usuarioActual`, `insumos`, `lotes`,
  `movimientos`).
- **Alternatives considered**: A generic key/value `configuracion` table designed to hold
  arbitrary future settings — rejected as premature generalization; nothing in this spec or the
  prior three specs asks for another global setting yet, so a table shaped for exactly this one
  value is simpler to reason about and can be revisited if a second setting appears later.
  Storing the levels in `localStorage` — rejected, it wouldn't sync across devices/staff, which
  violates the multi-user expectation already established by Constitution Principle VI (an
  administrador configuring this from one device must have it apply for every device).

## Extending `inventoryStore` vs. a separate alerts data store

- **Decision**: Add a `movimientos` `liveQuery` subscription to the existing `inventoryStore`
  (`src/stores/inventoryStore.ts`), alongside its current `insumos`/`lotes` subscriptions, rather
  than creating a second store that re-subscribes to the same Dexie tables.
- **Rationale**: Feature 002's forms already read `movimientos` per-lote imperatively (one-off
  `db.movimientos.where(...).toArray()` calls) because they only need a snapshot at
  submit-time. Alerts are different: they must stay reactively up to date on screen (FR-011), so
  they need the same live subscription pattern `inventoryStore` already uses for `insumos`/
  `lotes`. Subscribing to the same table twice (once per store) would duplicate Dexie
  `liveQuery` overhead and risk the two stores drifting out of sync.
- **Alternatives considered**: A dedicated `alertasDataStore` duplicating its own
  `insumos`/`lotes`/`movimientos` subscriptions — rejected for the duplication reason above. Kept
  `alertasStore` itself limited to `configuracionAlertas`, since that table is genuinely
  alerts-specific and unrelated to what `inventoryStore` already owns.

## Alert calculators as pure functions

- **Decision**: Three pure functions, one per alert type, in `src/features/alertas/lib/`:
  `computeInsumosStockBajo(insumos, lotes, movimientos)`, `computeAlertasCaducidad(lotes,
  movimientos, nivelesAvisoDias, hoy)`, and `lotesEnRevision(lotes)`. `AlertasView` calls all
  three with data read from the stores and renders the results; none of the three touch Dexie or
  React directly.
- **Rationale**: Matches the precedent feature 002 already set with `selectFefoLot` and
  `computeStockLote` — pure calculators are unit-testable without rendering, and reusable if a
  future feature needs the same logic (e.g., a dashboard summary badge count).
- **Alternatives considered**: Computing alerts inline inside `AlertasView` — rejected, harder to
  unit test in isolation and inconsistent with the established pattern.

## Urgency-tier selection when multiple caducidad warning levels match

- **Decision**: For a lote with stock disponible and `diasRestantes = diferencia en días entre
  fechaCaducidad y hoy`: if `diasRestantes < 0`, the lote is `'caducado'`. Otherwise, among the
  configured `nivelesAvisoDias` that are `>= diasRestantes`, the applicable tier is the
  **smallest** one (the tightest bound the lote currently falls within) — e.g., with the default
  levels `[30, 7, 1]`, a lote with 5 días restantes matches tier `7` (not `30`), and a lote with 0
  días restantes matches tier `1`. A lote whose `diasRestantes` exceeds every configured level
  generates no alert yet.
- **Rationale**: Gives each lote exactly one, most-urgent applicable tier — needed for FR-007's
  "distinguish visually between urgency levels" without a lote appearing under multiple tiers
  simultaneously, and keeps the acceptance-scenario language ("el umbral más cercano que
  cumple") implementable as a single deterministic rule.
- **Alternatives considered**: Showing a lote under every level it satisfies (e.g., under both
  `30` and `7`) — rejected, produces duplicate/noisy entries in the same consolidated list for a
  single lote. Using the **largest** satisfying level instead — rejected, it would under-state
  urgency (a lote with 2 días left would show as merely "30 días" instead of the more urgent "7"
  or "1" tier).

## Role gating for admin-only actions

- **Decision**: Client-side conditional rendering/guards based on `useAuthStore`'s
  `usuario.rol === 'administrador'` (already exposed by feature 003), for both the configuration
  panel (stock mínimo, niveles de aviso) and the "marcar como resuelto" action on a lote en
  revisión. The new `configuracion_alertas` Supabase table adds a real row-level-security policy
  restricting `update` to rows where the caller's `perfiles.rol = 'administrador'` (cheap to add,
  since `perfiles` already exists from feature 003). `insumos.stock_minimo` writes are **not**
  additionally restricted at the Postgres level.
- **Rationale**: Feature 002 already leaves `insumos`/`lotes` writes unrestricted by role at the
  database level (Postgres RLS is not even enabled on those tables) — adding column-level
  Postgres privileges just for `stock_minimo` would introduce a new, inconsistent security
  pattern for one column in an otherwise-open table, disproportionate to this project's
  single-clinic trust model. `configuracion_alertas` is a brand-new table, so adding a real RLS
  check there costs nothing extra and directly matches spec FR-001/FR-005's "only an
  administrador configures this."
- **Alternatives considered**: Enforcing every admin-only rule via Postgres RLS/column
  privileges — rejected as disproportionate scope creep for this feature, and inconsistent with
  the DB-level openness feature 002 already established for the same `insumos` table.
