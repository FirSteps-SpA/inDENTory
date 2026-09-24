---

description: "Task list for feature 010 — Separación de Ajustes y Configuración Global"
---

# Tasks: Separación de Ajustes y Configuración Global

**Input**: Design documents from `/specs/010-ajustes-configuracion-global/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md,
contracts/supabase-schema.md, quickstart.md

**Tests**: The spec doesn't ask for TDD. plan.md (Testing) commits to unit tests for every new/
modified pure function and to integration tests per story. As in features 006-009, each test is
written alongside its implementation task, not before it.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P1/P1/P2/P2/P2/P3). US1
(alertas relocalizadas), US2 (perfil) y US3 (RLS del catálogo) son las tres P1 y forman el MVP —
cierran el objetivo central del roadmap y la brecha de seguridad heredada. US4 (categorías), US5
(clínica) y US6 (insumos dados de baja) extienden `AjustesView` construida en US1/US2. US7
(notificaciones) es la única P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1-US7)
- Paths are relative to the repository root, per plan.md's Project Structure

---

## Phase 1: Setup

**Purpose**: Shared building block with no dependencies.

- [X] T001 [P] In `src/components/icons/index.tsx`, add `User` (cabeza + hombros simples), `Building`
  (fachada rectangular con ventanas) y `Tag` (etiqueta con agujero) siguiendo el patrón `makeIcon`
  existente (viewBox 24×24, `strokeWidth={1.75}`, `currentColor`). Usados por las secciones
  "Perfil", "Clínica" y "Categorías" de `AjustesView`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema Dexie v7 y el contenedor `AjustesView` que toda la feature monta.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Extend `src/lib/db/index.ts` per data-model.md:
  - Add `ConfiguracionClinica` (`id: 'global'`, `nombre: string | null`).
  - Add `desactivadoEn: string | null` a la interfaz `Categoria` existente.
  - Add `PreferenciaNotificaciones` (`id: 'local'`, `stockBajo: boolean`, `caducidad: boolean`).
  - Registrar `configuracionClinica: EntityTable<ConfiguracionClinica, 'id'>` y
    `preferenciasNotificaciones: EntityTable<PreferenciaNotificaciones, 'id'>` en `db`.
  - Add `db.version(7).stores({ configuracionClinica: 'id', preferenciasNotificaciones: 'id' })
    .upgrade((tx) => tx.table('categorias').toCollection().modify((c) => { c.desactivadoEn ??=
    null }))`, comentado igual que `version(6)`. `categorias` no cambia su string de índices.
- [X] T003 Create `src/features/ajustes/components/AjustesView.tsx`: contenedor con gating por rol
  (`esAdministrador` desde `useAuthStore`, mismo criterio que `AlertasView`) — por ahora solo el
  layout y el gate, sin secciones montadas (cada user story monta la suya en su propia fase).
- [X] T004 Delete `src/features/mas/` completo (`MasView.tsx` y el directorio). Edit
  `src/app/App.tsx`: reemplaza el import/render de `MasView` por `AjustesView` para `vista === 'mas'`.
- [X] T005 [P] Edit `tests/integration/bottom-nav.test.tsx`: quita las aserciones sobre
  `MasView`/el puente "Consumir insumo"; agrega una aserción mínima de que la pestaña "Más" ahora
  renderiza `AjustesView` (contenido real verificado por cada user story más adelante).

**Checkpoint**: Dexie v7 en su lugar, `AjustesView` montada como "Más", `MasView` eliminada, suite
existente en verde.

---

## Phase 3: User Story 1 - Configurar alertas desde "Ajustes" (Priority: P1) 🎯 MVP

**Goal**: Mover el control de stock mínimo por insumo y de niveles de aviso de caducidad desde
"Alertas" a "Ajustes"; "Alertas" queda dedicada solo a mostrar alertas.

**Independent Test**: Como administrador, abrir "Ajustes" y encontrar ambos controles con el mismo
comportamiento que antes; abrir "Alertas" y confirmar que ya no aparecen (spec.md Independent Test,
User Story 1).

- [X] T006 [US1] Create `src/features/ajustes/components/ConfiguracionAlertasSection.tsx`: mueve
  tal cual las secciones "Configurar stock mínimo por insumo" y "Configurar niveles de aviso de
  caducidad" desde `AlertasView.tsx` (JSX, `handleStockMinimoChange`, `handleNivelesAvisoChange`,
  sus estados de error), reutilizando sin cambios `actualizarStockMinimo`/`actualizarNivelesAviso`
  de `alertas/lib/configuracion.ts` y leyendo `insumos`/`nivelesAvisoDias` de
  `useInventoryStore`/`useAlertasStore`.
- [X] T007 [US1] Edit `src/features/alertas/components/AlertasView.tsx`: elimina las dos secciones
  movidas en T006, sus manejadores/estados de error (`errorConfig`, `errorNiveles`) y los imports
  que quedan sin uso (`actualizarStockMinimo`, `actualizarNivelesAviso`, `IconField` si ya no se
  usa). Deja solo stock bajo, próximos a caducar y lotes en revisión.
- [X] T008 [US1] Edit `src/features/ajustes/components/AjustesView.tsx`: monta
  `ConfiguracionAlertasSection` solo cuando `esAdministrador`.
- [X] T009 [P] [US1] Edit `tests/integration/alertas-reactividad.test.tsx` (el único test de
  integración que renderiza `AlertasView`): quita cualquier aserción sobre los controles movidos
  en T006; agrega una que confirme que un administrador ya no los ve en "Alertas".
- [X] T010 [P] [US1] Create `tests/integration/ajustes.test.tsx`: como administrador, abrir
  "Ajustes", cambiar el stock mínimo de un insumo y los niveles de aviso, verificar que persisten
  igual que antes; como `personal`, verificar que esos controles no aparecen.

**Checkpoint**: User Story 1 completa e independientemente verificable.

---

## Phase 4: User Story 2 - Ver el propio perfil y cerrar sesión (Priority: P1)

**Goal**: Mostrar nombre/correo/rol y ofrecer "Cerrar sesión" desde "Ajustes".

**Independent Test**: Abrir "Ajustes" con cualquier cuenta, ver sus datos, cerrar sesión igual que
desde el encabezado (spec.md Independent Test, User Story 2).

- [X] T011 [US2] Create `src/features/ajustes/components/PerfilSection.tsx`: muestra
  `usuario.nombre`/`usuario.email`/`usuario.rol` (`useAuthStore`) y un botón "Cerrar sesión" que
  invoca `useLogout` (mismo hook que ya usan `App.tsx`/el encabezado).
- [X] T012 [US2] Edit `AjustesView.tsx`: monta `PerfilSection` siempre, antes de las secciones
  admin-only.
- [X] T013 [P] [US2] Extend `tests/integration/ajustes.test.tsx`: "Perfil" muestra nombre/correo/
  rol; "Cerrar sesión" cierra la sesión (mismo flujo que `tests/unit/auth/useLogout.test.ts`).

**Checkpoint**: User Stories 1 y 2 completas.

---

## Phase 5: User Story 3 - Impedir modificar el catálogo saltándose la app (Priority: P1)

**Goal**: RLS real en `insumos`/`lotes`/`movimientos` que impida a un usuario sin rol
administrador modificar el catálogo o dar de baja/restaurar un insumo por fuera de la app, sin
romper el resync rutinario de nadie.

**Independent Test**: Con el token de una cuenta `personal`, intentar modificar directamente en el
backend el nombre/categoría/baja de un insumo existente y verificar que no persiste; confirmar que
alta/lotes/movimientos y el resync rutinario siguen funcionando (spec.md Independent Test, User
Story 3).

- [X] T014 [US3] Apply el SQL de `contracts/supabase-schema.md` al proyecto Supabase: función
  `es_administrador(uid)`, trigger `proteger_catalogo_insumo` + RLS abierta en `insumos`, trigger
  `proteger_resolucion_lote` + RLS abierta en `lotes`, RLS de solo-INSERT-propio en `movimientos`.
- [ ] T015 [US3] Run quickstart.md Escenarios 3, 4 y 5 contra el proyecto Supabase real (cuentas
  `administrador` y `personal`): un cambio directo de catálogo o una baja/restauración por
  `personal` no persisten; alta/lote/movimiento normales siguen funcionando; el resync rutinario de
  `personal` (sin cambios pendientes) no se bloquea.
- [X] T016 [P] [US3] Add a regression test (extiende `tests/unit/sync-cambios-insumo.test.ts` o
  crea `tests/unit/sync-full-repush.test.ts`) que documenta el invariante cliente que este trigger
  no debe romper: `pushInsumos`/`pushLotes` siguen subiendo la tabla local completa vía `upsert`
  sin filtrar por rol, sin importar qué usuario esté autenticado localmente.

**Checkpoint**: User Stories 1-3 completas — MVP del roadmap + brecha de seguridad cerrada.

---

## Phase 6: User Story 4 - Gestionar categorías: crear, renombrar, fusionar, desactivar (Priority: P2)

**Goal**: Centralizar en "Ajustes" la creación, el renombrado/fusión (con cascada sobre los
insumos afectados) y la (des)activación de categorías.

**Independent Test**: Crear una categoría, verla disponible en el alta; renombrarla y ver el
cambio reflejado en los materiales que la usaban; desactivarla y ver que deja de ofrecerse (spec.md
Independent Test, User Story 4).

- [X] T017 [US4] Export `exigirAdministrador` y `nuevoCambio` desde
  `src/features/insumos/lib/catalogo.ts` (hoy privadas) para reutilizarlas fuera del módulo. Create
  `src/features/ajustes/lib/categoriasAdmin.ts` per contracts/ui-contracts.md y research.md R3:
  - `crearCategoriaDesdeAjustes(nombre)`: misma validación/dedup que el alta (spec 008 R2).
  - `renombrarCategoria(categoriaId, nuevoNombre)`: calcula `claveAnterior`/`claveNueva`
    (`claveCategoria`); si `claveNueva` coincide con otra entrada activa de `catalogoCategorias`
    (excluyendo la propia fila) → fusión (`categoria.desactivadoEn = now`, nombre resultante = el
    de la entrada existente); si no → renombrado en el lugar (`categoria.nombre = nuevoNombre`).
    En ambos casos, para todo `Insumo` (consulta `db.insumos` completa, no el store filtrado) cuya
    `claveCategoria(insumo.categoria) === claveAnterior`, agrega un `CambioInsumo`
    (`campo: 'categoria'`, `valorNuevo: nombreResultante`) y reproyecta — todo en una transacción
    Dexie sobre `categorias`, `insumos`, `cambiosInsumo`. Rechaza precargadas y "Sin categoría"
    (FR-019).
  - `desactivarCategoria(categoriaId)`/`reactivarCategoria(categoriaId)`: solo alternan
    `desactivadoEn`, sin tocar insumos. Rechaza precargadas y "Sin categoría".
- [X] T018 [P] [US4] Unit tests en `tests/unit/ajustes/categoriasAdmin.test.ts`: crear con
  dedup; renombrar sin colisión (cascada sobre insumos activos y dados de baja); renombrar con
  colisión (fusión: fila queda `desactivadoEn`, insumos apuntan al nombre existente); desactivar/
  reactivar (no toca insumos); rechazo sobre precargadas/"Sin categoría"; solo administrador.
- [X] T019 [US4] Extend `src/lib/sync/index.ts`: `toCategoriaRow`/`fromCategoriaRow` incluyen
  `desactivado_en`/`desactivadoEn`. Sin cambios en `pushCategorias`/`pullCategorias` (ya suben/
  bajan cualquier fila, el flag `sincronizado` ya cubre renombrados/(des)activaciones).
- [X] T020 [P] [US4] Extend `tests/unit/sync-categorias.test.ts`: una categoría renombrada o
  (des)activada localmente (`sincronizado: false`) se sube con `desactivado_en` correcto; una fila
  remota con `desactivado_en` se baja igual que cualquier otro campo.
- [X] T021 [US4] Create `src/features/ajustes/components/CategoriasSection.tsx`: lista
  `catalogoCategorias` completo (incluidas las desactivadas, marcadas como tal), botón "+ Nueva
  categoría" (validación de T017), acción "Renombrar" por fila creada (ícono `Pencil`), toggle
  desactivar/reactivar (`Trash`/`Undo`) — sin estas acciones sobre precargadas/"Sin categoría".
- [X] T022 [US4] Edit `AjustesView.tsx`: monta `CategoriasSection` solo si `esAdministrador`.
- [X] T023 [US4] Apply la columna `categorias.desactivado_en` y la policy "categorias: solo
  administrador actualiza" (contracts/supabase-schema.md, reutiliza `es_administrador` de T014) al
  proyecto Supabase.
- [X] T024 [P] [US4] Extend `tests/integration/ajustes.test.tsx`: crear/renombrar/fusionar/
  desactivar/reactivar una categoría desde "Ajustes" y verificar el efecto en el selector de
  materiales (`SearchPicker`/`AltaMaterialView`, spec 008) y en los insumos afectados; como
  `personal`, "Categorías" no aparece.

**Checkpoint**: User Stories 1-4 completas.

---

## Phase 7: User Story 5 - Configurar el nombre de la clínica (Priority: P2)

**Goal**: Nombre de clínica configurable que reemplaza la etiqueta fija "Gabinete" del encabezado.

**Independent Test**: Guardar un nombre de clínica y verlo reemplazar "Gabinete" en el encabezado
de todas las pantallas (spec.md Independent Test, User Story 5).

- [X] T025 [US5] Create `src/stores/clinicaStore.ts` (research.md R4): mismo patrón `liveQuery` que
  `alertasStore`, expone `nombreClinica: string | null` desde `db.configuracionClinica.get('global')`
  y `subscribe()`.
- [X] T026 [US5] Create `src/features/ajustes/lib/clinica.ts`: `guardarNombreClinica(nombre)` —
  exige administrador (`exigirAdministrador`, exportada en T017), trim, rechaza vacío/solo-espacios
  devolviendo `{ error: string }` sin escribir; si es válido, `db.configuracionClinica.put({
  id: 'global', nombre })`.
- [X] T027 [P] [US5] Unit tests en `tests/unit/ajustes/clinica.test.ts`: nombre válido guarda;
  vacío/solo-espacios rechaza sin escribir; solo administrador.
- [X] T028 [US5] Extend `src/lib/sync/index.ts`: `ConfiguracionClinicaRow`,
  `toConfiguracionClinicaRow`/`fromConfiguracionClinicaRow`, `pushConfiguracionClinica`/
  `pullConfiguracionClinica` (mismo cuerpo que `pushConfiguracionAlertas`/
  `pullConfiguracionAlertas`), agregadas a `runSyncBatch` junto a ese mismo bloque.
- [X] T029 [P] [US5] Unit tests en `tests/unit/sync-configuracion-clinica.test.ts`: push/pull igual
  que `configuracion_alertas`; sin backend no lanza.
- [X] T030 [US5] Edit `App.tsx`: suscribe `useClinicaStore` (mismo patrón que `subscribeAlertas`).
- [X] T031 [US5] Create `src/features/ajustes/components/ClinicaSection.tsx`: `IconField` + input
  de texto, guarda `onBlur` (mismo patrón UX que niveles de aviso en T006), muestra el error de
  `guardarNombreClinica` si lo hay.
- [X] T032 [US5] Edit `AjustesView.tsx`: monta `ClinicaSection` solo si `esAdministrador`.
- [X] T033 [US5] Edit `src/app/AppHeader.tsx`: reemplaza la etiqueta fija `"Gabinete"` por
  `nombreClinica ?? 'Gabinete'` (`useClinicaStore`).
- [X] T034 [US5] Apply la tabla `configuracion_clinica` + RLS (contracts/supabase-schema.md,
  reutiliza `es_administrador` de T014) al proyecto Supabase.
- [X] T035 [P] [US5] Extend `tests/integration/ajustes.test.tsx`: guardar un nombre de clínica y
  verlo en `AppHeader`; guardar vacío y confirmar que no cambia; como `personal`, "Clínica" no
  aparece.

**Checkpoint**: User Stories 1-5 completas.

---

## Phase 8: User Story 6 - Ver y restaurar insumos dados de baja (Priority: P2)

**Goal**: Listar insumos con baja lógica activa y poder restaurarlos.

**Independent Test**: Dar de baja un insumo, verlo listado en "Insumos dados de baja", restaurarlo
y confirmar que reaparece con su historial intacto (spec.md Independent Test, User Story 6).

- [X] T036 [US6] Edit `src/features/insumos/lib/proyeccion.ts` per research.md R2: en
  `proyectarInsumo`, reemplaza "la primera `campo: 'baja'` vigente manda" por "la última (mayor
  `(creadoEn, id)`) manda": si su `valorNuevo === true` → dado de baja con el `creadoEn`/
  `usuarioId` de esa entrada; si `null` → activo. Mismo ajuste (último en vez de primero) en
  `filaParaSubir` para los `baja` sincronizados.
- [X] T037 [P] [US6] Extend `tests/unit/insumos/proyeccion.test.ts`: baja seguida de restaurar
  proyecta activo; restaurar seguido de una nueva baja proyecta dado de baja con los datos de la
  más reciente; dos bajas concurrentes sin restaurar siguen proyectando dado de baja (regresión);
  `filaParaSubir` refleja el último `baja` sincronizado.
- [X] T038 [US6] Extend `src/features/insumos/lib/catalogo.ts`: agrega `restaurarInsumo(insumoId)`
  (espejo de `darDeBajaInsumo`: `CambioInsumo { campo: 'baja', valorAnterior: true, valorNuevo:
  null }` + `reproyectarEnTransaccion`, dentro de una transacción); no-op si el insumo ya está
  activo. Solo administrador.
- [X] T039 [P] [US6] Extend `tests/unit/insumos/catalogo.test.ts`: `restaurarInsumo` reactiva un
  insumo dado de baja; no-op si ya está activo; solo administrador.
- [X] T040 [US6] Extend `src/stores/inventoryStore.ts`: agrega `insumosDadosDeBaja: Insumo[]` a la
  misma suscripción `liveQuery(() => db.insumos.toArray())` que ya alimenta `insumos` (filtro
  invertido: `dadoDeBajaEn` no nulo).
- [X] T041 [US6] Create `src/features/ajustes/components/InsumosBajaSection.tsx`: lista
  `insumosDadosDeBaja` (nombre, categoría, quién y cuándo lo dio de baja), acción "Restaurar" por
  fila (`Undo`), estado vacío si no hay ninguno.
- [X] T042 [US6] Edit `AjustesView.tsx`: monta `InsumosBajaSection` solo si `esAdministrador`.
- [X] T043 [P] [US6] Extend `tests/integration/ajustes.test.tsx`: dar de baja un insumo (flujo
  spec 007), verlo en "Insumos dados de baja", restaurarlo, confirmar que reaparece en Inventario/
  Alertas/Compras con su stock y lotes intactos; como `personal`, la sección no aparece.

**Checkpoint**: User Stories 1-6 completas.

---

## Phase 9: User Story 7 - Configurar preferencias de notificaciones (Priority: P3)

**Goal**: Interruptores por tipo de alerta que controlan el indicador de la navegación inferior.

**Independent Test**: Desactivar "Stock bajo", generar esa condición, y ver que el indicador de la
navegación no lo cuenta mientras "Alertas" lo sigue mostrando (spec.md Independent Test, User
Story 7).

- [X] T044 [US7] Extend `src/stores/alertasStore.ts` (research.md R4): agrega
  `preferenciaStockBajo`/`preferenciaCaducidad` (`boolean`, default `true`) con su propia
  suscripción `liveQuery(() => db.preferenciasNotificaciones.get('local'))`.
- [X] T045 [P] [US7] Create `src/components/ui/Switch.tsx` per contracts/ui-contracts.md y
  research.md R5: `<button role="switch" aria-checked>` de ≥48×48px de área táctil.
- [X] T046 [US7] Create `src/features/alertas/lib/preferencias.ts`:
  `actualizarPreferenciaNotificacion(tipo, valor)` — `db.preferenciasNotificaciones.put({
  id: 'local', stockBajo, caducidad })` mergeando el valor actual del store. Abierto a cualquier
  usuario autenticado (sin gate de rol).
- [X] T047 [P] [US7] Unit tests en `tests/unit/alertas/preferencias.test.ts`: alternar cada
  preferencia persiste sin afectar la otra; valor por defecto `true`/`true` sin fila previa.
- [X] T048 [US7] Create `src/features/alertas/lib/resumen.ts`: `contarAlertasPendientes(insumos,
  lotes, movimientos, nivelesAvisoDias, preferencias)`, uniendo `computeInsumosStockBajo`/
  `computeAlertasCaducidad` (spec 004, sin cambios) según qué preferencias estén activas, sin
  duplicar un insumo presente en ambos conjuntos.
- [X] T049 [P] [US7] Unit tests en `tests/unit/alertas/resumen.test.ts`: conteo combinado con ambas
  preferencias activas; excluye stock bajo cuando esa preferencia está apagada; 0 con ambas
  apagadas; un insumo en ambos conjuntos cuenta una sola vez.
- [X] T050 [US7] Create `src/features/ajustes/components/NotificacionesSection.tsx`: dos `Switch`
  (Stock bajo, Caducidad) ligados a `useAlertasStore`/`actualizarPreferenciaNotificacion`.
- [X] T051 [US7] Edit `AjustesView.tsx`: monta `NotificacionesSection` siempre (todo usuario).
- [X] T052 [US7] Extend `src/app/BottomNav.tsx`: agrega `alertasBadge?: number`, burbuja pequeña
  sobre el ícono `Bell` cuando es `> 0`.
- [X] T053 [US7] Edit `App.tsx`: calcula `contarAlertasPendientes` con los datos de
  `inventoryStore`/`alertasStore` y lo pasa a `BottomNav`.
- [X] T054 [P] [US7] Extend `tests/integration/bottom-nav.test.tsx`: el badge refleja el conteo
  según preferencias; desactivar ambas oculta el badge sin afectar "Alertas".
- [X] T055 [P] [US7] Extend `tests/integration/ajustes.test.tsx`: dentro de "Ajustes" ▸
  "Notificaciones", alternar cada `Switch` (Stock bajo, Caducidad) persiste de inmediato y su
  estado se refleja al reabrir la sección — cobertura de la UI de `NotificacionesSection` en sí,
  distinta de su efecto en el badge (ya cubierto por T054).

**Checkpoint**: Todas las user stories completas e independientemente verificables.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Limpieza final y validación de punta a punta.

- [X] T056 [P] Grep `src/`/`tests/` en busca de referencias residuales a `MasView`/`features/mas` y
  elimínalas; actualiza comentarios de documentación que mencionen el "puente temporal" ya resuelto.
- [X] T057 Run `npm run lint && npm run build && npm test` and fix any failure.
- [ ] T058 Run `specs/010-ajustes-configuracion-global/quickstart.md` Escenarios 1, 2, 6-14 contra
  `npm run dev` (skill `run-indentory`), a 360px de ancho, incluido offline vía DevTools (los
  Escenarios 3-5, dependientes de RLS real, ya quedaron cubiertos por T015).
- [X] T059 Prepare las notas de PR: declara los dos cambios de comportamiento conocidos del
  Post-Phase 1 re-check de plan.md (el ledger de baja/restaurar ahora resuelve por "el más
  reciente gana" en vez de "el primero gana"; la protección de RLS en `insumos`/`lotes` vive en
  triggers en vez de policies restrictivas). Confirma los ítems del Flujo de Trabajo de la
  Constitución: sin activación automática de cámara, controles ≥48×48px, escritura Dexie-first.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede iniciar de inmediato.
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las user stories.
- **User Stories (Phase 3-9)**: todas dependen de Foundational.
  - US1, US2, US3 (P1) pueden avanzar en paralelo entre sí una vez completada Foundational.
  - US4, US5, US6 (P2) pueden avanzar en paralelo entre sí y con las P1, salvo T026 (US5), que
    depende del export de `exigirAdministrador` hecho en T017 (US4).
  - US7 (P3) no depende de ninguna otra user story.
- **Polish (Phase 10)**: depende de que todas las user stories deseadas estén completas.

### User Story Dependencies

- **US1 (P1)**: depende solo de Foundational.
- **US2 (P1)**: depende solo de Foundational; independiente de US1 (ambas editan `AjustesView.tsx`
  en pasos distintos — T008 y T012 — por lo que conviene serializarlas si las hace la misma
  persona, pero no hay dependencia funcional entre ambas).
- **US3 (P1)**: depende solo de Foundational; sin superficie de UI, no toca `AjustesView.tsx`.
- **US4 (P2)**: depende solo de Foundational. T023 reutiliza `es_administrador` creada en T014
  (US3) — aplicar T014 antes de T023.
- **US5 (P2)**: depende de Foundational y de `exigirAdministrador` exportada en T017 (US4). T034
  reutiliza `es_administrador` de T014 (US3).
- **US6 (P2)**: depende solo de Foundational.
- **US7 (P3)**: depende solo de Foundational.

### Within Each User Story

- Los módulos de dominio (lib) se crean/editan antes que el componente de UI que los consume.
- Las pruebas unitarias de un módulo se agregan en la misma tarea o inmediatamente después de
  crearlo/editarlo.
- El montaje en `AjustesView.tsx` es siempre el último paso de UI de cada story.
- Las tareas de aplicar SQL a Supabase (T014, T023, T034) y de ejecutar quickstart contra el
  backend real (T015) son manuales y quedan al final de su story.

### Parallel Opportunities

- T001 (Setup) es independiente y puede correr en paralelo con cualquier cosa que no dependa de
  los íconos nuevos.
- Una vez completada Foundational (Phase 2), US1, US2, US3, US6 y US7 pueden avanzar en paralelo
  por completo. Comparten algunos archivos — `AjustesView.tsx` (cada story agrega su propio punto
  de montaje), `tests/integration/ajustes.test.tsx` (cada story agrega su propio bloque de
  aserciones: T010/T013/T024/T035/T043/T055) y, para US5/US7, `App.tsx` — pero son ediciones
  aditivas en líneas distintas, con conflictos de merge triviales de resolver, no bloqueantes.
- Dentro de cada story, las tareas marcadas [P] (tests, o módulos en archivos distintos) pueden
  correr en paralelo entre sí.

---

## Parallel Example: User Story 4

```bash
# Tras T017 (categoriasAdmin.ts):
Task: "Unit tests en tests/unit/ajustes/categoriasAdmin.test.ts"
Task: "Extend tests/unit/sync-categorias.test.ts con desactivado_en"

# T021 (CategoriasSection.tsx) y T024 (integración) pueden esperar a T017-T020 sin bloquear otras stories.
```

---

## Implementation Strategy

### MVP First (User Stories 1-3)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — bloquea todas las stories).
3. Complete Phase 3-5: US1 (alertas relocalizadas), US2 (perfil), US3 (RLS del catálogo).
4. **STOP and VALIDATE**: correr quickstart Escenarios 1-5; confirmar que "Alertas" ya no mezcla
   configuración y que la brecha de RLS está cerrada.
5. Deploy/demo si está listo — es el cierre del objetivo central del roadmap más la deuda de
   seguridad más urgente.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 + US2 + US3 → MVP (roadmap + seguridad) → validar → deploy/demo.
3. US4 (categorías) → validar → deploy/demo.
4. US5 (clínica) → validar → deploy/demo.
5. US6 (insumos dados de baja) → validar → deploy/demo.
6. US7 (notificaciones) → validar → deploy/demo.
7. Cada story agrega valor sin romper las anteriores.

### Parallel Team Strategy

Con varias personas:

1. El equipo completa Setup + Foundational junto.
2. Con Foundational lista:
   - Persona A: US1 + US2 (ambas tocan `AjustesView.tsx`/`AlertasView.tsx`, conviene la misma
     persona para evitar conflictos de merge).
   - Persona B: US3 (sin UI, solo SQL — totalmente independiente).
   - Persona C: US4, luego US5 (US5 depende del export que hace US4 en T017). Aplica el SQL de
     T023 y T034 solo **después** de que Persona B haya aplicado T014 — ambas reutilizan
     `es_administrador()`, definida ahí — aunque el resto de US4/US5 avance en paralelo con US3.
   - Persona D: US6, luego US7 (sin dependencia real entre ambas, solo orden de conveniencia).
3. Las stories se integran de forma independiente en `AjustesView.tsx` (cada una agrega su propio
   `import`/línea de montaje, conflictos de merge triviales).

---

## Notes

- [P] tasks = archivos distintos, sin dependencias entre sí.
- [Story] label mapea cada tarea a su user story para trazabilidad.
- Cada user story debe poder completarse y probarse de forma independiente.
- Commitear después de cada tarea o grupo lógico.
- Evitar: tareas vagas, conflictos de mismo archivo sin necesidad, dependencias cruzadas entre
  stories que rompan su independencia (la única excepción documentada es T026/T034 dependiendo del
  export/función de T017/T014, ambas triviales de reordenar si hiciera falta).
