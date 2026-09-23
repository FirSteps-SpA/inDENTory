---

description: "Task list for feature 007 — Acciones Rápidas: Consumo Directo y Edición/Eliminación"
---

# Tasks: Acciones Rápidas — Consumo Directo (Shortcut) y Edición/Eliminación

**Input**: Design documents from `/specs/007-acciones-rapidas-consumo-edicion/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md,
contracts/supabase-schema.md, quickstart.md

**Tests**: Not requested as TDD in the spec. plan.md (Testing) commits to unit tests for every new
pure function/store and to integration tests per story — mirroring features 004/006, tests are
written alongside their implementation task rather than test-first.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P1/P2/P2). US1 (Consumir 1)
and US2 (Deshacer) are both P1 and form the MVP together — a one-tap action without undo is unsafe
with gloves (spec US2 "Why this priority"). US3 (Editar) and US4 (Baja) share the `CambioInsumo`
ledger, which is built in US3 and reused by US4.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Paths are relative to the repository root, per plan.md's Project Structure

---

## Phase 1: Setup

**Purpose**: Small shared building blocks with no dependencies.

- [X] T001 [P] Add `MoreVertical` (⋮), `Undo`, `Pencil` and `Trash` icons to
  `src/components/icons/index.tsx`, same hand-authored stroke style (1.75px) and `size`/`className`
  props as the existing icons.
- [X] T002 [P] Create `src/lib/haptics.ts` exporting `vibrarLeve(): void` that calls
  `navigator.vibrate?.(15)` inside `try/catch` and never throws or awaits (research.md R4).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, shared UI primitive and FEFO comparator that every story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Extend `src/lib/db/index.ts` per data-model.md: add `dadoDeBajaEn: string | null` and
  `dadoDeBajaPor: string | null` to `Insumo`; add the `CambioInsumo` interface (`id`, `insumoId`,
  `campo: 'nombre' | 'categoria' | 'unidadMedida' | 'stockMinimo' | 'codigoFabricante' | 'caduca' |
  'baja'`, `valorAnterior`, `valorNuevo` typed `string | number | boolean | null`, `usuarioId`,
  `creadoEn`, `sincronizado`); register `cambiosInsumo: EntityTable<CambioInsumo, 'id'>` on `db`;
  add `db.version(4).stores({ cambiosInsumo: 'id, insumoId, campo, creadoEn, sincronizado' })`
  with an `.upgrade(tx => tx.table('insumos').toCollection().modify(i => { i.dadoDeBajaEn ??= null;
  i.dadoDeBajaPor ??= null }))`. Add a comment in the same style as versions 2/3. Update every
  place that constructs an `Insumo` literal (`src/features/insumos/components/SearchPicker.tsx`'s
  inline create, and fixtures in `tests/integration/*.test.tsx` / `tests/unit/**`) so it
  type-checks with the two new fields set to `null`.
- [X] T004 [P] In `src/features/insumos/lib/fefo.ts`, export the existing
  `compareFechaCaducidad` (rename export to `compararFefo`, keep behavior identical) so
  `consumoRapido.ts` reuses it (research.md R1). Existing `tests/unit/fefo.test.ts` must still pass.
- [X] T005 [P] Create `src/components/ui/BottomSheet.tsx` per contracts/ui-contracts.md
  (`titulo`, `onClose`, `children`): fixed overlay with backdrop, panel anchored bottom within
  `max-w-md`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → title, close on backdrop
  click / `Escape` / a "Cerrar" `TouchButton` (≥48x48px, `X` icon), focus the first focusable
  child on mount and restore focus to the previously focused element on unmount. Use spec 005
  tokens (`bg-surface`, `text-text`, etc., as in `Card.tsx`).

**Checkpoint**: `npm test` and `npm run build` pass with the new schema; nothing user-visible
changed yet.

---

## Phase 3: User Story 1 - Consumir una unidad con un solo toque (Priority: P1) 🎯 MVP (part 1/2)

**Goal**: Each Inventario card has a "Consumir 1" button that writes a 1-unit `consumo` from the
earliest-expiring non-expired lot, vibrates, and shows a temporary notice.

**Independent Test**: With quickstart data A/B/C/D, tap "Consumir 1" on A and B → stock drops by 1
from the right lot (never an expired one), a notice appears; C shows "Solo stock caducado", D shows
"Sin stock" (quickstart Scenario 1).

### Implementation for User Story 1

- [X] T006 [US1] Create `src/features/insumos/lib/consumoRapido.ts` with
  `selectLoteConsumoRapido(lotesConStock: LoteConStock[], hoy = new Date())` returning
  `{ ok: true, lote } | { ok: false, motivo: 'sin-stock' | 'solo-caducado' }` (research.md R1):
  a lot is vigente when `fechaCaducidad === null || diasEntre(fechaCaducidad, hoy) >= 0`
  (`src/lib/dateMath.ts`); candidates = vigentes with `stockDisponible >= 1`, sorted with
  `compararFefo` (T004); if none, return `'solo-caducado'` when some expired lot has
  `stockDisponible >= 1`, else `'sin-stock'`.
- [X] T007 [P] [US1] Unit test `tests/unit/insumos/consumoRapido.test.ts` for T006: picks earliest
  vigente over later ones; skips an expired lot with earlier date; lot expiring *today* counts as
  vigente; undated lots only after dated ones; decimal lot with 0.5 left is skipped for the next
  lot ≥ 1; only-expired stock → `'solo-caducado'`; no stock / all < 1 → `'sin-stock'`.
- [X] T008 [US1] Create `src/stores/avisosStore.ts` (Zustand) per data-model.md "Aviso de consumo
  rápido": state `avisos: Aviso[]`; `agregar({ movimientoId, loteId, insumoNombre, unidadMedida })`
  pushes an aviso with `id = crypto.randomUUID()`, `estado: 'pendiente'`,
  `expiraEn = Date.now() + 8000`, schedules its own `setTimeout(…, 8000)` that calls
  `descartar(id)`, and drops the oldest when length would exceed 3; `descartar(id)` removes it and
  clears its timer. (`deshacer` is added in US2.) Export `DURACION_AVISO_MS = 8000`.
- [X] T009 [US1] Add `consumirUno(insumo: Insumo): Promise<Movimiento | null>` to
  `src/features/insumos/lib/consumoRapido.ts`: inside one Dexie `rw` transaction on `lotes` +
  `movimientos`, reload the insumo's lots and their movements from Dexie (not the store
  snapshot), recompute `selectLoteConsumoRapido`, and if `ok === false` return `null` without
  writing; otherwise write the `consumo` of 1 via `crearMovimiento` (`movements.ts`). Only after
  the transaction commits, call `vibrarLeve()` (T002) and `useAvisosStore.getState().agregar(...)`
  (T008); return the movimiento. Errors from `crearMovimiento` propagate (no vibration/aviso on
  failure). This re-check is what keeps rapid repeated taps from overdrawing a lot (spec Edge
  Cases).
- [X] T010 [US1] Rework `src/features/insumos/components/InsumoCard.tsx` per contracts/ui-contracts.md
  and research.md R5: root becomes `Card` (div) with (1) a main `<button>` area holding the existing
  badge/nombre/lote/stock content and calling `onOpen`, (2) a `TouchButton` "Consumir 1"
  (`aria-label="Consumir 1 <unidadMedida> de <nombre>"`, calls `onConsumirUno(insumo.id)`; when
  `disponibilidad.ok === false` it is `disabled` and its visible text is "Sin stock" or
  "Solo stock caducado"), and (3) a placeholder slot for the "⋮" button added in US3. New props:
  `disponibilidad`, `onConsumirUno` (and optional `onAbrirMenu`, unused until US3). Update the
  JSDoc comment (no longer read-only).
- [X] T011 [US1] Extend `src/features/insumos/components/InventarioView.tsx`: for each result
  compute `lotesConStock` from the store snapshot (`lotes` of the insumo + `computeStockLote` over
  `movimientos` filtered by `loteId`) and `disponibilidad = selectLoteConsumoRapido(lotesConStock)`
  — used only to render the button enabled/disabled; pass it to `InsumoCard`; `onConsumirUno`
  looks up the insumo and calls `consumirUno(insumo)` (a `null` result is a silent no-op),
  surfacing any thrown error in an inline `role="alert"` message.
- [X] T012 [US1] Create `src/app/AvisosConsumo.tsx`: reads `useAvisosStore`; renders a fixed
  bottom stack (above `BottomNav`, `max-w-md`, `role="status"`, `aria-live="polite"`) of up to 3
  avisos, each showing "Consumido 1 <unidadMedida> de <insumoNombre>" (Deshacer button comes in
  US2). Mount `<AvisosConsumo />` once in `src/app/App.tsx` inside the authenticated branch,
  outside the per-vista conditionals.
- [X] T013 [US1] Update `tests/integration/inventario.test.tsx` selectors that relied on the card
  being a single `<button>` (e.g. `.closest('button')` on card text) so existing 006 cases pass
  against the reworked `InsumoCard`.
- [X] T014 [US1] Create `tests/integration/acciones-rapidas.test.tsx` (render `App` or
  `InventarioView` + `AvisosConsumo` with seeded Dexie + logged-in `personal` user, like
  `inventario.test.tsx`): tapping "Consumir 1" on a 2-lot insumo writes one `consumo` of 1 on the
  earliest vigente lot with the user's `usuarioId`, card stock updates, notice text appears, and a
  `navigator.vibrate` spy was called; insumo with only expired stock shows disabled
  "Solo stock caducado"; zero stock shows disabled "Sin stock"; with `getSupabaseStatus` returning
  an error (offline) the flow still works; two synchronous clicks on "Consumir 1" for an insumo
  whose only vigente lot has 1 unit write exactly one `consumo`, stock ends at 0 (never −1) and
  the button shows "Sin stock"; after a consume the card's estado badge and the
  `ResumenAlertasBanner` counts reflect the new stock (FR-005).

**Checkpoint**: One-tap consumption works offline with correct lot choice (quickstart Scenario 1).

---

## Phase 4: User Story 2 - Deshacer un consumo rápido accidental (Priority: P1) 🎯 MVP (part 2/2)

**Goal**: Each notice has a "Deshacer" that writes a linked `ajuste` +1, at most once, while the
notice is visible (8 s); notices survive navigation between sections.

**Independent Test**: Consume 3 times, undo the latest (double-tap), switch tab and undo another,
wait > 8 s for the last → stock and ledger match quickstart Scenario 2.

### Implementation for User Story 2

- [X] T015 [US2] Add `deshacerConsumo(movimientoConsumoId: string): Promise<Movimiento | null>` to
  `src/features/insumos/lib/consumoRapido.ts` (research.md R2): read the consumo from
  `db.movimientos`; if an `ajuste` with `movimientoOrigenId === movimientoConsumoId` already exists
  in `db.movimientos`, return `null`; otherwise `crearMovimiento({ tipo: 'ajuste', loteId,
  cantidad: consumo.cantidad, movimientoOrigenId: consumo.id })`. Do both inside a Dexie `rw`
  transaction on `movimientos` so two rapid calls can't both write.
- [X] T016 [US2] Extend `src/stores/avisosStore.ts` (T008) with
  `deshacer(avisoId): Promise<void>`: no-op unless the aviso exists with `estado: 'pendiente'`; set
  `estado: 'revertido'` immediately (so the button disables), call `deshacerConsumo`, clear the
  8 s timer and schedule removal after 2000 ms. On error, restore `'pendiente'` and rethrow.
- [X] T017 [P] [US2] Unit tests: `tests/unit/avisosStore.test.ts` with `vi.useFakeTimers()` —
  aviso expires at exactly 8000 ms, 4th aviso evicts the oldest, `deshacer` on an expired or
  already-reverted aviso does nothing, reverted aviso is removed 2 s later; and extend
  `tests/unit/insumos/consumoRapido.test.ts` — `deshacerConsumo` writes one `ajuste` +1 linked by
  `movimientoOrigenId`, a second call returns `null` and writes nothing, and `computeStockLote`
  returns the pre-consumption value.
- [X] T018 [US2] Extend `src/app/AvisosConsumo.tsx` (T012): each `pendiente` aviso shows a
  `TouchButton` "Deshacer" (≥48x48px, `Undo` icon, `aria-label="Deshacer consumo de <nombre>"`)
  calling `deshacer(id)`; `revertido` avisos show "Consumo revertido" with no button.
- [X] T019 [US2] Extend `tests/integration/acciones-rapidas.test.tsx` (T014): consume 3 times → 3
  notices visible; "Deshacer" on the latest restores 1 unit and double-clicking restores only 1;
  switching `BottomNav` to Alertas and back keeps the remaining notices; after advancing fake
  timers past 8000 ms the remaining notices disappear and no further `ajuste` can be written.

**Checkpoint**: MVP complete — safe one-tap consumption with undo (quickstart Scenarios 1-2).

---

## Phase 5: User Story 3 - Editar los datos de un insumo desde el listado (Priority: P2)

**Goal**: A "⋮"/long-press menu per card (role-filtered), "Consumir otra cantidad" via the full
`ConsumoForm`, and an admin-only edit form backed by the per-field `CambioInsumo` ledger with
deterministic concurrent-edit resolution.

**Independent Test**: quickstart Scenarios 3, 4 and 7 (menu by role, edit + validation + cancel,
two-device per-field merge).

### Menu & "Consumir otra cantidad"

- [X] T020 [P] [US3] Create `src/features/insumos/lib/useLongPress.ts` per research.md R6:
  `useLongPress(onLongPress, { ms = 500, toleranciaPx = 10 } = {})` returning
  `onPointerDown/onPointerMove/onPointerUp/onPointerCancel/onClickCapture/onContextMenu` handlers;
  cancels when the pointer moves > `toleranciaPx` or lifts early; after firing, swallows the next
  click; `onContextMenu` calls `preventDefault()` and `onLongPress()`.
- [X] T021 [P] [US3] Unit test `tests/unit/insumos/useLongPress.test.tsx` (fake timers + a test
  component): fires after 500 ms hold; not fired on early release; not fired when moved 15 px;
  click after a long-press is swallowed; contextmenu fires it.
- [X] T022 [P] [US3] Create `src/features/insumos/components/InsumoAccionesMenu.tsx` per
  contracts/ui-contracts.md: inside `BottomSheet` (T005) titled with `insumo.nombre`, renders
  full-width ≥48px options "Ver detalle", "Consumir otra cantidad", and — only when
  `rol === 'administrador'` — "Editar" (`Pencil`) and "Eliminar" (`Trash`, danger variant). Each
  option calls its callback (the parent closes the menu).
- [X] T023 [P] [US3] Extend `src/features/insumos/components/ConsumoForm.tsx` with optional props
  `insumoInicial?: Insumo` and `onDone?: () => void` (contracts/ui-contracts.md): when
  `insumoInicial` is given, initialize `insumo` state to it and don't render `SearchPicker`/
  `ScanButton`; call `onDone` after a successful consumo. Without props, behavior is unchanged
  (`tests/integration/consumo.test.tsx` must still pass). Manual lot override must still list
  expired lots with stock (Clarification Q1's explicit path).
- [X] T024 [US3] Finish `InsumoCard.tsx` (T010): add the "⋮" `TouchButton` (`MoreVertical`,
  `aria-label="Más opciones de <nombre>"`, `aria-haspopup="dialog"`) calling `onAbrirMenu`, and
  attach `useLongPress(() => onAbrirMenu(insumo.id))` (T020) to the main area button.
- [X] T025 [US3] Extend `InventarioView.tsx` (T011) with `overlay` state per data-model.md
  (`null | { tipo: 'menu' | 'consumir' | 'editar' | 'baja', insumoId }`): `onAbrirMenu` opens
  `InsumoAccionesMenu` with `rol` from `useAuthStore`; "Ver detalle" → existing
  `setInsumoSeleccionadoId`; "Consumir otra cantidad" → `BottomSheet` with
  `<ConsumoForm insumoInicial={…} onDone={cerrar} />`; "Editar"/"Eliminar" set the overlay type
  (rendered in T031/T041). Opening/closing overlays never touches `texto`/`categoria`/`estado`.

### Per-field ledger & edit

- [X] T026 [US3] Create `src/features/insumos/lib/proyeccion.ts` per research.md R9 and
  data-model.md: pure `proyectarInsumo(insumo, cambios)` — for each data campo, the winning cambio
  is the max by `(creadoEn, id)` (string compare) and its `valorNuevo` is applied; if any
  `campo === 'baja'` cambio exists, set `dadoDeBajaEn`/`dadoDeBajaPor` from the **min**
  `(creadoEn, id)` baja cambio, else leave them as on the row; always recompute
  `permiteDecimales = permiteDecimales(unidadMedida)` (`quantity.ts`). Cambios with
  `rechazadoEn !== null` are ignored entirely (spec FR-021b). Plus
  `reproyectarInsumos(insumoIds?: string[])`: in a Dexie `rw` transaction on `insumos` +
  `cambiosInsumo`, reload the cambios per insumo (all insumos with cambios when no ids given) and
  `put` the projected row only if it differs.
- [X] T027 [P] [US3] Unit test `tests/unit/insumos/proyeccion.test.ts`: later `creadoEn` wins per
  campo; different campos from two authors both apply; equal `creadoEn` tie broken by larger `id`;
  result is independent of input order (shuffle); baja wins over a later edit and uses the earliest
  baja's author/date; `permiteDecimales` follows `unidadMedida`; no cambios → row unchanged; a
  cambio with `rechazadoEn` set (edit or baja) has no effect on the result.
- [X] T028 [US3] Create `src/features/insumos/lib/catalogo.ts`:
  `validarEdicionInsumo(insumo, cambios, insumosActivos)` per data-model.md validation rules
  (nombre trimmed non-empty and unique among activos via `trim().toLocaleLowerCase('es')`
  excluding itself; `stockMinimo` null or finite ≥ 0, integer if the resulting unidad doesn't
  allow decimals; `categoria` ∈ `categoriasDisponibles(insumosActivos)`; `codigoFabricante`
  trimmed, empty → null) returning Spanish per-field messages; and
  `editarInsumo(insumoId, cambios)`: throw `Error('Solo un administrador puede editar insumos.')`
  unless `useAuthStore.getState().usuario?.rol === 'administrador'`; validate (throw on invalid);
  in one Dexie `rw` transaction on `insumos` + `cambiosInsumo`, add one `CambioInsumo` per campo
  whose normalized value differs (`valorAnterior` = current value, `usuarioId`, `creadoEn = new
  Date().toISOString()`, `sincronizado: false`) and write `proyectarInsumo` of the result. No-op
  when nothing differs.
- [X] T029 [P] [US3] Unit test `tests/unit/insumos/catalogo.test.ts` (fake-indexeddb): validation
  rejects empty name, duplicate name differing only in case/spaces, negative/decimal stockMinimo
  where not allowed, unknown categoria; `editarInsumo` as `personal` throws and writes nothing;
  as admin writes exactly one cambio per changed field with correct `valorAnterior`, updates the
  row, and never touches `lotes`/`movimientos` (FR-015); unchanged save writes nothing.
- [X] T030 [US3] Create `src/features/insumos/components/EditarInsumoForm.tsx` per
  contracts/ui-contracts.md: prefilled fields (nombre, categoría select from
  `categoriasDisponibles`, unidad de medida with the same options as `RegistroForm.tsx`,
  stock mínimo numeric input with `−`/`+` `TouchButton`s and empty = sin alerta, código de
  fabricante with `ScanButton` only on explicit tap, "¿Caduca?" switch), derived
  "Admite decimales: Sí/No" text, unit-change and caduca-change warnings, per-field errors via
  `aria-describedby` without clearing input, "Guardar" disabled when nothing changed, calls
  `editarInsumo` then `onGuardado`; "Cancelar" → `onCancelar` without writing.
- [X] T031 [US3] Wire edit in `InventarioView.tsx` (T025): `overlay.tipo === 'editar'` renders
  `EditarInsumoForm` inside `BottomSheet` titled "Editar insumo"; close on save/cancel.

### Sync for the ledger

- [X] T032 [US3] Extend `src/lib/sync/index.ts` per contracts/supabase-schema.md: add
  `CambioInsumoRow` + `toCambioInsumoRow`/`fromCambioInsumoRow` (snake_case, `valor_*` as JSON);
  `pushCambiosInsumo` upserts `sincronizado === false` rows and marks them synced **only if the
  upsert returned no error**; `pullCambiosInsumo` `bulkPut`s with `sincronizado: true`. Reorder
  `runSyncBatch` to: pushInsumos (first, so every local insumo exists remotely before its cambios
  — `cambios_insumo.insumo_id` is an FK) → pushCambiosInsumo → pullCambiosInsumo → pullInsumos →
  `reproyectarInsumos()` (once, over all insumos with cambios) → rest unchanged (lotes, config,
  movimientos, `reconcileOverdraft`).
- [X] T033 [P] [US3] Unit test `tests/unit/sync-cambios-insumo.test.ts` with a mocked Supabase
  client backed by in-memory tables: device A (offline) edits nombre, device B edits stockMinimo
  and a later categoria while A edits categoria earlier; after both run `runSyncBatch` (simulate
  by syncing A's and B's cambios into the shared mock and re-running projection per device),
  both local rows are identical with A's nombre, B's stockMinimo and the latest categoria, and
  the losing categoria cambio is still in `cambios_insumo`; a rejected upsert (mock error) leaves
  cambios `sincronizado: false`; an insumo created and edited while offline syncs both its row
  and its cambios in the first cycle (no FK failure); a batch failing with RLS code `42501` is
  retried row by row — the rejected row gets `rechazadoEn`, is never re-pushed, the valid rows
  sync, and the local insumo reprojects to the server values; a network error marks nothing.
- [X] T034 [US3] Handle permission-rejected cambios (spec FR-021b, contracts/supabase-schema.md
  step 2): add `rechazadoEn: string | null` to `CambioInsumo` in `src/lib/db/index.ts` (local
  only, not indexed, not mapped to Supabase rows) and default it to `null` in `catalogo.ts`
  writes; in `pushCambiosInsumo` (`src/lib/sync/index.ts`) exclude rows with `rechazadoEn`, and
  on an RLS error (`code === '42501'` or message matching `row-level security`) retry row by row,
  marking each individually rejected row `rechazadoEn = new Date().toISOString()`, then
  `reproyectarInsumos(idsAfectados)` and call
  `useAvisosStore.getState().agregar({ tipo: 'cambio-rechazado', insumoNombre, movimientoId: null,
  loteId: null, … })` once per affected insumo; after any rejection, refresh the role with
  `fetchPerfilPropio` (`src/lib/supabase/perfiles.ts`) and, if it changed, update it through a new
  `actualizarRol(rol)` action in `src/stores/authStore.ts` (updates the Dexie `usuarioActual` row
  and the store). Extend `src/stores/avisosStore.ts` (T008) and `src/app/AvisosConsumo.tsx`
  (T012/T018) with the `tipo` field: `cambio-rechazado` avisos show "Tu cambio en «<nombre>» no
  se guardó: ya no tienes permisos de administrador." and no "Deshacer" button.
- [X] T035 [US3] Extend `tests/integration/acciones-rapidas.test.tsx`: as `personal`, "⋮" and a
  500 ms press both open a menu with only "Ver detalle"/"Consumir otra cantidad"; "Consumir otra
  cantidad" opens `ConsumoForm` preselected and a consume closes it; as `administrador`, "Editar"
  appears, raising stockMinimo above stock and saving flips the card badge to "Bajo Stock" and
  updates the summary; duplicate/empty name shows the field error; "Cancelar" keeps previously
  applied search text and filters.

**Checkpoint**: Catalog editing works for admins with deterministic merge (quickstart 3, 4, 7).

---

## Phase 6: User Story 4 - Dar de baja (eliminar) un insumo del catálogo (Priority: P2)

**Goal**: Admin-only soft delete with confirmation (warning if stock remains); deleted insumos
disappear from every operational view while their history is preserved.

**Independent Test**: quickstart Scenario 5 — delete A (with stock) → gone from list, search,
summary, Alertas and the Más forms; movimientos intact; no ajuste written.

### Implementation for User Story 4

- [X] T036 [US4] Add `darDeBajaInsumo(insumoId)` to `src/features/insumos/lib/catalogo.ts`
  (T028): throw `Error('Solo un administrador puede eliminar insumos.')` for non-admins; in one
  Dexie `rw` transaction add a `CambioInsumo` `{ campo: 'baja', valorAnterior: null,
  valorNuevo: true }` and write the projection (sets `dadoDeBajaEn/Por`); never writes
  movimientos (Clarification Q5). No-op if already dado de baja.
- [X] T037 [US4] Extend `src/stores/inventoryStore.ts`: the `insumos` `liveQuery` returns only
  rows with `!dadoDeBajaEn` (research.md R10) — update the JSDoc to say so; add a `cambiosInsumo`
  subscription/field. Validation in `catalogo.ts` already receives activos from here.
- [X] T038 [US4] Extend `src/lib/sync/index.ts` (T032): add `dado_de_baja_en`/`dado_de_baja_por`
  to `InsumoRow`, `toInsumoRow` and `fromInsumoRow` (missing → `null`).
- [X] T039 [P] [US4] Create `src/features/insumos/components/ConfirmarBajaDialog.tsx` per
  contracts/ui-contracts.md: confirmation copy naming the insumo; when `stockTotal > 0` a
  highlighted warning (color + `AlertTriangle` icon + text) "Aún quedan <stockTotal>
  <unidadMedida> en stock."; "Cancelar" (secondary) and "Eliminar" (danger) `TouchButton`s ≥48px.
- [X] T040 [US4] Extend `tests/unit/insumos/catalogo.test.ts` (T029): `darDeBajaInsumo` as
  `personal` throws; as admin writes one `baja` cambio, sets `dadoDeBajaEn/Por`, writes zero
  movimientos, keeps lotes/movimientos; a second call writes nothing; after baja a new edit is
  recorded but the insumo stays dado de baja; name uniqueness ignores dado-de-baja insumos.
- [X] T041 [US4] Wire baja in `InventarioView.tsx` (T025/T031): `overlay.tipo === 'baja'` renders
  `ConfirmarBajaDialog` in `BottomSheet` with the insumo's `stockTotal` from `computeEstadoInsumo`;
  confirm → `darDeBajaInsumo` then close. Add an effect that closes the detail
  (`insumoSeleccionadoId`) and any overlay whose insumo is no longer in `insumos` (local or synced
  baja, spec Edge Cases).
- [X] T042 [US4] Extend `tests/integration/acciones-rapidas.test.tsx`: as admin, "Eliminar" on an
  insumo with stock shows the remaining-stock warning; "Cancelar" leaves it; confirming removes it
  from the list, search results and summary counts, and from `AlertasView` and the
  `SearchPicker` in `ConsumoForm`/`RegistroForm`; its `movimientos` remain in Dexie; deleting the
  insumo whose detail is open closes the detail.

**Checkpoint**: All four stories complete (quickstart Scenarios 1-8).

**Implementation notes** (deviations found while implementing):
- T041: closing the detail/overlay of an insumo that stops being active is **derived at render**
  (it simply isn't rendered once it leaves `insumos`), not an effect — same behavior, no extra
  state sync.
- T042: added as step 7 of README's existing "Configurar backend de desarrollo" numbered list
  (where specs 002/004 already document their schema), instead of a separate subsection.
- Extra (not in the task list): `actualizarStockMinimo` (AlertasView, spec 004) now goes through
  `editarInsumo`, because the `Insumo` row is a projection of the ledger and a direct row write
  would be undone by the next reprojection.
- Extra: `pushInsumos` uploads `filaParaSubir(...)` (row with pending cambios undone), so a
  cambio later rejected by RLS (FR-021b) can never leak to other devices via `insumos`.
- Tests use `tests/helpers/memoryDb.ts` (in-memory Dexie stand-in, serializing transactions)
  following the project's per-test `vi.mock('src/lib/db')` convention — no fake-indexeddb.
- The run-indentory driver gained `seed-lote` to verify "Consumir 1" in a real browser.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T043 [P] Add the SQL from `specs/007-acciones-rapidas-consumo-edicion/contracts/supabase-schema.md`
  to `README.md` under a new "Esquema Supabase (007)" subsection (after the existing setup
  instructions), so it can be applied before deploy.
- [X] T044 [P] Manually verify touch targets ≥48x48px (FR-022) for "Consumir 1", "⋮", menu
  options, "Deshacer", form controls and dialog buttons using the `run-indentory` skill
  (screenshot at phone width), and that neither `EditarInsumoForm` nor preselected `ConsumoForm`
  activates the camera on open (FR-023).
- [X] T045 Run quickstart.md Scenarios 1-8 end-to-end against the dev server and fix any gaps
  found.
- [X] T046 [P] Run `npm run lint`, `npm run test` and `npm run build`; fix all failures.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: after Setup — BLOCKS all stories (schema T003 is needed by every
  story's types and fixtures)
- **US1 (Phase 3)** → **US2 (Phase 4)**: US2 extends US1's `consumoRapido.ts`, `avisosStore.ts`,
  `AvisosConsumo.tsx` and integration test
- **US3 (Phase 5)**: after Foundational; independent of US1/US2 logic, but T024/T025 extend the
  `InsumoCard`/`InventarioView` changes from T010/T011, so do US1 first
- **US4 (Phase 6)**: after US3 (reuses `catalogo.ts`, `proyeccion.ts`, the menu/overlay wiring and
  ledger sync)
- **Polish (Phase 7)**: after all stories

### User Story Dependencies

- **US1 (P1)**: needs Foundational only
- **US2 (P1)**: needs US1 (a notice to undo)
- **US3 (P2)**: needs Foundational + US1's card rework (file overlap only)
- **US4 (P2)**: needs US3 (ledger, catalog module, menu)

### Parallel Opportunities

- T001, T002 (Setup); T004, T005 (Foundational, after/alongside T003)
- T007 alongside T008-T012 once T006 is done
- T017 alongside T018
- T020, T021, T022, T023 in parallel at the start of US3; T027 and T029 alongside their
  implementations; T033 and T034 after T032 (T034 also needs US1/US2's `avisosStore`/`AvisosConsumo`, T008/T012/T018)
- T039 in parallel with T036-T038 within US4; T040 right after T036
- T043, T044, T046 in Polish

---

## Parallel Example: start of User Story 3

```bash
Task: "Create useLongPress hook in src/features/insumos/lib/useLongPress.ts"
Task: "Unit test useLongPress in tests/unit/insumos/useLongPress.test.tsx"
Task: "Create InsumoAccionesMenu in src/features/insumos/components/InsumoAccionesMenu.tsx"
Task: "Add insumoInicial/onDone props to src/features/insumos/components/ConsumoForm.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 (US1: Consumir 1) → Phase 4 (US2: Deshacer)
3. **STOP and VALIDATE**: quickstart Scenarios 1-2 (+ Scenario 6 offline for consumo/deshacer)
4. Shippable: staff can consume the most common case in one tap and safely undo mistakes

### Incremental Delivery

1. Setup + Foundational → schema v4 in place
2. US1 → quickstart 1
3. US2 → quickstart 2 (MVP)
4. US3 → quickstart 3, 4, 7 (requires the Supabase SQL applied for 7)
5. US4 → quickstart 5
6. Polish → quickstart 6 + constitution checks

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps each task to its user story for traceability
- `movements.ts` keeps its no-update/no-delete contract; undo is always a new `ajuste`
- Commit after each task or logical group; stop at any checkpoint to validate a story
