---

description: "Task list template for feature implementation"
---

# Tasks: Ajustes de Interfaz Pre-Release (Rebranding, Navegación y Visibilidad)

**Input**: Design documents from `/specs/011-ajustes-pre-release/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md, quickstart.md

**Tests**: No se solicitaron tests explícitamente en la especificación. Se incluyen únicamente tareas para **actualizar tests existentes** que quedarían rotos por estos cambios de UI (no se agregan tests nuevos de TDD).

**Organization**: Las tareas están agrupadas por historia de usuario (spec.md) para permitir implementación y verificación independientes de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: A qué historia de usuario pertenece (US1, US2, US3, US4)
- Se incluyen rutas de archivo exactas en cada descripción

## Path Conventions

Proyecto único (Vite + React): código en `src/`, tests en `tests/unit/` y `tests/integration/`, configuración en la raíz (`index.html`, `vite.config.ts`).

---

## Phase 1: Setup

**Purpose**: Confirmar una línea base limpia antes de tocar código de UI compartido.

- [X] T001 Confirmar que el proyecto compila y pasa lint en su estado actual: `npm run lint && npm run build` (raíz del repo), como línea base antes de los cambios.

---

## Phase 2: Foundational

**Purpose**: Prerrequisitos bloqueantes compartidos por todas las historias.

No aplica: las 4 historias de usuario tocan archivos disjuntos entre sí (nombre de marca, `BottomNav`, `AppHeader`, y los 4 puntos de entrada de escaneo) y no comparten ningún prerrequisito de infraestructura, modelo de datos ni estado más allá de la línea base de la Fase 1. Cada historia puede implementarse de forma independiente inmediatamente después de la Fase 1.

**Checkpoint**: Fase 1 completa → las 4 historias pueden comenzar, en cualquier orden o en paralelo.

---

## Phase 3: User Story 1 - La app se presenta como DENTDELION (Priority: P1) 🎯 MVP

**Goal**: Todo punto de contacto visible al usuario muestra "DENTDELION" en vez de "inDENTory"; los identificadores internos/técnicos no cambian.

**Independent Test**: Navegar carga/login/header/pestaña del navegador y `dist/manifest.webmanifest` tras un build, confirmando "DENTDELION" en todos y "inDENTory" en ninguno; confirmar que `package.json`, el nombre de la base Dexie y los logs de consola `[inDENTory]` no cambiaron.

### Implementation for User Story 1

- [X] T002 [P] [US1] Crear `src/lib/branding.ts` exportando `export const APP_NAME = 'DENTDELION'`, como única fuente del nombre visible para los 3 puntos de contacto en tiempo de ejecución de React.
- [X] T003 [US1] En `src/app/App.tsx`, reemplazar el texto literal `"inDENTory"` del `<h1>` del estado de carga (línea 73) por `{APP_NAME}` importado de `src/lib/branding.ts`.
- [X] T004 [P] [US1] En `src/app/AppHeader.tsx`, reemplazar el texto literal `"inDENTory"` del logo (línea 44) por `{APP_NAME}` importado de `src/lib/branding.ts`.
- [X] T005 [P] [US1] En `src/features/auth/LoginForm.tsx`, reemplazar el texto literal `"inDENTory"` del encabezado (línea 26) por `{APP_NAME}` importado de `src/lib/branding.ts`.
- [X] T006 [P] [US1] En `index.html`, cambiar `<title>inDENTory</title>` (línea 7) por `<title>DENTDELION</title>`.
- [X] T007 [P] [US1] En `vite.config.ts`, cambiar `manifest.name` y `manifest.short_name` (líneas 15-16) de `'inDENTory'` a `'DENTDELION'`.
- [X] T008 [US1] Actualizar `tests/unit/App.test.tsx` línea 8: cambiar `screen.getByText('inDENTory')` por `screen.getByText('DENTDELION')` (depende de T003).

**Checkpoint**: User Story 1 completamente funcional y verificable de forma independiente (`npm run build && npm run preview` para confirmar el manifiesto generado).

---

## Phase 4: User Story 2 - Navegación fija en el borde inferior (Priority: P1)

**Goal**: `BottomNav` permanece anclado (fijo) al borde inferior real de la pantalla en todo momento, respetando el área segura del dispositivo, sin ocultar contenido de las vistas.

**Independent Test**: Abrir una pantalla con contenido largo, hacer scroll, y confirmar que la navegación permanece visible y fija en el borde inferior sin taparse ni requerir scroll adicional para alcanzarla; verificar el `touch-target` ≥48×48px de cada botón.

### Implementation for User Story 2

- [X] T009 [US2] En `index.html`, añadir `viewport-fit=cover` al contenido del meta viewport (línea 6: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`), prerrequisito para que `env(safe-area-inset-bottom)` tenga efecto en iOS (research.md #1). **Nota**: mismo archivo que T006 (US1) — no ejecutar en paralelo con esa tarea, secuenciar ambas ediciones de `index.html`.
- [X] T010 [US2] En `src/app/BottomNav.tsx`, cambiar el contenedor raíz de un bloque en flujo normal a uno con posicionamiento fijo al borde inferior (`fixed inset-x-0 bottom-0`, con `z-index` por encima del contenido) y agregar padding inferior igual a `env(safe-area-inset-bottom)`, preservando la clase `touch-target` (≥48×48px) en cada botón de pestaña.
- [X] T011 [US2] En `src/app/App.tsx`, reservar espacio inferior en el contenedor de contenido scrollable (padding/margin igual a la altura renderizada de `BottomNav`, incluyendo su safe-area) para que ninguna vista (`InventarioView`, `ComprasView`, `AlertasView`, `AjustesView`) quede oculta detrás de la barra fija (depende de T010). **Nota**: mismo archivo que T003 (US1) — secuenciar ambas ediciones de `App.tsx`, no en paralelo entre sí.
- [X] T012 [US2] Verificar manualmente los pasos de US2 en `quickstart.md` (scroll con lista larga, cambio entre las 4 secciones, emulación de dispositivo con home indicator, medición de área táctil ≥48×48px en DevTools).

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente y conjunta.

---

## Phase 5: User Story 3 - Ocultar información de sesión y cierre de sesión duplicados (Priority: P2)

**Goal**: El encabezado (`AppHeader`) deja de mostrar "Sesión iniciada como…" y "Cerrar sesión"; esa información y acción siguen disponibles y funcionales únicamente en Ajustes → Perfil.

**Independent Test**: Con sesión iniciada, confirmar que el encabezado superior no muestra texto de sesión ni botón de logout en ninguna pantalla, y que Ajustes → Perfil sigue mostrando esos datos y cerrando sesión correctamente.

### Implementation for User Story 3

- [X] T013 [US3] En `src/app/AppHeader.tsx`, eliminar el bloque condicional `{usuario && onSignOut && (...)}` (líneas 66-79) que renderiza "Sesión iniciada como…" y el botón "Cerrar sesión"; eliminar la prop `onSignOut` de `AppHeaderProps` y el import de `TouchButton` si queda sin uso en el archivo.
- [X] T014 [US3] En `src/app/App.tsx`, dejar de pasar `onSignOut={() => void signOut()}` a `<AppHeader />` (línea 80); si `useLogout()`/`signOut` queda sin otro uso en el archivo, eliminar esa importación y llamada también (línea 21). **Nota**: mismo archivo que T003/T011 — secuenciar, no ejecutar en paralelo con esas tareas.
- [X] T015 [US3] Actualizar `tests/unit/auth/offline-continuity.test.tsx` línea 44: reemplazar la aserción sobre `/Sesión iniciada como Ana Pérez/` (que ya no aparece en el header) por una que confirme que se montó el shell autenticado, por ejemplo `await screen.findByRole('button', { name: /Inventario/ })`.
- [X] T016 [US3] Verificar manualmente los pasos de US3 en `quickstart.md` (ausencia en el header, presencia y funcionamiento sin cambios en Ajustes → Perfil, sin tocar `PerfilSection.tsx`).

**Checkpoint**: User Stories 1, 2 y 3 funcionan de forma independiente y conjunta.

---

## Phase 6: User Story 4 - Ocultar temporalmente la opción de escaneo de insumos (Priority: P3)

**Goal**: Ningún formulario/vista de insumos muestra un control de escaneo; la búsqueda/captura manual sigue funcionando sin fricción adicional; el código de escaneo subyacente se conserva para reactivarlo después.

**Independent Test**: Abrir alta, edición, consumo y filtro de inventario, confirmar ausencia de cualquier botón de "Escanear"/"Escanear código", y completar cada tarea exclusivamente por vía manual.

### Implementation for User Story 4

- [X] T017 [P] [US4] En `src/features/insumos/components/InsumoFiltros.tsx`, dejar de renderizar `<ScanButton onSelect={onSelectDesdeEscaneo} />` (línea 69).
- [X] T018 [P] [US4] En `src/features/insumos/components/AltaMaterialView.tsx`, dejar de renderizar `<ScanButton onCodigo={...} />` (líneas 505-510).
- [X] T019 [P] [US4] En `src/features/insumos/components/ConsumoForm.tsx`, dejar de renderizar `<ScanButton onSelect={seleccionarInsumo} />` (línea 150).
- [X] T020 [P] [US4] En `src/features/insumos/components/EditarInsumoForm.tsx`, dejar de renderizar `<EscanearCodigo onCodigo={setCodigoFabricante} />` (línea 305); conservar la función `EscanearCodigo` y el hook `useBarcodeScanner` sin cambios de implementación (FR-010, reversibilidad).
- [X] T021 [US4] Actualizar `tests/integration/alta-material.test.tsx`: quitar o reescribir el test `'the scan button does not touch the camera until clicked; a match fills the field and warns'` (líneas 658-675), ya que el botón "Escanear" deja de renderizarse en el alta; opcionalmente añadir una aserción que confirme `screen.queryByRole('button', { name: 'Escanear' })` ausente en el formulario de alta (depende de T018).

**Checkpoint**: Las 4 historias de usuario funcionan de forma independiente y en conjunto — feature completa.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final cruzada tras completar las historias que se vayan a incluir en el release.

- [X] T022 [P] Ejecutar `npm run lint && npm run build` (raíz del repo) para confirmar que compila sin errores y que `dist/manifest.webmanifest` refleja "DENTDELION".
- [X] T023 [P] Ejecutar `npm run test` (Vitest) y confirmar que todos los tests, incluyendo los actualizados en T008/T015/T021, pasan.
- [X] T024 Ejecutar el recorrido manual completo de `quickstart.md` (US1–US4) en una emulación de dispositivo móvil, cubriendo el flujo de principio a fin.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias, se ejecuta primero.
- **Foundational (Phase 2)**: N/A — no bloquea nada adicional.
- **User Stories (Phase 3-6)**: cada una depende solo de la Fase 1; son independientes entre sí en cuanto a archivos tocados, con la excepción de las notas de "mismo archivo" señaladas abajo.
- **Polish (Phase 7)**: depende de que todas las historias que se vayan a entregar en este release estén completas.

### Colisiones de archivo entre historias (secuenciar, no paralelizar)

- `index.html`: T006 (US1, `<title>`) y T009 (US2, `viewport-fit=cover`) — mismo archivo, líneas distintas.
- `src/app/App.tsx`: T003 (US1, texto de carga), T011 (US2, padding inferior) y T014 (US3, quitar prop `onSignOut`) — mismo archivo, secciones distintas.

Estas parejas pueden hacerse en cualquier orden relativo entre sí, pero no deben editarse concurrentemente por ejecutores distintos sin coordinarse.

### User Story Dependencies

- **User Story 1 (P1)**: sin dependencias de otras historias.
- **User Story 2 (P1)**: sin dependencias de otras historias (coordinar solo el archivo compartido `index.html`/`App.tsx` con US1, ver arriba).
- **User Story 3 (P2)**: sin dependencias de otras historias (coordinar solo `App.tsx` con US1/US2).
- **User Story 4 (P3)**: completamente independiente — no comparte archivos con ninguna otra historia.

### Parallel Opportunities

- T004, T005, T006, T007 (US1) pueden ejecutarse en paralelo entre sí una vez existe T002.
- T017, T018, T019, T020 (US4) pueden ejecutarse en paralelo entre sí — 4 archivos distintos, sin dependencias.
- Una vez completada la Fase 1, las historias US1, US2, US3 y US4 pueden asignarse a personas/agentes distintos en paralelo, respetando las colisiones de archivo señaladas arriba.
- T022 y T023 (Polish) pueden ejecutarse en paralelo entre sí.

---

## Parallel Example: User Story 1

```bash
# Tras completar T002 (branding.ts), lanzar en paralelo:
Task: "Update src/app/AppHeader.tsx logo text to use APP_NAME"
Task: "Update src/features/auth/LoginForm.tsx heading to use APP_NAME"
Task: "Update index.html <title> to DENTDELION"
Task: "Update vite.config.ts manifest name/short_name to DENTDELION"
```

## Parallel Example: User Story 4

```bash
# Las 4 tareas de ocultar el escaneo son completamente independientes:
Task: "Hide ScanButton in src/features/insumos/components/InsumoFiltros.tsx"
Task: "Hide ScanButton in src/features/insumos/components/AltaMaterialView.tsx"
Task: "Hide ScanButton in src/features/insumos/components/ConsumoForm.tsx"
Task: "Hide EscanearCodigo trigger in src/features/insumos/components/EditarInsumoForm.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Fase 1 (Setup).
2. Completar Fase 3 (User Story 1 — rebranding).
3. **Detener y validar**: confirmar "DENTDELION" en todos los puntos de contacto, "inDENTory" en ninguno.
4. Desplegar/demostrar si está listo — es el cambio de mayor visibilidad para el release.

### Incremental Delivery

1. Setup → línea base lista.
2. Agregar US1 (rebranding) → validar → demo (MVP de este release).
3. Agregar US2 (nav fija) → validar → demo.
4. Agregar US3 (limpieza de header) → validar → demo.
5. Agregar US4 (ocultar escaneo) → validar → release completo.

### Parallel Team Strategy

Con varias personas/agentes disponibles tras la Fase 1:

- Persona/Agente A: User Story 1 (rebranding)
- Persona/Agente B: User Story 2 (navegación fija)
- Persona/Agente C: User Story 3 (limpieza de header)
- Persona/Agente D: User Story 4 (ocultar escaneo)

Coordinar únicamente las colisiones de archivo señaladas en "Dependencies & Execution Order" (`index.html`, `src/app/App.tsx`) antes de integrar.

---

## Notes

- [P] tasks = archivos distintos, sin dependencias pendientes.
- [Story] mapea cada tarea a su historia de usuario para trazabilidad.
- No se agregan tests nuevos de TDD (no solicitados en la especificación); solo se actualizan 3 tests existentes que quedarían rotos (T008, T015, T021).
- `ScanButton.tsx` y `useBarcodeScanner.ts` no se modifican ni se eliminan — solo se deja de invocarlos en los 4 sitios de uso (FR-010, reversibilidad).
- Confirmar tras T010/T011 que cada botón de `BottomNav` sigue cumpliendo el mínimo táctil de 48×48px de la Constitución (Principio III).
- Hacer commit después de cada tarea o grupo lógico de tareas.
