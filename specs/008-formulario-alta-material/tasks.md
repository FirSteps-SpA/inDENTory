---

description: "Task list for feature 008 — Formulario Unificado para Creación de Nuevo Material"
---

# Tasks: Formulario Unificado para Creación de Nuevo Material

**Input**: Design documents from `/specs/008-formulario-alta-material/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md,
contracts/supabase-schema.md, quickstart.md

**Tests**: The spec doesn't ask for TDD. plan.md (Testing) commits to unit tests for every new
pure function/hook and to integration tests per story. As in features 006/007, each test is
written alongside its implementation task, not before it.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P1/P2/P3). US1 (alta sin
stock) and US2 (stock inicial + primer lote) together form the MVP, the "Guardar e Ingresar" of
the roadmap. US3 (categoría nueva) and US4 (duplicados) extend `AltaMaterialView` and
`alta.ts` built in US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Paths are relative to the repository root, per plan.md's Project Structure

---

## Phase 1: Setup

**Purpose**: Shared building blocks with no dependencies.

- [ ] T001 [P] Create `src/components/ui/Stepper.tsx` per contracts/ui-contracts.md (`Stepper`):
  props `{ id, label, value: number | null, onChange: (v: number | null) => void, min = 0,
  permiteDecimales, allowEmpty }`. Render a `<label htmlFor={id}>`, a `TouchButton variant="ghost"`
  `aria-label="Restar uno"` with `Minus`, a centered `<input type="number" step={permiteDecimales ?
  'any' : 1}>` inside a `touch-target` bordered box, and a `TouchButton` `aria-label="Sumar uno"`
  with `Plus`, copying the markup of the cantidad control in
  `src/features/insumos/components/RegistroForm.tsx`. Rules: "+" on `null` → `min + 1` (1 when
  min = 0); "−" on `null` does nothing; "−" never goes below `min`; clearing the input yields `null`
  only when `allowEmpty`, otherwise `min`. Accept `aria-describedby`/`aria-invalid` passthrough
  props so callers can attach field errors.
- [ ] T002 [P] In `src/features/insumos/lib/catalogo.ts`, change `UNIDADES_MEDIDA` to
  `['caja', 'frasco', 'pieza', 'cartucho', 'mL', 'g'] as const`, export
  `type UnidadMedida = (typeof UNIDADES_MEDIDA)[number]` and
  `ETIQUETAS_UNIDAD: Record<UnidadMedida, string>` (`Caja, Frasco, Pieza, Cartucho, mL, g`)
  (research.md R5). Extract the stock-mínimo checks of `validarEdicionInsumo` into an exported
  `validarStockMinimo(minimo: number | null, unidadMedida: string): string | null` and export the
  existing `claveNombre`; make `validarEdicionInsumo` call them (same messages, same behavior). In
  `src/features/insumos/components/EditarInsumoForm.tsx` show `ETIQUETAS_UNIDAD[u]` as option
  text. `permiteDecimales` in `quantity.ts` is unchanged.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, the category catalog, and store/aviso plumbing that every story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Extend `src/lib/db/index.ts` per data-model.md. Add `creadoPor: string | null` to
  `Insumo`. Add the `Categoria` interface (`id`, `nombre`, `creadoPor`, `creadoEn`, `sincronizado`,
  `rechazadoEn: string | null`) and the
  `Borrador` interface (`id: 'alta-material'`, `datos: Partial<AltaMaterialInput>`, `actualizadoEn`).
  To make that type available now, create `src/features/insumos/lib/alta.ts` holding only the
  `AltaMaterialInput` interface from contracts/ui-contracts.md, with `unidadMedida: UnidadMedida`
  from T002. Import it into the db module with `import type` so there is no runtime cycle. Register
  `categorias: EntityTable<Categoria, 'id'>` and `borradores: EntityTable<Borrador, 'id'>` on `db`.
  Add `db.version(5).stores({ categorias: 'id, creadoEn, sincronizado', borradores: 'id' })`
  with `.upgrade(tx => tx.table('insumos').toCollection().modify(i => { i.creadoPor ??= null }))`,
  commented like version(4). Update every `Insumo` literal so it type-checks with
  `creadoPor: null`: `SearchPicker.tsx`'s `CrearInsumoForm` (removed later in T016),
  `tests/helpers/memoryDb.ts`, and the fixtures in `tests/integration/*.test.tsx` and
  `tests/unit/**`.
- [ ] T004 [P] In `src/lib/sync/index.ts`, add `creado_por: string | null` to `InsumoRow`, map it in
  `toInsumoRow` (`insumo.creadoPor`) and in `fromInsumoRow` (`row.creado_por ?? null`), per
  contracts/supabase-schema.md.
- [ ] T005 Create `src/features/insumos/lib/categorias.ts` per contracts/ui-contracts.md and
  research.md R1/R2. It holds `CATEGORIAS_PRECARGADAS = ['Cirugía', 'Restauración', 'Tratamientos
  pulpares', 'Fresas'] as const`, `SIN_CATEGORIA = 'Sin categoría'`, and
  `claveCategoria(nombre)`: trim → NFD → strip `\p{Diacritic}` → `toLocaleLowerCase('es')` →
  collapse whitespace.
  It also holds the `CategoriaCatalogo` type and `catalogoCategorias(categorias, insumosActivos)`.
  That function merges three sources by clave with this precedence: (1) precargadas as
  `origen:'precargada'`; (2) `Categoria` rows with `rechazadoEn === null`, ordered by
  `(creadoEn, id)`, so the oldest name wins (`'creada'`); (3) distinct `insumo.categoria` values,
  sorted, first one wins (`'texto-libre'`). Any source whose clave equals
  `claveCategoria(SIN_CATEGORIA)` maps to the single `'sin-categoria'` entry. Sort the rest with
  `localeCompare(…, 'es')` and append "Sin categoría" last.
  `categoriasEnUso(categorias, insumosActivos)` keeps only catalog entries whose clave appears in
  ≥1 active insumo. "Sin categoría" is included only if some active insumo uses it (FR-011a).
  `resolverCategoria(nombre, catalogo)` returns the canonical nombre for the clave, or `null`.
- [ ] T006 [P] Unit tests in `tests/unit/insumos/categorias.test.ts`:
  - `claveCategoria`: "  Restauración " = "restauracion"; "FRESAS" = "fresas".
  - Empty inputs → 4 precargadas + "Sin categoría" last.
  - Free-text "restauracion" merges into "Restauración".
  - Two `Categoria` rows "Ortodoncia"/"ortodoncia" → one entry named after the older row.
  - Rejected rows are excluded.
  - Free text "sin categoria" maps to the fixed entry.
  - `categoriasEnUso` omits unused precargadas.
  - `resolverCategoria("fresas")` → "Fresas", and an unknown name → `null`.
- [ ] T007 Extend `src/stores/inventoryStore.ts`:
  - Add `categorias: Categoria[]` to the state with its own `liveQuery(() => db.categorias.toArray())`
    subscription, unsubscribed in the cleanup.
  - Change `searchInsumosPorCategoria` to compare `claveCategoria(insumo.categoria) ===
    claveCategoria(categoria)`.
  - Delete `categoriasDisponibles` once T008 removes its callers.
  - Update the doc comment accordingly.
- [ ] T008 Replace `categoriasDisponibles` callers:
  - `src/features/insumos/components/InventarioView.tsx` and `SearchPicker.tsx` pass
    `categoriasEnUso(categorias, insumos).map(c => c.nombre)` to their chips.
  - `src/features/insumos/components/EditarInsumoForm.tsx` fills its `<select>` from
    `catalogoCategorias(categorias, insumos)` (no create option). If the current value's clave
    matches an entry, preselect that entry's canonical name.
  - In `src/features/insumos/lib/catalogo.ts`, `validarEdicionInsumo` gains a
    `catalogo: CategoriaCatalogo[]` parameter. The category is valid iff
    `resolverCategoria(resultado.categoria, catalogo) !== null`. Update `editarInsumo`: add
    `db.categorias` to its `db.transaction('rw', db.insumos, db.cambiosInsumo, db.categorias, …)`
    scope, since Dexie rejects reads of tables outside the scope, then read the categorias there to
    build the catalog. Update `tests/unit/insumos/catalogo.test.ts`, including one edit that must
    succeed with a created `Categoria` row.
  - Then remove `categoriasDisponibles` (T007).
- [ ] T009 [P] Extend `src/stores/avisosStore.ts`: `Aviso.tipo` adds `'material-creado' |
  'categoria-rechazada'`; export `DURACION_MATERIAL_CREADO_MS = 4000` and make `agregar` use it for
  `material-creado` (8 s otherwise). Change the `MAX_AVISOS` overflow rule in `agregar`: when over
  the limit, evict the oldest **informative** aviso (`material-creado`/`categoria-rechazada`)
  first, and only when none is left, the oldest `consumo` aviso. That way an informative notice
  never shortens the undo window of a quick consumption (spec 007 FR-009). If the new aviso is
  informative and the stack holds 3 `consumo` avisos, the new one is the one discarded. Update
  `src/app/AvisosConsumo.tsx` to render both new types as
  informative notices without "Deshacer": `«Nombre» agregado al inventario` and `La categoría
  «Nombre» no se guardó: ya no tienes permisos de administrador.` Extend
  `tests/unit/avisosStore.test.ts` with the 4 s expiry (fake timers) and the eviction order: with
  3 `consumo` avisos, a `material-creado` doesn't evict any; with 2 `consumo` + 1 `material-creado`,
  a new `consumo` evicts the `material-creado`.

**Checkpoint**: schema v5 in place, one category catalog used everywhere, all existing tests green.

---

## Phase 3: User Story 1 - Dar de alta un material nuevo desde el Inventario (Priority: P1) 🎯 MVP

**Goal**: `+ Material` opens a full-screen "Nuevo Material" form. It saves a material with no
initial stock, with its category from the dropdown, unit, stock mínimo and caducidad, offline.
The same form replaces the inline create in Registrar's search.

**Independent Test**: As `personal`, `+ Material`, then "Fresa diamante 856" / Fresas / Pieza /
stock mínimo 5 / Guardar. It appears in the list under the Fresas chip, in state "Sin stock", and
counts in Bajo Stock (quickstart Scenarios 1, 2, 5, 6, 10).

- [ ] T010 [US1] Extend `src/features/insumos/lib/alta.ts` (created with `AltaMaterialInput` in
  T003) with the `CampoAlta` and `ValidacionAlta` types from contracts/ui-contracts.md, and
  `validarAltaMaterial(input, insumosActivos, catalogo, hoy)`. For this story, validate these fields:
  - nombre: trim, not empty (`'Ingresa el nombre del material.'`), and `claveNombre` not equal to
    any active insumo's (`'Ya existe un material activo con ese nombre.'`).
  - categoria: required (`'Elige una categoría.'`); when `!categoriaNueva`, it must resolve via
    `resolverCategoria`.
  - unidadMedida ∈ `UNIDADES_MEDIDA`.
  - stockMinimo via `validarStockMinimo`.
  Leave clearly marked extension points for the lote (T018) and categoría nueva (T025) rules.
  Always return `advertencias: { loteCaducado: false }` for now.
- [ ] T011 [US1] In `src/features/insumos/lib/alta.ts` implement `darDeAltaMaterial(input)`:
  - Require `getUsuarioActualId()`.
  - Normalize the input: trim nombre and codigo, empty codigo → `null`, and categoria →
    `resolverCategoria` canonical name.
  - Open `db.transaction('rw', db.insumos, db.categorias, db.lotes, db.movimientos,
    db.borradores, …)`. Inside it, re-read active insumos and categorias, re-run
    `validarAltaMaterial`, and throw an `Error` joining the messages if invalid.
  - Add the `Insumo`: `permiteDecimales(unidadMedida)`, `creadoPor` = usuario,
    `stockMinimo`, `caduca`, and null baja fields.
  - `db.borradores.delete('alta-material')`.
  - Return `{ insumo, conLoteInicial: false }`.
- [ ] T012 [P] [US1] Unit tests in `tests/unit/insumos/alta.test.ts` (fake-indexeddb, auth store
  seeded like `catalogo.test.ts`):
  - Every US1 validation message.
  - Duplicate name is case-insensitive, and a dado de baja homonym is allowed.
  - "fresas" resolves to "Fresas".
  - `stockMinimo` decimal rejected for `caja` but accepted for `mL`.
  - Successful save writes one insumo with `creadoPor` and clears the borrador.
  - A second call with the same name throws (double-tap guard).
- [ ] T013 [US1] Create `src/features/insumos/lib/useBorradorAlta.ts` per contracts/ui-contracts.md
  and research.md R6:
  - On mount, load `db.borradores.get('alta-material')`. If found, use its `datos` over `inicial`
    and set `restaurado: true`.
  - `setDatos(patch)` updates state and schedules a 400 ms debounced
    `db.borradores.put({ id:'alta-material', datos, actualizadoEn })`. Skip the save while `datos`
    equals the initial state (`{ ...ALTA_VACIA, ...inicial }`), so that opening from Registrar
    with a prefilled name and touching nothing never writes a borrador. If a row was already
    written and the user reverts every field to the initial state, delete the row.
  - `descartar()` cancels the timer and deletes the row.
  - Exported `ALTA_VACIA: AltaMaterialInput` defaults: `caduca: true`, `stockInicial: 0`,
    `stockMinimo: null`, `unidadMedida: 'caja'`, `categoria: ''`, `categoriaNueva: false`, empty
    lote, `confirmarCaducado: false`.
  In `src/stores/authStore.ts` `logout`, also `await db.borradores.clear()`.
- [ ] T014 [P] [US1] Unit tests in `tests/unit/insumos/useBorradorAlta.test.tsx`
  (`renderHook`, fake timers):
  - No row is written for an untouched form, including one opened with `inicial.nombre` set.
  - A row is written 400 ms after a change.
  - Remount restores it with `restaurado: true`, and the borrador wins over `inicial.nombre`.
  - `descartar` deletes it.
  - `authStore.logout()` clears it.
- [ ] T015 [US1] Create `src/features/insumos/components/AltaMaterialView.tsx` (props per
  contracts/ui-contracts.md):
  - Layout: full-screen `fixed inset-0 z-40 bg-bg` overlay with a header ("Nuevo Material" + ghost
    `Cancelar`), a scrollable `<form>` with bottom padding, and a fixed bottom bar holding the
    primary submit `TouchButton` ("Guardar" / "Guardando…" disabled while pending).
  - State from `useBorradorAlta({ nombre: nombreInicial ?? '' })`. Render nothing until
    `!isLoading`. If `restaurado`, show a `Card` notice "Recuperamos tu alta sin terminar".
  - Fields in order:
    - "Nombre del material": `autoFocus` input.
    - "Categoría": `<select>` from `catalogoCategorias(categorias, insumos)` with an empty
      placeholder option "Elige una categoría".
    - "Unidad de medida": a 3×2 grid of `TouchButton`s with `aria-pressed` and `ETIQUETAS_UNIDAD`
      labels, inside a `role="group"` with `aria-label`.
    - "Stock mínimo (opcional)": `Stepper` with `allowEmpty` and `permiteDecimales` from the unit.
    - "Código de barras (opcional)": text input.
    - "Sujeto a caducidad": `<button role="switch" aria-checked>` in a `touch-target` row.
  - Submit: run `validarAltaMaterial` with local "today" (`new Date()` → `YYYY-MM-DD`). Show each
    error under its field with `aria-describedby`/`aria-invalid` and focus the first invalid field,
    without clearing anything. Otherwise `await darDeAltaMaterial(datos)` → `onCreated(resultado)`.
    Show a thrown error in a `role="alert"` Card.
  - `Cancelar`: if any field differs from `ALTA_VACIA` (ignoring `nombreInicial`), open a
    `BottomSheet` "¿Descartar este material?" with `Descartar` (→ `descartar()` then `onCancel()`)
    and `Seguir editando`. Otherwise call `await descartar()` and then `onCancel()`. Every cancel
    path clears the borrador, so no orphan draft triggers "Recuperamos tu alta sin terminar"
    later (FR-024).
  - Never mounts `ScanButton` in this story. No camera.
- [ ] T016 [US1] Wire the entry points.
  - `src/features/insumos/components/InventarioView.tsx`:
    - Add a primary `TouchButton` "+ Material" (with the `Plus` icon) above `InsumoFiltros`, and an
      `alta` boolean state.
    - Render `<AltaMaterialView>` when it is open.
    - `onCreated`: close the view and
      `useAvisosStore.getState().agregar({ tipo:'material-creado', insumoNombre, … nulls })`.
    - `onCancel`: close the view.
    - `onAbrirExistente`: close the view (the borrador stays) and
      `setInsumoSeleccionadoId(insumo.id)`.
    - Filters state is untouched (FR-022).
  - `src/features/insumos/components/SearchPicker.tsx`:
    - Delete `CrearInsumoForm` and its local `UNIDADES_MEDIDA`.
    - "Crear insumo nuevo" now renders `<AltaMaterialView nombreInicial={texto.trim()}>`.
    - Change the prop to `onSelect: (insumo: Insumo, opciones?: { conLoteInicial: boolean }) =>
      void` and call it from `onCreated`. `onAbrirExistente` → `onSelect(insumo)`.
  - `src/features/insumos/components/RegistroForm.tsx`: when `opciones?.conLoteInicial`, set
    `mensajeExito` to `Lote de "${insumo.nombre}" registrado.` and keep `insumo` null. Otherwise
    select it as today.
  - `ConsumoForm.tsx` keeps calling `seleccionarInsumo(insumo)` and ignores `opciones`.
- [ ] T017 [US1] Integration tests in `tests/integration/alta-material.test.tsx`. Render
  `InventarioView` with the seeded auth/inventory stores, as `tests/integration/inventario.test.tsx`
  does, and cover:
  - `+ Material` focuses the name input and no camera is requested (`getUserMedia` spy not called).
  - The selector lists the 4 precargadas plus "Sin categoría" last.
  - Saving a no-stock material shows it in the list with "Sin stock", under the "Fresas" chip,
    with the "material-creado" aviso.
  - With stock mínimo 5, the Bajo Stock count in `ResumenAlertasBanner` increases by 1 right after
    saving, with no reload (FR-022).
  - Empty/duplicate name shows the field error and keeps the other values.
  - Cancel with data asks for confirmation, and filters survive.
  - Borrador restore after unmount/remount.
  - Opening from Registrar with a prefilled name and cancelling, then opening `+ Material`, shows
    an empty form and no "Recuperamos" notice.
  Update `tests/integration/registro.test.tsx`: "Crear insumo nuevo" (line ~129) now opens
  `AltaMaterialView` (heading "Nuevo Material") with the searched name prefilled. Saving it
  selects the insumo for lote registration.

**Checkpoint**: US1 works standalone (quickstart 1, 2, 5, 6, 10 without initial stock).

---

## Phase 4: User Story 2 - Ingresar stock inicial y primer lote en el mismo paso (Priority: P1) 🎯 MVP

**Goal**: With stock inicial > 0, the same save creates the material, its first lote and the
ingreso movement atomically ("Guardar e Ingresar"). An already-expired date is allowed only after
explicit confirmation.

**Independent Test**: Create "Anestesia X" / Cirugía / Cartucho / stock inicial 10 / lote A123 /
proveedor / vencimiento next year. The card shows 10, the detail shows the lote, and the history
shows one ingreso by the user. A past date requires confirmation (quickstart Scenarios 3, 4).

- [ ] T018 [US2] Extend `validarAltaMaterial` in `src/features/insumos/lib/alta.ts`:
  - When `stockInicial > 0`, run `validateQuantity(stockInicial, unidadMedida)` (error on
    `stockInicial`).
  - `lote.numeroLote` and `lote.proveedor` are required, trimmed (`'Ingresa el número de lote.'`,
    `'Ingresa el proveedor.'`).
  - When `caduca`, `lote.fechaCaducidad` is required (`'Ingresa la fecha de vencimiento.'`).
  - `advertencias.loteCaducado = caduca && fechaCaducidad < hoy` (string compare of `YYYY-MM-DD`;
    equal to today is not expired).
  - When `stockInicial === 0`, ignore every lote field. When `!caduca`, ignore `fechaCaducidad`.
  - Reject negative `stockInicial`.
- [ ] T019 [US2] Extend `darDeAltaMaterial` in `src/features/insumos/lib/alta.ts`:
  - Throw `'Confirma el ingreso de un lote ya caducado.'` when `loteCaducado &&
    !confirmarCaducado`.
  - When `stockInicial > 0`, add inside the same transaction a `Lote` with:
    - `numeroLote`, `proveedor` (trimmed).
    - `fechaCaducidad: caduca ? fecha : null`.
    - `codigoFabricante` = the insumo's.
    - `estado: 'activo'`, `creadoEn`.
  - Then `await crearMovimiento({ tipo: 'ingreso', loteId, cantidad: stockInicial })`.
  - Return `conLoteInicial: true`.
- [ ] T020 [P] [US2] Extend `tests/unit/insumos/alta.test.ts`:
  - Each lote validation message.
  - No lote fields are required at stock 0.
  - No date is required when `!caduca`, and a typed date is discarded.
  - `loteCaducado` true for yesterday, false for today.
  - Throws without `confirmarCaducado`.
  - A successful save writes exactly 1 insumo + 1 lote + 1 `ingreso` movimiento with the user's id.
  - Offline (FR-021, SC-003): with `getSupabaseStatus` mocked to return an error (no backend),
    `darDeAltaMaterial` still resolves. The movimiento stays `sincronizado: false`, and a later
    `runSyncBatch()` doesn't throw and keeps the rows unchanged.
  - Atomicity: `vi.spyOn(db.movimientos, 'add')` rejecting → 0 insumos, 0 lotes and the borrador
    still present (SC-003).
- [ ] T021 [P] [US2] Create `src/features/insumos/components/ConfirmarLoteCaducadoDialog.tsx`:
  - A `BottomSheet` titled "Este lote ingresaría ya caducado".
  - Body: the date formatted `dd/mm/aaaa` and "Aparecerá de inmediato en Alertas."
  - Buttons: `Guardar igual` (→ `onConfirmar`) and ghost `Revisar fecha` (→ `onCancelar`).
  - Props `{ fechaCaducidad, onConfirmar, onCancelar }`.
  - Modeled on `ConfirmarBajaDialog.tsx`.
- [ ] T022 [US2] Extend `src/features/insumos/components/AltaMaterialView.tsx`:
  - Add a "Stock inicial" `Stepper` (`min 0`, not empty, `permiteDecimales` from the unit) after
    Stock mínimo.
  - When `stockInicial > 0`, render a "Primer lote" section: "Número de lote", "Proveedor", and
    "Fecha de vencimiento" (`type="date"`) only if `caduca`, reusing `IconField` + the
    `Hash`/`Truck`/`Calendar` icons and the vida-útil hint from `RegistroForm`.
  - The primary button reads "Guardar e Ingresar" when `stockInicial > 0`.
  - On submit, when `advertencias.loteCaducado`, open `ConfirmarLoteCaducadoDialog`. Confirming
    re-submits with `confirmarCaducado: true`. "Revisar fecha" focuses the date input.
  - Turning the caducidad switch off clears `lote.fechaCaducidad` in the borrador.
- [ ] T023 [US2] Extend `tests/integration/alta-material.test.tsx`:
  - The lote section is hidden at 0 and shown after "Sumar uno".
  - The button label changes.
  - The date field is hidden when the switch is off.
  - Saving 10 cartuchos shows "10" on the card and one lote in `InsumoDetalle`.
  - Yesterday's date opens the dialog, and "Guardar igual" makes the insumo count in the caducidad
    summary.
  - Today's date doesn't open the dialog.
  In `tests/integration/registro.test.tsx`: creating from Registrar's search with stock inicial
  shows `Lote de "…" registrado.` and returns to the search.

**Checkpoint**: MVP complete (US1 + US2); quickstart 1-6 and 10 pass.

---

## Phase 5: User Story 3 - Crear una categoría nueva sin salir del formulario (Priority: P2)

**Goal**: Administrators can pick "+ Crear nueva categoría". The category is created with the
material (never on cancel), deduplicated by clave, synced with admin-only RLS, and a server
rejection moves its materials to "Sin categoría".

**Independent Test**: As admin, create "ortodoncia" with a material → an "Ortodoncia" chip in the
Inventario and an option in alta/edición. "FRESAS" selects the existing one. Cancelling leaves no
category. As `personal` there is no create option (quickstart Scenarios 8, 9-rechazo).

- [ ] T024 [US3] Extend `src/features/insumos/components/AltaMaterialView.tsx`:
  - When `usuario.rol === 'administrador'`, append the option `+ Crear nueva categoría`
    (sentinel value) to the `<select>`.
  - Choosing it swaps the select for an inline text input ("Nombre de la nueva categoría",
    `maxLength` 40) plus `TouchButton`s `Usar` and ghost `Volver a la lista`.
  - `Usar` calls `resolverCategoria`: an existing clave selects that canonical name with
    `categoriaNueva: false` and a hint "Ya existía: se usará «X»". Otherwise it keeps the typed
    name with `categoriaNueva: true` and shows it as the selected value, marked "(nueva)".
  - The pending new category lives only in the borrador.
  - Non-admins never see the option. "Sin categoría" is always there.
- [ ] T025 [US3] Extend `src/features/insumos/lib/alta.ts`:
  - In `validarAltaMaterial`, when `categoriaNueva`: trimmed name 1–40 chars, and its clave must
    not be the "Sin categoría" clave (`'Ese nombre está reservado.'`).
  - In `darDeAltaMaterial`, when `categoriaNueva`:
    - Throw `'Solo un administrador puede crear categorías.'` unless
      `useAuthStore.getState().usuario?.rol === 'administrador'`.
    - Inside the transaction, re-resolve against the current catalog. If it now resolves (another
      row arrived), use the canonical name and write no row.
    - Otherwise `db.categorias.add({ id, nombre, creadoPor, creadoEn, sincronizado: false,
      rechazadoEn: null })` before adding the insumo.
- [ ] T026 [P] [US3] Extend `tests/unit/insumos/alta.test.ts`:
  - An admin creates "Ortodoncia": 1 categoria row + insumo with that category.
  - "FRESAS" as new → no row, category "Fresas".
  - `personal` with `categoriaNueva` throws and writes nothing.
  - The reserved-name error.
  - A failed save (movimiento spy) leaves no categoria row.
- [ ] T027 [US3] Extend `src/lib/sync/index.ts` per contracts/supabase-schema.md:
  - Add `CategoriaRow` with `toCategoriaRow`/`fromCategoriaRow`.
  - `pushCategorias(client): Promise<Categoria[]>` upserts unsynced and non-rejected rows and marks
    them `sincronizado` only when there is no error. On `esRechazoDePermisos`, retry row by row.
    Each row rejected individually gets `rechazadoEn = now()`, and the function returns those rows.
  - `moverASinCategoria(rechazadas)` runs in one Dexie transaction. It sets `categoria =
    SIN_CATEGORIA` on every local insumo whose `claveCategoria(categoria)` matches a rejected clave,
    unless `catalogoCategorias` (computed with the rejected rows excluded) still resolves that clave.
  - `pullCategorias(client)` does `bulkPut` of the rows with `sincronizado: true,
    rechazadoEn: null`, skipping ids stored locally with `rechazadoEn !== null`.
  - In `runSyncBatch`, call `pushCategorias` + `moverASinCategoria` **before** `pushInsumos`. For
    rejections, add one `categoria-rechazada` aviso per category and refresh the role with
    `fetchPerfilPropio` + `actualizarRol`, as `notificarRechazos` does. Call `pullCategorias` right
    after `pullInsumos`.
  - Never throw.
- [ ] T028 [P] [US3] Unit tests in `tests/unit/sync-categorias.test.ts`, mocking the Supabase client
  the same way `tests/unit/sync-cambios-insumo.test.ts` does:
  - An unsynced row is pushed and marked synced.
  - An RLS error on the batch falls back to row by row, and only the failing row gets
    `rechazadoEn`.
  - Insumos with the rejected clave become "Sin categoría" before `insumos` is upserted (assert
    call order).
  - An insumo whose clave is also a precargada is untouched.
  - One aviso per category, and the role is refreshed.
  - A network error marks nothing.
  - Pull merges without resurrecting a rejected row.
- [ ] T029 [US3] Extend `tests/integration/alta-material.test.tsx`:
  - As admin, create "ortodoncia" → an "Ortodoncia" chip appears in `InventarioView`, and
    `EditarInsumoForm`'s select lists it.
  - "FRESAS" → hint and no duplicate option.
  - Cancel after choosing a new category → `db.categorias` is empty.
  - As `personal`: no "+ Crear nueva categoría", but "Sin categoría" is present; saving with it
    shows the "Sin categoría" chip.

**Checkpoint**: US3 works (quickstart 8; 9-rechazo requires the Supabase SQL applied).

---

## Phase 6: User Story 4 - Evitar duplicados con sugerencias y código de barras (Priority: P3)

**Goal**: Suggestions of existing materials while typing, an explicit-only barcode scan, an
inline "código ya existe" warning, and the admin-only "Posible duplicado" badge for sync-born
duplicates.

**Independent Test**: Typing "compo" suggests "Composite A2 — Ya existe" and opens its detail.
Code `7790001` warns "Este código ya corresponde a «Composite A2»". Two same-name materials → the
newer one shows "Posible duplicado" to admins only (quickstart Scenarios 7, 9).

- [ ] T030 [US4] In `src/features/insumos/lib/alta.ts`, implement:
  - `sugerirMateriales(insumosActivos, texto, limite = 5)`: `[]` below 2 trimmed characters.
    Otherwise return active insumos whose accent-folded, lowercased name contains the
    accent-folded query, sorted by name. Reuse the folding helper from `categorias.ts`, exported as
    `plegar(texto)`.
  - `posiblesDuplicados(insumosActivos)`: group by `claveNombre` and return the ids of all but the
    min `(creadoEn, id)` of each group of size ≥ 2 (research.md R9).
- [ ] T031 [P] [US4] Extend `tests/unit/insumos/alta.test.ts`:
  - 1 character → none.
  - "resina" matches "Resína Z350".
  - Limit 5.
  - Dados de baja are excluded by the caller's input.
  - `posiblesDuplicados`: a pair flags only the newer; a creadoEn tie breaks by id; a triple flags
    two; a renamed item clears the flag.
- [ ] T032 [P] [US4] Extend `src/features/insumos/components/ScanButton.tsx` with the optional prop
  `onCodigo?: (codigo: string) => void`. When provided, a `'match'` result calls
  `onCodigo(resultado.codigo)` and skips the insumo/lote lookup. `'unavailable'`/`'no-match'`
  messages are unchanged. Camera still only starts in `iniciarEscaneo`. Existing callers are
  unaffected.
- [ ] T033 [US4] Extend `src/features/insumos/components/AltaMaterialView.tsx`:
  - Under the name input, render `sugerirMateriales(insumos, datos.nombre)` as a list headed "Ya
    existen materiales parecidos". Each row is a `touch-target` button "«Nombre» · Categoría —
    Ver" → `onAbrirExistente(insumo)`.
  - Next to "Código de barras", mount `<ScanButton onCodigo={(c) => setDatos({ codigoFabricante: c
    })} />`.
  - On scan result and on the code input's `onBlur`, look up `findInsumoPorCodigo(insumos,
    codigo.trim())`. On a match, show a `warning-30` Card "Este código ya corresponde a «X»" with a
    `TouchButton` `Abrir «X»` → `onAbrirExistente`. It doesn't block saving.
- [ ] T034 [US4] In `src/features/insumos/components/InsumoCard.tsx`, add the prop
  `posibleDuplicado?: boolean`: when true, render `<Badge variant="warning-30">Posible
  duplicado</Badge>` next to the state badge. In `src/features/insumos/components/InventarioView.tsx`,
  compute `const duplicados = rol === 'administrador' ? posiblesDuplicados(insumos) : new Set()`
  once per render and pass `posibleDuplicado={duplicados.has(id)}`.
- [ ] T035 [US4] Extend `tests/integration/alta-material.test.tsx`:
  - Typing "compo" shows the suggestion, and tapping it opens `InsumoDetalle` with the borrador
    kept (reopening `+ Material` restores it).
  - Typing the existing code and blurring shows the warning.
  - The scan button doesn't touch the camera until clicked (mock `useBarcodeScanner`, scan
    returns a code → field filled + warning).
  - Two seeded same-name insumos: admin sees one "Posible duplicado" badge on the newer, `personal`
    sees none, and after `darDeBajaInsumo` on one the badge disappears.

**Checkpoint**: All stories functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T036 [P] Touch-target audit (FR-025, Principle III): verify every new control in
  `AltaMaterialView.tsx`, `Stepper.tsx` and `ConfirmarLoteCaducadoDialog.tsx` is ≥48×48px:
  unit grid buttons, switch row, select, suggestion rows, `Usar`/`Volver a la lista`, and the
  fixed bottom bar clearing `BottomNav`. Add a test in `tests/integration/alta-material.test.tsx`
  asserting the `touch-target` class/`TouchButton` usage on those controls.
- [ ] T037 [P] Grep `src/` for leftover `categoriasDisponibles`, `CrearInsumoForm` and the old
  `['pieza', 'caja', 'mL', 'g']` list and remove them. Update the doc comments of
  `SearchPicker.tsx`, `MasView.tsx` and `inventoryStore.ts` to mention spec 008.
- [ ] T038 Run `npm run lint && npm run build && npm test` and fix any failure.
- [ ] T039 Apply the SQL of `specs/008-formulario-alta-material/contracts/supabase-schema.md` to the
  Supabase project: `insumos.creado_por`, the `categorias` table and its RLS policies. Then run
  quickstart Scenario 9 with two browsers.
- [ ] T040 Run `specs/008-formulario-alta-material/quickstart.md` Scenarios 1–11 against
  `npm run dev` (skill `run-indentory`), at 360px width, including offline via DevTools.
- [ ] T041 Prepare the PR notes. Declare the known exception from plan.md's Post-Phase 1
  re-check: a rejected category rewrites `Insumo.categoria` directly, outside `CambioInsumo`, and
  `insumos` still has no RLS (deferred to spec 010). Confirm the Constitution Development
  Workflow items: no auto camera, the minimum touch sizes, and Dexie-first writes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: after Setup. It BLOCKS all stories: schema T003 is needed by every
  type and fixture, and T005/T007/T008 provide the category catalog the form uses.
- **US1 (Phase 3)**: after Foundational
- **US2 (Phase 4)**: after US1 (extends `alta.ts`, `AltaMaterialView.tsx` and the integration test)
- **US3 (Phase 5)**: after US1. Independent of US2 in logic; file overlap in `alta.ts` and
  `AltaMaterialView.tsx`.
- **US4 (Phase 6)**: after US1. Independent of US2/US3 in logic, same file overlap.
- **Polish (Phase 7)**: after all stories

### Within Phases

- T003 → T004, T005 → T006, T007 → T008. T009 is independent.
- US1: T010 → T011 → T012. T013 → T014. T015 needs T011 + T013. T016 needs T015. T017 last.
- US2: T018 → T019 → T020. T021 is parallel. T022 needs T019 + T021. T023 last.
- US3: T025 → T026. T024 and T027 are parallel to each other, and T027 → T028. T029 last.
- US4: T030 → T031. T032 is parallel. T033 needs T030 + T032. T034 needs T030. T035 last.

### Parallel Opportunities

- T001, T002 (Setup)
- T004 and T005 alongside each other after T003. T006 and T009 alongside T007/T008.
- T012 and T014 alongside the UI work of T015
- T020 and T021 alongside T022's prep
- T024 (UI) in parallel with T027 (sync); T026 and T028 in parallel
- T031 and T032 in parallel. T034 in parallel with T033 (different files).
- T036 and T037 in Polish

---

## Parallel Example: start of User Story 3

```bash
Task: "Add '+ Crear nueva categoría' inline flow in src/features/insumos/components/AltaMaterialView.tsx"
Task: "Add pushCategorias/pullCategorias + rejection handling in src/lib/sync/index.ts"
```

## Parallel Example: User Story 4

```bash
Task: "Add onCodigo prop to src/features/insumos/components/ScanButton.tsx"
Task: "Unit tests for sugerirMateriales/posiblesDuplicados in tests/unit/insumos/alta.test.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 (US1: alta sin stock) → Phase 4 (US2: stock inicial + primer lote)
3. **STOP and VALIDATE**: quickstart Scenarios 1–6 and 10
4. Shippable: any staff member can register a new material with its real stock and traceable
   first lote in one step, offline

### Incremental Delivery

1. Setup + Foundational → schema v5 and a single category catalog
2. US1 → quickstart 1, 2, 5, 6, 10
3. US2 → quickstart 3, 4 (MVP)
4. US3 → quickstart 8 (+ 9-rechazo with the SQL applied)
5. US4 → quickstart 7, 9-duplicados
6. Polish → quickstart 11 + constitution checks + PR notes

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps each task to its user story for traceability
- `movements.ts` remains the only writer of `Movimiento`. The initial ingreso goes through
  `crearMovimiento` inside the alta transaction.
- The camera is never started on mount. `ScanButton` only acts on an explicit tap.
- Commit after each task or logical group; stop at any checkpoint to validate a story
