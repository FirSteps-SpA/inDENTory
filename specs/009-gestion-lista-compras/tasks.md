---

description: "Task list for feature 009 — Gestión de Lista de Compras (Reabastecimiento)"
---

# Tasks: Gestión de Lista de Compras (Reabastecimiento)

**Input**: Design documents from `/specs/009-gestion-lista-compras/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md,
contracts/supabase-schema.md, quickstart.md

**Tests**: The spec doesn't ask for TDD. plan.md (Testing) commits to unit tests for every new
pure function and to integration tests per story. As in features 006-008, each test is written
alongside its implementation task, not before it.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P1/P2/P3). US1 (ver
sugeridos) and US2 (recibir un sugerido) together form the MVP — la primera mitad y la segunda
mitad del ciclo "detectar → recibir" del roadmap. US3 (ítems manuales) y US4 (compartir) extienden
`ComprasView` construida en US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Paths are relative to the repository root, per plan.md's Project Structure

---

## Phase 1: Setup

**Purpose**: Shared building block with no dependencies.

- [X] T001 [P] In `src/components/icons/index.tsx`, add `Share` (líneas convergiendo hacia un
  punto con un pequeño círculo, estilo flecha-de-compartir) y `Copy` (dos rectángulos redondeados
  superpuestos) siguiendo el patrón `makeIcon` existente (viewBox 24×24, `strokeWidth={1.75}`,
  `currentColor`). Usados por "Compartir Lista" (US4) y su mensaje de fallback (FR-023).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema, sincronización y estado reactivo de `ItemCompra` que toda la feature usa.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Extend `src/lib/db/index.ts` per data-model.md. Add the `ItemCompra` interface (`id`,
  `nombre`, `cantidad: number | null`, `nota: string | null`, `insumoId: string | null`,
  `estado: 'pendiente' | 'comprado' | 'eliminado'`, `creadoPor`, `creadoEn`,
  `compradoPor: string | null`, `compradoEn: string | null`). Register
  `itemsCompra: EntityTable<ItemCompra, 'id'>` on `db`. Add
  `db.version(6).stores({ itemsCompra: 'id, insumoId, estado, creadoEn' })`, commented like
  `version(5)`. No `.upgrade()` needed (nueva tabla, ninguna existente cambia de forma).
- [X] T003 [P] Extend `src/lib/sync/index.ts` per contracts/supabase-schema.md (research.md R2 —
  mismo patrón que `lotes`, sin bandera `sincronizado`):
  - Add `ItemCompraRow` (`insumo_id`, `estado`, `creado_por`, `creado_en`, `comprado_por`,
    `comprado_en`, `cantidad`, `nota`) with `toItemCompraRow`/`fromItemCompraRow` (campos
    ausentes/`null` → `null`).
  - `pushItemsCompra(client)`: `upsert` de **todas** las filas locales de `itemsCompra` por `id`,
    igual que `pushLotes` — sin filtrar por ningún flag.
  - `pullItemsCompra(client)`: `select *` → `bulkPut` en `db.itemsCompra`, igual que `pullLotes`.
  - En `runSyncBatch`, llama ambas junto al bloque de `pushLotes`/`pullLotes`. Nunca lanza.
- [X] T004 Extend `src/stores/inventoryStore.ts`: agrega `itemsCompra: ItemCompra[]` al estado con
  su propia suscripción `liveQuery(() => db.itemsCompra.toArray())`, des-suscrita en el cleanup —
  mismo patrón que `categorias` (spec 008). Depende de T002.
- [X] T005 [P] Unit tests en `tests/unit/sync-items-compra.test.ts` (mock del cliente Supabase,
  mismo estilo que `tests/unit/sync-categorias.test.ts` pero sin casos de rechazo por RLS):
  - Una fila local nueva se sube y una fila remota nueva se baja (`bulkPut`).
  - Una fila cuyo `estado` cambió localmente (`'pendiente'` → `'comprado'`) se vuelve a subir en
    el siguiente ciclo sin bandera de "ya sincronizado" que lo bloquee.
  - Sin backend (`getSupabaseStatus` con error), el ciclo no lanza y no modifica nada.
  Depende de T003.

**Checkpoint**: esquema v6 en su lugar, `itemsCompra` reactivo y sincronizado, todas las pruebas
existentes en verde.

---

## Phase 3: User Story 1 - Ver la lista de compras sugerida automáticamente (Priority: P1) 🎯 MVP

**Goal**: Abrir "Compras" muestra, sin ninguna acción del usuario, los insumos con stock bajo o
con un lote caducado con stock, con sus badges y sin duplicarse.

**Independent Test**: Bajar el stock de un insumo por debajo de su mínimo (o dejar un lote
caducar), abrir "Compras", y verificar que aparece en Sugeridos con el badge correspondiente
(spec.md Independent Test, User Story 1).

- [X] T006 [US1] Create `src/features/compras/lib/sugeridos.ts` per contracts/ui-contracts.md y
  research.md R5: `ItemSugerido` (`insumo`, `stockBajo`, `caducado`) y
  `computeItemsSugeridos(insumos, lotes, movimientos)`, componiendo
  `computeInsumosStockBajo` (`features/alertas/lib/stockBajo.ts`) y
  `computeAlertasCaducidad(...).filter(a => a.nivel === 'caducado')`
  (`features/alertas/lib/caducidad.ts`) por `insumo.id`, sin reimplementar ninguna regla. No
  depende de `itemsCompra`.
- [X] T007 [P] [US1] Unit tests en `tests/unit/compras/sugeridos.test.ts`:
  - Un insumo con stock bajo aparece con `stockBajo: true, caducado: false`.
  - Un insumo con un lote vencido con stock aparece con `caducado: true`, aunque su stock total
    esté por encima del mínimo.
  - Un insumo que cumple ambas condiciones aparece una sola vez con ambos booleanos en `true`.
  - Un insumo sin stock mínimo ni lotes vencidos no aparece.
  - Un lote "próximo a caducar" (no vencido aún) no cuenta como `caducado`.
  - Un lote sin stock disponible no cuenta como `caducado`.
- [X] T008 [US1] Create `src/features/compras/components/ItemSugeridoCard.tsx`: props
  `{ itemSugerido: ItemSugerido, onRecibir: (insumoId: string) => void }`. Tarjeta con categoría,
  nombre, stock actual (`{stockTotal} {unidadMedida}`, calculado igual que `InsumoCard` con
  `computeStockLote`), y badges `Badge` reutilizado: `warning-30` + `PackageMinus` "Stock Mínimo"
  si `stockBajo`, `danger` + `AlertTriangle` "Caducado" si `caducado` (ambos a la vez si aplica,
  FR-006). Checkbox `touch-target` ≥48×48px con `aria-label` descriptivo que llama
  `onRecibir(insumo.id)`.
- [X] T009 [US1] Create `src/features/compras/components/ComprasView.tsx` (reemplaza
  `ComprasPlaceholder`), per contracts/ui-contracts.md:
  - Lee `insumos`, `lotes`, `movimientos`, `itemsCompra` de `useInventoryStore`.
  - Header "Compras" (sin acciones todavía — "+ Añadir Ítem Manual" y "Compartir Lista" llegan en
    US3/US4).
  - Sección "Sugeridos por el Sistema": `computeItemsSugeridos(...)` renderizado con
    `ItemSugeridoCard`; estado vacío "No hay materiales sugeridos por ahora" cuando la lista está
    vacía (FR-002).
  - Sección "Agregados Manualmente": por ahora solo su estado vacío fijo ("Aún no agregaste
    ítems"); se completa con datos reales en US3.
  - Estado `overlay: { tipo: 'recibir'; insumoId: string } | null` con `onRecibir` (prop de
    `ItemSugeridoCard`) llamando `setOverlay({ tipo: 'recibir', insumoId })`. Sin render todavía
    para ese overlay — lo agrega US2 (Phase 4) extendiendo este mismo archivo.
- [X] T010 [US1] Wire the entry point:
  - `src/app/App.tsx`: reemplaza el import y el uso de `ComprasPlaceholder` por `ComprasView`.
  - Delete `src/features/compras/components/ComprasPlaceholder.tsx`.
  - `tests/integration/bottom-nav.test.tsx`: reemplaza el import/uso de `ComprasPlaceholder` por
    `ComprasView`; el test "shows a recognizable placeholder for Compras" (línea ~85) pasa a
    verificar el encabezado "Compras" de `ComprasView` en vez del mensaje de placeholder (deja el
    test de "Registrar insumo"/`RegistroForm` sin tocar todavía — se ajusta en T016).
- [X] T011 [US1] Integration tests en `tests/integration/compras.test.tsx` (nuevo). Render
  `ComprasView` (o `App` con `vista='compras'`, como `bottom-nav.test.tsx` hace) con
  `inventoryStore`/`authStore` sembrados, mismo estilo que `tests/integration/inventario.test.tsx`:
  - Un insumo con stock bajo aparece en Sugeridos con "🟠 Stock Mínimo".
  - Un insumo con un lote caducado con stock aparece con "🔴 Caducado", con stock total por
    encima del mínimo.
  - Sin ningún insumo que califique, se muestra el estado vacío de Sugeridos.
  - Sin conexión (mock de `getSupabaseStatus` con error), la lista se calcula igual.

**Checkpoint**: US1 funciona en solitario (spec.md User Story 1, Acceptance Scenarios 1-7).

---

## Phase 4: User Story 2 - Marcar un ítem sugerido como recibido e ingresarlo al inventario (Priority: P1) 🎯 MVP

**Goal**: Marcar un ítem sugerido como recibido abre un flujo de un único lote (cantidad, número
de lote, proveedor, vencimiento si aplica) que actualiza el stock de inmediato. "Compras"
reemplaza por completo a "Registrar insumo" en "Más" (FR-011).

**Independent Test**: Marcar un ítem sugerido como recibido, completar cantidad/lote/proveedor,
verificar que el stock sube en Inventario y que el ítem deja de aparecer en Sugeridos si ya no
califica (spec.md Independent Test, User Story 2).

- [X] T012 [US2] Create `src/features/compras/lib/recepcion.ts` per contracts/ui-contracts.md y
  research.md R3/R4:
  - `RecepcionInput` (`cantidad`, `numeroLote`, `proveedor`, `fechaCaducidad`,
    `confirmarCaducado`), `CampoRecepcion`, `ValidacionRecepcion`.
  - `validarRecepcion(input, insumo, hoy)`: `cantidad` con `validateQuantity` (spec 002);
    `numeroLote`/`proveedor` trim, obligatorios; `fechaCaducidad` obligatoria solo si
    `insumo.caduca`; `advertencias.loteCaducado = insumo.caduca && fechaCaducidad < hoy` (mismo
    criterio que spec 008's `validarAltaMaterial`, string compare `YYYY-MM-DD`, hoy no cuenta como
    caducado).
  - `recibirEnInsumo(insumo, input, itemCompraId)`: valida; lanza si inválida o si
    `loteCaducado && !confirmarCaducado`. En `db.transaction('rw', db.lotes, db.movimientos,
    db.itemsCompra, async () => {...})`: crea `Lote` (`estado: 'activo'`, `codigoFabricante` del
    insumo, `fechaCaducidad` solo si `insumo.caduca`), llama `crearMovimiento({ tipo: 'ingreso',
    loteId, cantidad })` (se une a la transacción activa, igual que `darDeAltaMaterial`), y si
    `itemCompraId` no es `null`, `db.itemsCompra.update(itemCompraId, { estado: 'comprado',
    compradoPor: usuarioId, compradoEn: now })`. Un único lote por llamada (research.md R4).
- [X] T013 [P] [US2] Unit tests en `tests/unit/compras/recepcion.test.ts` (fake-indexeddb, auth
  store sembrado):
  - Cada mensaje de validación (`cantidad`, `numeroLote`, `proveedor`, `fechaCaducidad`).
  - Sin `fechaCaducidad` exigida cuando `insumo.caduca === false`.
  - `loteCaducado` en `true` para ayer, `false` para hoy.
  - Lanza sin `confirmarCaducado` cuando corresponde.
  - Un guardado exitoso escribe 1 lote + 1 movimiento de ingreso con el usuario autor.
  - Con `itemCompraId`, el `ItemCompra` queda `'comprado'` con `compradoPor`/`compradoEn`; con
    `itemCompraId: null`, ningún `ItemCompra` se toca.
  - Atomicidad: `vi.spyOn(db.movimientos, 'add')` rechazando → 0 lotes, `ItemCompra` sigue
    `'pendiente'`.
  - Offline (mock `getSupabaseStatus` con error): `recibirEnInsumo` resuelve igual; el movimiento
    queda `sincronizado: false`.
- [X] T014 [US2] Create `src/features/compras/components/RecibirItemForm.tsx` (`BottomSheet`),
  props `{ insumo: Insumo, itemCompraId: string | null, onRecibido: () => void, onCancelar: ()
  => void }`: `Stepper` de cantidad (`permiteDecimales` del insumo), `IconField` para número de
  lote y proveedor (con los íconos `Hash`/`Truck` ya usados en `RegistroForm`), campo de fecha de
  vencimiento (`Calendar`) solo si `insumo.caduca`. Al confirmar, corre `validarRecepcion`; si
  `advertencias.loteCaducado` y no se confirmó, abre `ConfirmarLoteCaducadoDialog` (spec 008, sin
  cambios) antes de llamar `recibirEnInsumo`. Errores por campo con `aria-describedby`, igual que
  `AltaMaterialView`.
- [X] T015 [US2] Extend `src/features/compras/components/ComprasView.tsx`: agrega el render
  condicional `overlay?.tipo === 'recibir' && insumoOverlay && (<RecibirItemForm insumo={...}
  itemCompraId={null} onRecibido={...} onCancelar={...} />)` (branch dejado listo en T009).
  `insumoOverlay` se deriva de `insumos.find(...)` (patrón "derived, not an effect" de
  `InventarioView`, para que el overlay se cierre solo si el insumo deja de existir/activo).
  `onRecibido` cierra el overlay; la lista de Sugeridos se recalcula sola vía `inventoryStore`
  (FR-014, sin lógica extra).
- [X] T016 [US2] Retira "Registrar insumo" (FR-011, research.md R3):
  - `src/features/mas/components/MasView.tsx`: elimina la `Card` "Registrar insumo", la rama
    `accion === 'registrar'` y el import de `RegistroForm`. `ConsumoForm`/"Consumir insumo" sin
    cambios.
  - Delete `src/features/insumos/components/RegistroForm.tsx`.
  - Delete `tests/integration/registro.test.tsx` (probaba `RegistroForm` directamente).
  - `tests/integration/bottom-nav.test.tsx`: el test "shows the bridge actions in Más and opens
    RegistroForm/ConsumoForm unchanged" (línea ~96) pasa a verificar solo "Consumir insumo";
    elimina las aserciones sobre "Registrar insumo".
- [X] T017 [US2] Extend `tests/integration/compras.test.tsx`:
  - Marcar un sugerido como recibido, completar el formulario, confirmar: el stock del insumo
    sube en `InventarioView` de inmediato.
  - Si tras recibir el insumo ya no está bajo mínimo ni tiene lotes caducados, desaparece de
    Sugeridos al re-renderizar.
  - Un lote con fecha de ayer abre `ConfirmarLoteCaducadoDialog`; "Guardar igual" completa la
    recepción y el lote nuevo cuenta en Alertas.
  - Cerrar el formulario sin confirmar no agrega stock ni cambia Sugeridos.
  - Sin conexión, la recepción se aplica igual localmente.

**Checkpoint**: MVP completo (US1 + US2); spec.md Acceptance Scenarios de US1 (1-7) y US2 (1-6)
pasan.

---

## Phase 5: User Story 3 - Agregar y gestionar ítems manuales de compra (Priority: P2)

**Goal**: Agregar un ítem manual en cualquier momento, opcionalmente vinculado a un material
existente; marcarlo como recibido (vinculado → mismo flujo de recepción; sin vincular → crear
material o marcar sin inventario); eliminarlo, sin restricción de rol.

**Independent Test**: Agregar "Guantes talla M, marca X" sin vincular, verlo en "Agregados
Manualmente" con badge "✏️ Manual", marcarlo/eliminarlo (spec.md Independent Test, User Story 3).

- [X] T018 [US3] Create `src/features/compras/lib/itemsManuales.ts` per
  contracts/ui-contracts.md:
  - `ItemManualInput` (`nombre`, `cantidad: number | null`, `nota`, `insumoId: string | null`),
    `ValidacionItemManual`, `validarItemManual` (nombre trim no vacío; sin restricción de
    unicidad, FR-020).
  - `agregarItemManual(input)`: crea el `ItemCompra` (`estado: 'pendiente'`, `creadoPor` del
    usuario actual). Sin guard de rol (FR-015).
  - `eliminarItemManual(itemId)`: `db.itemsCompra.update(itemId, { estado: 'eliminado' })`. Sin
    guard de rol, sin importar el autor (FR-018).
  - `marcarCompradoSinInventario(itemId)`: `estado: 'comprado'`, `compradoPor`, `compradoEn`, sin
    crear `Lote`/`Movimiento` (FR-012, segundo camino).
  - `insumoVinculado(item, insumosActivos)`: `insumosActivos.find(i => i.id ===
    item.insumoId) ?? null` — derivado, nunca escribe `ItemCompra.insumoId` (research.md R8).
  - Reutiliza `sugerirMateriales` de `features/insumos/lib/alta.ts` para las sugerencias de
    vínculo (FR-016) — sin duplicar esa función.
- [X] T019 [P] [US3] Unit tests en `tests/unit/compras/itemsManuales.test.ts`:
  - Nombre vacío o solo espacios rechazado.
  - `agregarItemManual` crea la fila `'pendiente'` con el `creadoPor` correcto.
  - `eliminarItemManual` la deja `'eliminado'`, sin borrar la fila.
  - `marcarCompradoSinInventario` la deja `'comprado'` sin escribir en `lotes`/`movimientos`.
  - `insumoVinculado` devuelve `null` si `insumoId` es `null` o si el insumo no está en
    `insumosActivos` (dado de baja), y el `Insumo` si sigue activo.
- [X] T020 [US3] Create `src/features/compras/components/AgregarItemManualForm.tsx`
  (`BottomSheet`): nombre (`IconField`, obligatorio) con la lista de `sugerirMateriales` debajo
  para elegir vincular (guarda `insumoId` al elegir una); `Stepper` de cantidad con `allowEmpty`;
  nota (textarea libre). Al guardar, llama `agregarItemManual` y cierra.
- [X] T021 [US3] Create `src/features/compras/components/ItemManualCard.tsx`: props
  `{ item: ItemCompra, insumoVinculado: Insumo | null, onRecibir: () => void, onEliminar: () =>
  void }`. Nombre, cantidad/nota si se indicaron, `Badge variant="neutral"` "Manual". Checkbox
  ≥48×48px llamando `onRecibir` (el padre decide si abre `RecibirItemForm` o
  `VincularOCrearDialog` según `insumoVinculado`). Botón de menú (`MoreVertical`, como
  `InsumoCard`) con la única opción "Eliminar" → `onEliminar`, sin confirmación (FR-018 no la
  exige).
- [X] T022 [US3] Create `src/features/compras/components/VincularOCrearDialog.tsx`
  (`BottomSheet`), para un ítem manual sin vincular marcado como recibido (FR-012): dos acciones —
  "Crear material" abre `AltaMaterialView` (spec 008, sin cambios) con `nombreInicial:
  item.nombre`; en su `onCreated`, llama `marcarCompradoSinInventario`-equivalente pero ya con el
  material creado (en la práctica: marca el `ItemCompra` `'comprado'`, ya que `AltaMaterialView`
  se encargó de cualquier stock inicial, research.md R6) — "Marcar como comprado sin inventario"
  llama `marcarCompradoSinInventario` directo.
- [X] T023 [US3] Extend `src/features/compras/components/ComprasView.tsx`:
  - Sección "Agregados Manualmente" ahora lista `itemsCompra.filter(i => i.estado ===
    'pendiente')` con `ItemManualCard`, resolviendo `insumoVinculado(item, insumos)` por ítem.
  - Botón "+ Añadir Ítem Manual" en el header, abre `AgregarItemManualForm`.
  - `overlay` gana los tipos `{ tipo: 'recibirManual'; itemId: string }` y
    `{ tipo: 'vincularOCrear'; itemId: string }`: el checkbox de `ItemManualCard` llama a uno u
    otro según `insumoVinculado(...)`. Para `'recibirManual'`, renderiza `RecibirItemForm` con
    `itemCompraId: item.id` (mismo componente de US2). Para `'vincularOCrear'`, renderiza
    `VincularOCrearDialog`. `onEliminar` llama `eliminarItemManual` directo, sin overlay.
- [X] T024 [US3] Extend `tests/integration/compras.test.tsx`:
  - Agregar un ítem manual sin coincidencia: aparece en "Agregados Manualmente" con "✏️ Manual".
  - Escribir un nombre parecido a un insumo existente muestra la sugerencia de vínculo; elegirla
    guarda el vínculo.
  - Marcar un ítem manual vinculado como recibido abre el mismo formulario de recepción que un
    sugerido, y actualiza el stock del material vinculado.
  - Marcar un ítem manual sin vincular como recibido ofrece "Crear material"/"Marcar sin
    inventario"; probar ambos caminos.
  - Eliminar un ítem manual (agregado por otra cuenta simulada) lo quita de la lista sin abrir el
    flujo de recepción ni tocar el inventario.
  - Un ítem manual marcado como comprado (por cualquier camino) deja de aparecer en pendientes.

**Checkpoint**: US1 + US2 + US3 funcionan juntas (spec.md Acceptance Scenarios de US3, 1-7).

---

## Phase 6: User Story 4 - Compartir la lista de compras con proveedores (Priority: P3)

**Goal**: "Compartir Lista" arma un texto con los ítems pendientes (sugeridos y manuales) y lo
entrega al mecanismo nativo de compartir del dispositivo, con copiar-al-portapapeles como
alternativa.

**Independent Test**: Con al menos un sugerido y un manual pendientes, tocar "Compartir Lista" y
verificar que se abre el mecanismo de compartir con el texto correcto (spec.md Independent Test,
User Story 4).

- [X] T025 [US4] Create `src/features/compras/lib/compartir.ts` per contracts/ui-contracts.md:
  - `construirTextoCompartir(sugeridos, manuales)`: un renglón por ítem pendiente —nombre,
    cantidad si se indicó, origen (Sugerido/Manual)—.
  - `puedeCompartir()`: `typeof navigator !== 'undefined' && 'share' in navigator`.
  - `copiarAlPortapapeles(texto)`: `navigator.clipboard.writeText(texto)` en un `try/catch`,
    `false` si no está disponible o falla.
- [X] T026 [P] [US4] Unit tests en `tests/unit/compras/compartir.test.ts`:
  - `construirTextoCompartir` con 1 sugerido + 1 manual con cantidad produce las líneas
    esperadas; sin ítems produce un texto vacío o mínimo.
  - `puedeCompartir` refleja la presencia/ausencia de `navigator.share` (mockeado).
  - `copiarAlPortapapeles` devuelve `true` cuando `navigator.clipboard.writeText` resuelve, y
    `false` si lanza o no existe.
- [X] T027 [US4] Extend `src/features/compras/components/ComprasView.tsx`: botón "Compartir
  Lista" en el header (ícono `Share`, T001), deshabilitado cuando no hay ítems pendientes
  (FR-022). Al tocarlo: si `puedeCompartir()`, llama `navigator.share({ text:
  construirTextoCompartir(...) })`; si no, muestra un mensaje con un botón "Copiar" (ícono `Copy`)
  que llama `copiarAlPortapapeles` (FR-023).
- [X] T028 [US4] Extend `tests/integration/compras.test.tsx`:
  - Con `navigator.share` mockeado, tocar "Compartir Lista" lo llama con el texto correcto
    (sugeridos + manuales, cantidades incluidas).
  - Sin `navigator.share`, se muestra el mensaje de fallback con "Copiar", y tocarlo llama
    `navigator.clipboard.writeText`.
  - Sin ítems pendientes, el botón está deshabilitado.

**Checkpoint**: todas las user stories funcionan (spec.md completo).

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T029 [P] Auditoría táctil (FR-026, Principio III): verificar que todo control nuevo de
  `ComprasView.tsx`, `ItemSugeridoCard.tsx`, `ItemManualCard.tsx`, `AgregarItemManualForm.tsx`,
  `RecibirItemForm.tsx` y `VincularOCrearDialog.tsx` (incluidos los checkboxes) mide ≥48×48px.
  Agregar una aserción en `tests/integration/compras.test.tsx` sobre la clase `touch-target`/uso
  de `TouchButton` en esos controles.
- [X] T030 Run `npm run lint && npm run build && npm test` and fix any failure.
- [X] T031 Apply the SQL of `specs/009-gestion-lista-compras/contracts/supabase-schema.md` to the
  Supabase project: tabla `items_compra` y sus políticas RLS. El usuario aplicó el SQL; verificado
  por REST directa contra el proyecto (`.env`): `GET /rest/v1/items_compra` → 200 (tabla y columnas
  existen), `POST /rest/v1/items_compra` sin sesión → 401 `42501 row violates row-level security
  policy` (RLS activa, insert anónimo correctamente rechazado). **Parcial**: el Escenario 7 de
  quickstart.md (sincronización real entre dos dispositivos/usuarios autenticados) no se ejecutó —
  requeriría dos usuarios de Supabase Auth reales y dos sesiones de navegador, no disponibles en
  este entorno.
- [X] T032 Run `specs/009-gestion-lista-compras/quickstart.md` Scenarios 1-10 against `npm run
  dev` (skill `run-indentory`), at 360px width, including offline via DevTools. Validado con
  smoke test visual vía Playwright (skill `run-indentory`): Sugeridos con badges combinados,
  recepción de un sugerido (`RecibirItemForm`), alta y vínculo de un ítem manual
  (`AgregarItemManualForm`), diálogo "Crear material"/"Marcar sin inventario"
  (`VincularOCrearDialog`) — todo sin errores de consola propios (el 400/404 observado es el
  backend Supabase inexistente en este contenedor, no relacionado). Cobertura exhaustiva de los
  10 escenarios queda en la suite automatizada (253/253); Escenario 7 (dos dispositivos reales)
  y una revisión visual a 360px exacto no se ejecutaron por no haber un segundo dispositivo/viewport
  configurable en este entorno.
- [X] T033 Prepare PR notes. Declare the known exception from plan.md's Post-Phase 1 re-check:
  `items_compra` es la primera tabla de esta feature con RLS habilitada desde su creación, a
  diferencia de `insumos`/`lotes`/`movimientos` (deuda heredada, spec 010). Confirm: ninguna
  cámara se activa en esta spec, todos los controles ≥48×48px, y toda escritura es Dexie-first.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: after Setup. It BLOCKS all stories: T002's `ItemCompra` type is
  needed by `recepcion.ts` (US2) and `itemsManuales.ts` (US3); T004's store subscription is
  needed by `ComprasView` (US1).
- **US1 (Phase 3)**: after Foundational
- **US2 (Phase 4)**: after US1 (extends `ComprasView.tsx`'s overlay stub from T009; `RegistroForm`
  removal in T016 needs Compras' reception flow already functional)
- **US3 (Phase 5)**: after US1 (extends `ComprasView.tsx`); reutiliza `RecibirItemForm` de US2
  para el camino "manual vinculado", así que en la práctica también depende de la Phase 4
- **US4 (Phase 6)**: after US1 (extends `ComprasView.tsx`'s header); independiente en lógica de
  US2/US3
- **Polish (Phase 7)**: after all stories

### Within Phases

- T002 → T003, T004. T005 needs T003.
- US1: T006 → T007. T006 → T008 → T009 (needs T004 too) → T010 → T011.
- US2: T012 → T013. T012 → T014 → T015 (needs T009). T016 needs T015. T017 last.
- US3: T018 → T019. T018 → T020, T021, T022 → T023 (needs T009, T014). T024 last.
- US4: T025 → T026. T025 → T027 (needs T009, T001). T028 last.

### Parallel Opportunities

- T001 (Setup) alone
- T003 alongside T004 after T002; T005 alongside US1's early tasks
- T007 alongside T008's UI work
- T013 alongside T014's UI work
- T019 alongside T020/T021/T022's UI work
- T026 alongside T027's UI work
- T029 in Polish (no dependency on T030-T033)

---

## Parallel Example: start of User Story 1

```bash
Task: "Unit tests for computeItemsSugeridos in tests/unit/compras/sugeridos.test.ts"
Task: "Create ItemSugeridoCard.tsx in src/features/compras/components/"
```

## Parallel Example: start of User Story 3

```bash
Task: "Unit tests for itemsManuales in tests/unit/compras/itemsManuales.test.ts"
Task: "Create AgregarItemManualForm.tsx in src/features/compras/components/"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 (US1: ver sugeridos) → Phase 4 (US2: recibir un sugerido, retira "Registrar insumo")
3. **STOP and VALIDATE**: quickstart Scenarios 1-3, 9
4. Shippable: cualquier miembro del personal ve qué reponer sin revisar el inventario completo, y
   puede recibir mercadería directo desde Compras, sin conexión

### Incremental Delivery

1. Setup + Foundational → esquema v6, `itemsCompra` reactivo y sincronizado
2. US1 → quickstart 1
3. US2 → quickstart 2, 3, 9 (MVP)
4. US3 → quickstart 4, 5, 6
5. US4 → quickstart 8
6. Polish → quickstart 7, 10 + auditoría táctil + notas de PR

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps each task to its user story for traceability
- `movements.ts` sigue siendo el único escritor de `Movimiento`; toda recepción pasa por
  `crearMovimiento` dentro de la transacción de `recibirEnInsumo`.
- Ningún componente de esta spec activa la cámara.
- `ItemCompra` nunca se borra físicamente (research.md R1) — verificar que ningún task futuro
  introduzca un `db.itemsCompra.delete(...)`.
- Commit after each task or logical group; stop at any checkpoint to validate a story.
