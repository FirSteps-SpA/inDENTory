# Implementation Plan: Separación de Ajustes y Configuración Global

**Branch**: `010-ajustes-configuracion-global` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-ajustes-configuracion-global/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Reemplaza el puente temporal `MasView` (spec 006) por una nueva **`AjustesView`**, montada en la
misma pestaña "Más" de la navegación inferior, con seis secciones: **Perfil** y **Notificaciones**
(todo usuario), y **Configuración de Alertas** (relocalizada desde `AlertasView`), **Clínica**,
**Categorías** e **Insumos dados de baja** (solo administrador, mismo `esAdministrador` que ya usa
`AlertasView`). Además cierra tres deudas anotadas explícitamente para esta spec en las specs
002/006/007/008/009: habilita RLS real en `insumos`/`lotes`/`movimientos` (con un trigger que
protege los campos de catálogo sin romper el resync de fila completa, research.md R1), permite
renombrar/fusionar categorías con cascada sobre los insumos que las usan (research.md R3), y agrega
ver/restaurar insumos dados de baja generalizando el ledger de `CambioInsumo campo:'baja'` para que
la última entrada gane en vez de la primera (research.md R2).

Dos entidades nuevas de fila única (`ConfiguracionClinica`, sincronizada, mismo patrón que
`ConfiguracionAlertas`; `PreferenciaNotificaciones`, local al dispositivo, nunca sincronizada,
mismo patrón que `Borrador`) y una extensión de `Categoria` (`desactivadoEn`). Ningún cambio de
esquema en `Insumo`/`Lote`/`Movimiento` — solo reglas de servidor (triggers/policies) y una
generalización de la proyección ya existente.

## Technical Context

**Language/Version**: TypeScript (React 19) on Node.js ≥20 (LTS) — scaffold sin cambios

**Primary Dependencies**: Ninguna nueva. React, Tailwind CSS v4, Zustand, Dexie, Supabase JS,
componentes existentes (`Card`, `Badge`, `TouchButton`, `IconField`, `BottomSheet`) más un
componente nuevo hecho a mano (`Switch`, research.md R5 — sin librería).

**Storage**: Dexie `version(7)`: tablas nuevas `configuracionClinica` (sincronizada) y
`preferenciasNotificaciones` (local, nunca sincronizada); `categorias` gana `desactivadoEn`
(migración `.upgrade()`, backfill `null`). Supabase: tabla nueva `configuracion_clinica`, columna
nueva `categorias.desactivado_en`, RLS habilitada en `insumos`/`lotes`/`movimientos` con triggers
de protección de catálogo/resolución de lote, `update` habilitado en `categorias` para
administrador ([contracts/supabase-schema.md](./contracts/supabase-schema.md)). `Insumo`, `Lote`,
`Movimiento`, `CambioInsumo`, `ItemCompra` sin cambios de esquema.

**Testing**: Vitest + React Testing Library + `fake-indexeddb`. Unitarias:
`proyeccion.test.ts` extendido (baja/restaurar, última gana), `catalogo.test.ts` extendido
(`restaurarInsumo`), `categoriasAdmin.test.ts` (crear/renombrar/fusionar/(des)activar + cascada
sobre insumos activos y dados de baja), `clinica.test.ts` (validación de nombre vacío),
`preferencias.test.ts`, `resumen.test.ts` (conteo del badge según preferencias),
`sync-configuracion-clinica.test.ts` (push/pull), `sync-categorias.test.ts` extendido
(`desactivado_en`, policy de `update`). Integración `ajustes.test.tsx`: US1, US2, US4-US7
completas dentro de la vista. `AlertasView` pierde su prueba de los controles de configuración
movidos; `bottom-nav.test.tsx` se ajusta (sin `MasView`/"Consumir insumo", con `AjustesView` y el
badge de alertas). US3 (RLS) se valida mayormente contra el esquema real (quickstart Escenarios
3-5), no con `fake-indexeddb`, que no aplica policies de Postgres.

**Target Platform**: PWA instalable en navegadores táctiles/móviles, uso con guantes (Principio III).

**Project Type**: Frontend PWA + esquema Supabase (sin backend propio)

**Performance Goals**: listados de "Categorías" e "Insumos dados de baja" en memoria sobre ≤300
insumos/≤50 categorías sin lag perceptible (mismo orden de magnitud que `InventarioView`/
`AlertasView`). SC-001 < 15 s, SC-004 < 20 s, SC-005 < 5 s, SC-006 < 15 s, SC-008 < 10 s (flujo
humano, sin medición de red).

**Constraints**: renombrar/fusionar una categoría y restaurar un insumo deben ser atómicos por
transacción Dexie (categoría + `CambioInsumo[]` + reproyección, o `CambioInsumo` + reproyección,
research.md R2/R3); RLS de `insumos`/`lotes` no debe bloquear el resync rutinario de ningún rol
(FR-012, research.md R1); preferencias de notificaciones nunca viajan a Supabase (FR-027);
controles ≥48×48px incluido el `Switch` nuevo (FR-030); offline-first en toda escritura de
"Clínica"/"Categorías"/"Insumos dados de baja" (FR-029); sin librerías nuevas.

**Scale/Scope**: ≤50 categorías, ≤300 insumos, 0-2 dígitos de insumos dados de baja por clínica en
un momento dado. Superficie: 1 vista nueva (`AjustesView`) con 6 secciones/componentes, 1
componente de UI nuevo (`Switch`), 5 módulos de dominio nuevos (`categoriasAdmin`, `clinica`,
`preferencias`, `resumen`) más 2 funciones nuevas en `catalogo.ts`/`proyeccion.ts` (modificadas, no
nuevos archivos), 1 store nuevo (`clinicaStore`) y 2 stores extendidos (`inventoryStore`,
`alertasStore`), y extensiones en `App.tsx`, `AppHeader.tsx`, `BottomNav.tsx`, `db/index.ts`,
`sync/index.ts`. Se elimina `MasView.tsx` y su feature `src/features/mas/`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Offline-First por Diseño | PASS | Renombrar/fusionar categoría, (des)activar, restaurar insumo y guardar el nombre de clínica escriben primero en Dexie (transacciones existentes o análogas a `editarInsumo`/`darDeBajaInsumo`) y se sincronizan en segundo plano sin bandera de reintento nueva (reutilizan `sincronizado`/`rechazadoEn` de `categorias` y el ledger de `cambiosInsumo`, ya resilientes). |
| II. Estado Reactivo Local con Zustand | PASS | Ningún store nuevo salvo `clinicaStore` (dominio propio, sin equivalente existente); todo lo demás extiende `inventoryStore`/`alertasStore` (research.md R4), sin duplicar responsabilidad. |
| III. Interfaz Táctil | PASS | `Switch` nuevo ≥48×48px de área táctil (research.md R5); listas de "Categorías"/"Insumos dados de baja" reutilizan `Card`/`TouchButton`. |
| IV. Trazabilidad y Alertas | PASS | Restaurar un insumo y renombrar/fusionar una categoría quedan en el mismo ledger `CambioInsumo` que cualquier edición de catálogo (spec 007), con autor y fecha. Ninguna regla de alerta nueva: "Configuración de Alertas" solo cambia de pantalla. |
| V. Búsqueda Manual Ágil | PASS | Esta spec no activa la cámara en ningún punto. |
| VI. Control Multi-Usuario | PASS | Cada `CambioInsumo` de restauración/renombrado registra `usuarioId`; `Categoria.creadoPor` no cambia al renombrar (se preserva quién la creó originalmente). |
| Pila Tecnológica Obligatoria | PASS | Sin dependencias nuevas; `Switch` es Tailwind + `role="switch"` nativo. |

Result: **PASS**.

**Post-Phase 1 re-check**: la generalización de `proyectarInsumo`/`filaParaSubir` (research.md R2,
"la última `campo:'baja'` gana") cambia un comportamiento ya documentado en la spec 007
("la baja prevalece... con los datos del primero") — no es una violación de ningún Principio, es
una corrección necesaria para que "restaurar" sea posible sin inventar un mecanismo paralelo;
queda declarada explícitamente aquí y en research.md para que no se lea como una regresión no
intencional al revisar el diff. El diseño de RLS con triggers (en vez de policies restrictivas)
para `insumos`/`lotes` es una decisión explícita de Fase 0 (R1), no una excepción al Principio I/VI
— sigue garantizando que solo un administrador logra que un cambio de catálogo o una baja/
restauración persistan, solo que la enforcement vive en un trigger en lugar de en una `WITH CHECK`.
Resultado: **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/010-ajustes-configuracion-global/
├── plan.md              # This file
├── research.md          # Phase 0: R1-R7
├── data-model.md        # Phase 1: ConfiguracionClinica, Categoria extendida, PreferenciaNotificaciones, Dexie v7
├── quickstart.md        # Phase 1: validación de punta a punta (14 escenarios)
├── contracts/
│   ├── ui-contracts.md      # AjustesView, Switch, módulos de dominio nuevos/modificados
│   └── supabase-schema.md   # RLS + triggers de insumos/lotes/movimientos, configuracion_clinica, categorias.update
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
inDENTory/
├── src/
│   ├── components/ui/
│   │   └── Switch.tsx                           # Nuevo (research.md R5)
│   ├── features/ajustes/
│   │   ├── components/
│   │   │   ├── AjustesView.tsx                  # Nuevo: vista principal, reemplaza MasView
│   │   │   ├── PerfilSection.tsx                # Nuevo: nombre/correo/rol + Cerrar sesión
│   │   │   ├── ConfiguracionAlertasSection.tsx  # Nuevo: JSX relocalizado desde AlertasView
│   │   │   ├── ClinicaSection.tsx               # Nuevo
│   │   │   ├── CategoriasSection.tsx            # Nuevo: listar/crear/renombrar/(des)activar
│   │   │   ├── InsumosBajaSection.tsx           # Nuevo: listar/restaurar
│   │   │   └── NotificacionesSection.tsx        # Nuevo: dos Switch
│   │   └── lib/
│   │       ├── categoriasAdmin.ts               # Nuevo: crear/renombrar/fusionar/(des)activar
│   │       └── clinica.ts                       # Nuevo: guardarNombreClinica
│   ├── features/alertas/
│   │   ├── components/AlertasView.tsx           # Modificado: quita las dos secciones de config
│   │   └── lib/
│   │       ├── preferencias.ts                  # Nuevo: actualizarPreferenciaNotificacion
│   │       └── resumen.ts                       # Nuevo: contarAlertasPendientes
│   ├── features/insumos/lib/
│   │   ├── proyeccion.ts                        # Modificado: 'baja' última gana (research.md R2)
│   │   └── catalogo.ts                          # Modificado: + restaurarInsumo
│   ├── features/mas/
│   │   └── components/MasView.tsx               # Eliminado
│   ├── app/
│   │   ├── App.tsx                              # Modificado: AjustesView, badge de alertas
│   │   ├── AppHeader.tsx                        # Modificado: nombreClinica ?? 'Gabinete'
│   │   └── BottomNav.tsx                        # Modificado: prop alertasBadge
│   ├── stores/
│   │   ├── clinicaStore.ts                      # Nuevo (research.md R4)
│   │   ├── inventoryStore.ts                    # Extendido: insumosDadosDeBaja
│   │   └── alertasStore.ts                      # Extendido: preferenciaStockBajo/Caducidad
│   └── lib/
│       ├── db/index.ts                          # Extendido: ConfiguracionClinica, PreferenciaNotificaciones, Categoria.desactivadoEn, version(7)
│       └── sync/index.ts                        # Extendido: push/pull configuracionClinica, mapeo de categorias
└── tests/
    ├── unit/insumos/proyeccion.test.ts          # Extendido
    ├── unit/insumos/catalogo.test.ts            # Extendido
    ├── unit/ajustes/categoriasAdmin.test.ts     # Nuevo
    ├── unit/ajustes/clinica.test.ts             # Nuevo
    ├── unit/alertas/preferencias.test.ts        # Nuevo
    ├── unit/alertas/resumen.test.ts             # Nuevo
    ├── unit/sync-configuracion-clinica.test.ts  # Nuevo
    ├── unit/sync-categorias.test.ts             # Extendido
    ├── integration/ajustes.test.tsx             # Nuevo
    ├── integration/alertas-reactividad.test.tsx # Ajustado: sin los controles movidos
    └── integration/bottom-nav.test.tsx          # Ajustado: AjustesView, badge de alertas
```

**Structure Decision**: dominio nuevo `src/features/ajustes/`, dueño de la vista y de la
administración de clínica/categorías/insumos de baja, siguiendo el mismo patrón por-feature que
`compras`/`alertas`/`insumos` (research.md R7) — importa utilidades existentes de `insumos/lib/` y
`alertas/lib/` en vez de duplicarlas. Las preferencias de notificaciones y el conteo del badge se
ubican en `alertas/lib/` (dominio de alertas, no de ajustes) porque son "cómo se muestran las
alertas", consumidos tanto por `AjustesView` (el `Switch`) como por `App.tsx`/`BottomNav` (el
badge). `insumosDadosDeBaja` y las preferencias de notificaciones extienden stores existentes en
vez de crear stores nuevos (research.md R4); `clinicaStore` es la única store nueva, porque
"identidad de la clínica" no es un dominio que ya viva en ningún store. `MasView`/`features/mas/`
se eliminan por completo en vez de dejarse sin usar, porque su única razón de existir (el puente
"Consumir insumo") ya es código muerto frente a las acciones rápidas de la spec 007.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — table intentionally omitted.
