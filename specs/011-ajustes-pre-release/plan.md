# Implementation Plan: Ajustes de Interfaz Pre-Release (Rebranding, Navegación y Visibilidad)

**Branch**: `011-ajustes-pre-release` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-ajustes-pre-release/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Cuatro ajustes de interfaz, puramente de presentación, previos al release: (1) mostrar "DENTDELION" como nombre visible de la app en lugar de "inDENTory" en todos los puntos de contacto de cara al usuario, sin tocar identificadores internos/técnicos; (2) anclar la navegación inferior (`BottomNav`) de forma fija (`position: fixed`) al borde inferior real de la pantalla, en vez de su posición actual en el flujo normal del contenido, respetando el área segura del dispositivo; (3) quitar del encabezado (`AppHeader`) el texto "Sesión iniciada como…" y el botón "Cerrar sesión", que ya están duplicados en Ajustes → Perfil; (4) ocultar los 4 puntos de entrada existentes al escaneo de códigos en insumos, sin eliminar el código subyacente, para poder reactivarlo más adelante. No se introduce ni modifica ningún modelo de datos, store de Zustand, ni lógica de sincronización.

## Technical Context

**Language/Version**: TypeScript ~6.0.2, React 19.2.8 (proyecto existente, sin cambios de versión)

**Primary Dependencies**: Vite 8 + `@vitejs/plugin-react`, Tailwind CSS 4 (`@tailwindcss/vite`), `vite-plugin-pwa` (manifiesto PWA), Zustand 5 (estado, sin cambios), Dexie 4 (IndexedDB, sin cambios), `@zxing/browser`/`@zxing/library` (escáner existente, no se toca su implementación, solo sus puntos de entrada visuales)

**Storage**: IndexedDB local vía Dexie (`inDENToryDB`, sin cambios de nombre ni de esquema) + Supabase como backend remoto de sincronización (sin cambios) — N/A para esta feature, es puramente de presentación

**Testing**: Vitest + Testing Library (`jsdom`) para componentes; Playwright disponible para verificación manual/E2E de la navegación fija y la ausencia visual de controles ocultos

**Target Platform**: PWA instalable (Android Chrome, iOS Safari) y navegador de escritorio; pantallas móviles como caso de uso principal en gabinete

**Project Type**: Aplicación web de un solo proyecto (frontend Vite/React; Supabase es un backend-as-a-service externo, no hay un directorio `backend/` propio)

**Performance Goals**: Sin objetivos nuevos; el cambio a `position: fixed` en la navegación no debe introducir *layout shift* perceptible ni recalculo de scroll costoso al cambiar de pantalla

**Constraints**: Offline-first sin cambios (Constitución I); objetivos táctiles ≥48×48px deben preservarse en la navegación fija incluyendo el padding de área segura (Constitución III); la búsqueda/captura manual debe seguir siendo la única vía funcional para alta/edición/consumo/filtro de insumos tras ocultar el escaneo (Constitución V)

**Scale/Scope**: Cambios acotados a ~10 archivos existentes (`index.html`, `vite.config.ts`, `src/app/App.tsx`, `src/app/AppHeader.tsx`, `src/app/BottomNav.tsx`, `src/features/auth/LoginForm.tsx`, `src/features/insumos/components/InsumoFiltros.tsx`, `AltaMaterialView.tsx`, `ConsumoForm.tsx`, `EditarInsumoForm.tsx`); no se crean pantallas ni rutas nuevas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Aplica | Evaluación |
|---|---|---|
| I. Offline-First por Diseño | No directamente | Sin cambios a IndexedDB, sincronización ni lógica offline. **PASS** (no afectado). |
| II. Estado Reactivo Local con Zustand | No directamente | No se introducen nuevas capas de estado; el estado de `vista` sigue en `App.tsx`, los stores de Zustand no se modifican. **PASS** (no afectado). |
| III. Interfaz Táctil para Entornos Clínicos | Sí | El `BottomNav` ya usa la clase `touch-target` (≥48×48px); al fijarlo con `position: fixed` y padding de área segura, cada botón debe conservar ese mínimo. Debe verificarse tras la implementación. **PASS con verificación en Fase 1/implementación.** |
| IV. Trazabilidad y Alertas de Inventario | No | No se toca trazabilidad por lote ni cálculo de alertas. **PASS** (no afectado). |
| V. Búsqueda Manual Ágil como Flujo Primario | Sí | Se oculta el canal de escaneo (ya secundario/opcional) en sus 4 puntos de entrada, dejando la búsqueda/captura manual como única vía visible; no se activa cámara automáticamente en ningún caso (no aplica, se está ocultando el trigger, no agregando uno). **PASS.** |
| VI. Control Multi-Usuario | No directamente | No cambia la atribución de autoría ni la autenticación; solo se reubica/oculta la presentación de la sesión ya existente (sigue visible y funcional en Ajustes). **PASS** (no afectado). |

Sin violaciones. No se requiere la tabla de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/011-ajustes-pre-release/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
index.html                                        # <title> → "DENTDELION"
vite.config.ts                                     # manifest.name / short_name → "DENTDELION"

src/
├── app/
│   ├── App.tsx                                    # h1 de estado "Cargando…" → "DENTDELION"; retira sesión/logout del render del header
│   ├── AppHeader.tsx                               # texto de logo → "DENTDELION"; quita "Sesión iniciada como…" + botón "Cerrar sesión"
│   └── BottomNav.tsx                               # cambia de bloque en flujo normal a barra fija en el borde inferior (position: fixed + safe-area)
├── features/
│   ├── auth/
│   │   └── LoginForm.tsx                           # encabezado de login → "DENTDELION"
│   ├── ajustes/components/
│   │   └── PerfilSection.tsx                       # sin cambios de comportamiento (sigue siendo el único lugar con sesión/logout)
│   └── insumos/components/
│       ├── InsumoFiltros.tsx                       # oculta <ScanButton /> del filtro de inventario
│       ├── AltaMaterialView.tsx                    # oculta <ScanButton /> del alta de material
│       ├── ConsumoForm.tsx                         # oculta <ScanButton /> del consumo
│       └── EditarInsumoForm.tsx                    # oculta el trigger inline de useBarcodeScanner/Scan en edición
└── lib/scanner/useBarcodeScanner.ts                 # sin cambios (se conserva para reactivar el escaneo más adelante)
```

**Structure Decision**: Proyecto único (frontend Vite + React ya existente); no se crean carpetas ni módulos nuevos. Todos los cambios son ediciones puntuales sobre archivos y componentes ya existentes en `src/app` y `src/features`, más dos archivos de configuración/entrada (`index.html`, `vite.config.ts`). No aplica la opción de "web application" con `backend/` propio porque Supabase actúa como backend-as-a-service externo sin código propio en este repositorio.

## Post-Design Constitution Re-Check

*Re-evaluado tras completar research.md, data-model.md, contracts/ui-contracts.md y quickstart.md (Fase 0/1).*

Ninguna decisión de diseño introdujo nuevo estado, nueva dependencia, ni tocó IndexedDB/Supabase/trazabilidad. El único punto que requería verificación activa (Principio III, navegación fija) quedó resuelto en el diseño: el contrato de `BottomNav` en `contracts/ui-contracts.md` exige explícitamente conservar `touch-target` (≥48×48px) incluso con el padding de área segura aplicado, y `research.md` documenta el prerrequisito de `viewport-fit=cover` para que esa área segura funcione. **Sin violaciones. Gate PASS.** No se requiere tabla de Complexity Tracking.
