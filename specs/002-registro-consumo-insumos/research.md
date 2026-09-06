# Phase 0 Research: Registro y Consumo de Insumos con Búsqueda Manual y Escaneo Opcional

## Barcode / DataMatrix scanning library

- **Decision**: `@zxing/browser` (built on `@zxing/library`).
- **Rationale**: Feature 001's research.md deferred this exact choice to "the feature that
  implements this flow" — this is that feature. The constitution requires *both* 1D barcode and
  DataMatrix decoding (DataMatrix/GS1 DataMatrix is the standard UDI marking format on many
  medical/dental supply units, so it's not optional). `@zxing/library`'s core includes a
  `DataMatrixReader` alongside its 1D barcode readers, and `@zxing/browser` wraps camera-stream
  capture (`getUserMedia`) and continuous decode into a small, well-maintained API
  (`BrowserMultiFormatReader`), which removes the need to hand-roll camera-permission and
  video-frame handling for a single-scan, user-initiated interaction (FR-008).
- **Alternatives considered**: `zxing-wasm` (the WASM port of zxing-cpp) — faster decode, but no
  built-in camera-stream wrapper, so it would require hand-rolling `getUserMedia`/canvas capture
  for no real benefit here (a user-initiated single scan, not continuous high-throughput video
  processing). `html5-qrcode`/`quagga2` — rejected, neither has solid DataMatrix support. A
  commercial SDK (e.g., Dynamsoft) — rejected, licensing cost not justified for a first
  implementation.

## Authenticated user identity (dependency, not a library choice)

- **Decision**: This feature does **not** build sign-in UI. It requires *some* authenticated
  Supabase user to exist so FR-005/FR-013 can attribute movements — the plan's Constitution Check
  flags this as an external dependency. Recommendation: specify and implement a dedicated
  "inicio de sesión de personal clínico" feature (its own UX decisions — session persistence
  offline, shared-tablet quick-switch between staff, etc. — deserve their own spec, not a
  two-line stub).
- **Rationale**: Login/session UX has real product decisions of its own (per constitution's
  clinical/offline context) that don't belong bundled invisibly into an inventory feature's plan.
  Silently building full auth here would be undisciplined scope creep in the other direction from
  the `/speckit-analyze` finding on feature 001 (which corrected an *overclaimed* auth checkbox).
- **How this plan stays unblocked**: tasks/tests for this feature use a Supabase user created
  directly in the dev project's dashboard (or via the Supabase Admin API in a test setup script),
  read through `supabase.auth.getSession()` (already scaffolded in feature 001's
  `useBackendConnection`). The movement-creation code takes a `userId: string` parameter — it
  does not care *how* that id was obtained, so swapping in a real sign-in feature later requires
  no changes to this feature's domain logic.
- **Alternatives considered**: Building a minimal login form as part of this feature —
  rejected for the scope-discipline reason above. Hardcoding a fake "dev user" constant — rejected
  because it would silently violate FR-013's traceability requirement in a way that's easy to
  forget to remove.

## FEFO (First-Expire-First-Out) lot selection

- **Decision**: A pure function `selectFefoLot(lots, quantityNeeded)` that sorts a supply's lots
  with available stock by `fechaCaducidad` ascending and greedily allocates from the earliest-
  expiring lot(s) first, returning the lot(s) and quantities to deduct.
- **Rationale**: Matches spec FR-006/Acceptance Scenario 2. Keeping it a pure function (no Dexie
  or React dependency) makes it directly unit-testable, and reusable for both the default path
  and to validate a user's manual lot override (does the chosen lot have enough stock?).
- **Alternatives considered**: Doing the lot selection inline inside the form component —
  rejected, not testable in isolation and harder to reuse if a future feature needs the same
  logic (e.g., an alerts feature deciding which lot is "closest to expiring").

## Decimal-aware quantity validation

- **Decision**: Each `Insumo` stores a `unidadMedida` with a `permiteDecimales: boolean` flag
  (true for mL/g-style units, false for piezas/cajas). A shared `validateQuantity(value, unidad)`
  function rejects non-finite/negative values always, and additionally rejects non-integer values
  when `permiteDecimales` is false.
- **Rationale**: Matches spec FR-016 and the clarification session's decision. Centralizing the
  rule in one function (used by both registro and consumo forms) avoids the two forms drifting
  out of sync on validation behavior.
- **Alternatives considered**: A fixed global decimal-places setting — rejected, spec explicitly
  ties decimal-permission to the unit of measure, not a global toggle.

## Append-only movement ledger + overdraft reconciliation

- **Decision**: `movimientos` rows are only ever inserted, never updated/deleted (Dexie and
  Supabase alike) — a correction is a new `tipo: 'ajuste'` row referencing the original
  (`movimientoOrigenId`). A lightweight `reconcileOverdraft` check runs after each background sync
  batch: it recomputes a lot's available stock from its full movement history and, if negative,
  marks the lot `estado: 'revision'` (a plain field on the `lotes` row) — it never rejects or
  rolls back the movements that caused it.
- **Rationale**: Directly implements FR-014/FR-015 and the clarification session's decisions.
  Deriving available stock from the movement sum (rather than a mutable running counter) is what
  makes the "never lose a transaction" guarantee straightforward — the ledger is the source of
  truth, the "available stock" number is always a derived read.
- **Alternatives considered**: A mutable `cantidadDisponible` counter decremented in place —
  rejected, it's exactly the design that makes concurrent-offline conflicts destructive (last
  sync wins, silently overwriting the other transaction) — the opposite of FR-014.

## Zustand store shape for inventory search/forms

- **Decision**: A single `useInventoryStore` holding the in-memory catalog/lot cache read from
  Dexie (kept in sync via Dexie's `liveQuery` subscription), exposing selectors for search-by-text,
  search-by-category, and "recently used" quick-select — reused by both `RegistroForm` and
  `ConsumoForm`.
- **Rationale**: Matches Constitution II (single reactive state source) and feature 001's
  `appStore.ts` pattern; `liveQuery` keeps the store's cache reactive to local Dexie writes
  without manual invalidation plumbing.
- **Alternatives considered**: Separate stores per form — rejected, both forms search the same
  catalog/lot data, so one shared store avoids duplicated cache/subscription logic.
